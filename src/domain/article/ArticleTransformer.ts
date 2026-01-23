/**
 * Article Transformer
 * 
 * Domain service that orchestrates the markdown-to-HTML transformation.
 * Combines markdown parsing, plugin processing, and style injection.
 */

import type { App, TFile, FrontMatterCache } from 'obsidian';
import type { ArticleMetadata, ParsedArticle, RenderOptions as ArticleRenderOptions } from '../../types/article.types';
import { getMarkdownEngine, MarkdownEngine } from '../../infrastructure/markdown/MarkdownEngine';
import { CodeBlockPlugin, CalloutPlugin, HeadingPlugin, LinkPlugin } from '../../infrastructure/markdown/plugins';
import { normalizeWechatHtml } from '../../infrastructure/html/normalizeWechatHtml';
import { inlineCssWithPostcss } from '../../infrastructure/css/postcssInline';
import { BASE_WECHAT_CSS } from '../../infrastructure/css/baseWechatCss';
import { generateHljsFallbackCss } from '../../infrastructure/markdown/plugins/codeThemes';
import { getSettingsStore, getAssetStore } from '../../infrastructure/storage';

/**
 * Frontmatter regex to strip from content
 */
const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

/**
 * Current style state
 */
interface CurrentStyleState {
    primaryColor: string;
    fontFamily: string;
    fontSize: string;
}

/**
 * Article Transformer
 * 
 * Transforms markdown content into WeChat-compatible HTML.
 */
export class ArticleTransformer {
    private static instance: ArticleTransformer | null = null;

    private markdownEngine: MarkdownEngine;
    private linkPlugin: LinkPlugin;
    private headingPlugin: HeadingPlugin;
    private codeBlockPlugin: CodeBlockPlugin;
    private app: App | null = null;

    /** Current style state (overrides settings when set) */
    private currentStyles: CurrentStyleState | null = null;

    private constructor() {
        this.markdownEngine = getMarkdownEngine();
        this.linkPlugin = new LinkPlugin();
        this.headingPlugin = new HeadingPlugin();
        this.codeBlockPlugin = new CodeBlockPlugin();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): ArticleTransformer {
        if (!ArticleTransformer.instance) {
            ArticleTransformer.instance = new ArticleTransformer();
        }
        return ArticleTransformer.instance;
    }

    /**
     * Initialize with Obsidian app reference
     */
    initialize(app: App): void {
        this.app = app;
    }

    /**
     * Initialize markdown engine with plugins
     */
    async setup(): Promise<void> {
        await this.markdownEngine.initialize();

        // Register plugins
        this.markdownEngine.registerPlugin(this.codeBlockPlugin);
        this.markdownEngine.registerPlugin(new CalloutPlugin());
        this.markdownEngine.registerPlugin(this.headingPlugin);
        this.markdownEngine.registerPlugin(this.linkPlugin);
    }

    /**
     * Transform a markdown file to parsed article
     */
    async transformFile(file: TFile): Promise<ParsedArticle> {
        if (!this.app) {
            throw new Error('ArticleTransformer not initialized');
        }

        // Read file content
        const rawContent = await this.app.vault.read(file);

        // Extract metadata
        const metadata = this.extractMetadata(file, rawContent);

        // Strip frontmatter
        const markdownContent = rawContent.replace(FRONTMATTER_REGEX, '').trim();

        // Transform to HTML
        const { htmlContent, styledHtmlContent } = this.transform(markdownContent);

        return {
            sourceFile: file,
            metadata,
            markdownContent,
            htmlContent,
            styledHtmlContent,
        };
    }

    /**
     * Transform markdown string to HTML
     */
    transform(markdown: string, options: Partial<ArticleRenderOptions> = {}): {
        htmlContent: string;
        styledHtmlContent: string;
    } {
        const settings = getSettingsStore().getAll();
        const assetStore = getAssetStore();

        // Use current styles if set, otherwise use settings
        const primaryColor = this.currentStyles?.primaryColor ?? settings.style.primaryColor;
        const fontFamily = this.currentStyles?.fontFamily ?? settings.style.fontFamily;
        const fontSize = this.currentStyles?.fontSize ?? settings.style.fontSize;

        // Reset plugins for new document
        this.linkPlugin.reset();
        this.linkPlugin.setOptions({ style: settings.linkStyle });
        this.headingPlugin.reset();

        // Update code block plugin options
        this.codeBlockPlugin.setOptions({
            lineNumbers: settings.style.showLineNumbers,
            showLanguage: true,
        });

        // Parse markdown to HTML
        const htmlContent = this.markdownEngine.parse(markdown);

        // Add footnotes section if using footnote style
        let fullHtml = htmlContent;
        if (settings.linkStyle === 'footnote') {
            fullHtml += this.linkPlugin.renderFootnotesSection();
        }

        // Wrap into a scoped container first, then inline all CSS into the HTML.
        const wrapped = `<section class="wx-article">${fullHtml}</section>`;
        const normalized = normalizeWechatHtml(wrapped);

        const themeCSS = assetStore.getThemeCSS(settings.style.theme);
        let highlightCSS = assetStore.getHighlightCSS(settings.style.highlight);
        if (!highlightCSS || highlightCSS.trim().length === 0) {
            highlightCSS = generateHljsFallbackCss(settings.style.highlight);
        }
        const customCSS = settings.style.useCustomCSS
            ? [assetStore.getCustomCSS(), settings.style.customCSS].filter(Boolean).join('\n')
            : '';

        const dynamicCSS = `
.wx-article { font-family: ${fontFamily}; font-size: ${fontSize}; }
.wx-article a { color: ${primaryColor}; }
.wx-article blockquote { border-left-color: ${primaryColor}; }
        `.trim();

        // Order matters: base -> theme -> highlight -> custom
        const cssBundle = [BASE_WECHAT_CSS, themeCSS, dynamicCSS, highlightCSS, customCSS].filter(Boolean).join('\n\n');
        const inlinedHtmlContent = inlineCssWithPostcss(normalized, cssBundle);

        return {
            htmlContent: fullHtml,
            styledHtmlContent: inlinedHtmlContent,
        };
    }

    /**
     * Extract metadata from file and frontmatter
     */
    private extractMetadata(file: TFile, content: string): ArticleMetadata {
        const metadata: ArticleMetadata = {
            title: file.basename,
            createdAt: new Date(file.stat.ctime),
            modifiedAt: new Date(file.stat.mtime),
        };

        // Try to get frontmatter from Obsidian's cache
        if (this.app) {
            const fileCache = this.app.metadataCache.getFileCache(file);
            const frontmatter = fileCache?.frontmatter;

            if (frontmatter) {
                if (frontmatter.title) metadata.title = String(frontmatter.title);
                if (frontmatter.author) metadata.author = String(frontmatter.author);
                if (frontmatter.digest) metadata.digest = String(frontmatter.digest);
                if (frontmatter.cover) metadata.cover = String(frontmatter.cover);
                if (frontmatter.tags) {
                    metadata.tags = Array.isArray(frontmatter.tags)
                        ? frontmatter.tags.map(String)
                        : [String(frontmatter.tags)];
                }
            }
        }

        return metadata;
    }

    /**
     * Update style renderer settings
     */
    updateStyles(options: {
        primaryColor?: string;
        fontFamily?: string;
        fontSize?: string;
    }): void {
        // Initialize currentStyles if needed
        if (!this.currentStyles) {
            const settings = getSettingsStore().getAll();
            this.currentStyles = {
                primaryColor: settings.style.primaryColor,
                fontFamily: settings.style.fontFamily,
                fontSize: settings.style.fontSize,
            };
        }

        if (options.primaryColor) {
            this.currentStyles.primaryColor = options.primaryColor;
        }
        if (options.fontFamily) {
            this.currentStyles.fontFamily = options.fontFamily;
        }
        if (options.fontSize) {
            this.currentStyles.fontSize = options.fontSize;
        }
    }

    /**
     * Get the link plugin for footnote access
     */
    getLinkPlugin(): LinkPlugin {
        return this.linkPlugin;
    }
}

/**
 * Get the article transformer instance
 */
export function getArticleTransformer(): ArticleTransformer {
    return ArticleTransformer.getInstance();
}
