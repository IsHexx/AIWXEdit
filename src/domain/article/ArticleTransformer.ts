/**
 * Article Transformer
 * 
 * Domain service that orchestrates the markdown-to-HTML transformation.
 * Combines markdown parsing, plugin processing, and style injection.
 */

import { App, TFile, FrontMatterCache } from 'obsidian';
import type { ArticleMetadata, ParsedArticle, RenderOptions as ArticleRenderOptions } from '../../types/article.types';
import { getMarkdownEngine, MarkdownEngine } from '../../infrastructure/markdown/MarkdownEngine';
import { CodeBlockPlugin, CalloutPlugin, HeadingPlugin, LinkPlugin } from '../../infrastructure/markdown/plugins';
import { normalizeWechatHtml, postProcessInlinedWechatHtml } from '../../infrastructure/html/normalizeWechatHtml';
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
        const normalizedMarkdown = this.normalizeObsidianImageEmbeds(markdownContent, file);

        // Transform to HTML
        let { htmlContent, styledHtmlContent } = this.transform(normalizedMarkdown);
        htmlContent = this.processImageSources(htmlContent, file);
        styledHtmlContent = this.processImageSources(styledHtmlContent, file);

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
        // Use <section> to improve WeChat compatibility (paste + draft API).
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

        const dynamicCSSLines = [
            `.wx-article { font-family: ${fontFamily} !important; font-size: ${fontSize} !important; }`,
            `.wx-article a { color: ${primaryColor} !important; }`,
            `.wx-article blockquote { border-left-color: ${primaryColor} !important; }`,
            `.wx-article hr { border: none !important; height: 1px !important; background-color: ${primaryColor} !important; }`,
            `.wx-article strong { color: ${primaryColor} !important; }`,
            `.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4, .wx-article h5, .wx-article h6 { color: ${primaryColor} !important; }`
        ];

        const dynamicCSS = dynamicCSSLines.join('\n');

        // Order matters: base -> theme -> highlight -> custom
        const cssBundle = [BASE_WECHAT_CSS, themeCSS, dynamicCSS, highlightCSS, customCSS].filter(Boolean).join('\n\n');
        const inlinedHtmlContent = postProcessInlinedWechatHtml(inlineCssWithPostcss(normalized, cssBundle));

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

    private normalizeObsidianImageEmbeds(markdown: string, sourceFile: TFile | null): string {
        if (!markdown || !this.app) return markdown;

        const resolvePath = (rawPath: string): string => {
            const cleaned = rawPath.trim();
            if (!cleaned) return cleaned;

            if (cleaned.startsWith('/')) {
                return cleaned.slice(1);
            }

            const target = this.app?.metadataCache.getFirstLinkpathDest(cleaned, sourceFile?.path || '');
            if (target) {
                return target.path;
            }

            return cleaned;
        };

        const escapeAttr = (value: string): string => {
            return value
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

        return markdown.replace(/!\[\[([^\]]+)\]\]/g, (_match, raw) => {
            const parts = String(raw).split('|').map(part => part.trim()).filter(Boolean);
            if (parts.length === 0) return _match;

            const pathPart = parts[0];
            let width: string | undefined;
            let height: string | undefined;

            for (const part of parts.slice(1)) {
                const sizeMatch = part.toLowerCase().match(/^(\d+)(x(\d+))?$/);
                if (sizeMatch) {
                    width = sizeMatch[1];
                    if (sizeMatch[3]) height = sizeMatch[3];
                    break;
                }
            }

            const resolved = resolvePath(pathPart);
            const attrs: string[] = [`src="${escapeAttr(resolved)}"`, `alt="${escapeAttr(pathPart)}"`];
            if (width) attrs.push(`width="${width}"`);
            if (height) attrs.push(`height="${height}"`);

            return `<img ${attrs.join(' ')} />`;
        });
    }

    private processImageSources(html: string, sourceFile: TFile | null): string {
        if (!html || !this.app || typeof document === 'undefined') return html;

        const doc = document.implementation.createHTMLDocument('wdwxedit-image-src');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);

        const images = Array.from(container.querySelectorAll('img'));
        for (const img of images) {
            const src = img.getAttribute('src') || '';
            if (!src) continue;
            if (
                src.startsWith('http://') ||
                src.startsWith('https://') ||
                src.startsWith('data:') ||
                src.startsWith('blob:') ||
                src.startsWith('mmbiz')
            ) {
                continue;
            }

            const resolved = this.resolveImagePath(src, sourceFile);
            if (!resolved) continue;
            const imageFile = this.app.vault.getAbstractFileByPath(resolved);
            if (!imageFile || !(imageFile instanceof TFile)) {
                continue;
            }

            const vaultPath = imageFile.path;
            img.setAttribute('data-vault-path', vaultPath);

            const resourcePath = this.app.vault.getResourcePath(imageFile);
            if (resourcePath) {
                img.setAttribute('src', resourcePath);
            }
        }

        return container.innerHTML;
    }

    private resolveImagePath(src: string, sourceFile: TFile | null): string | null {
        if (!this.app) return null;

        const tryResolve = (candidate: string): string | null => {
            const cleaned = candidate.trim();
            if (!cleaned) return null;
            const direct = cleaned.startsWith('/') ? cleaned.slice(1) : cleaned;
            const byPath = this.app?.vault.getAbstractFileByPath(direct);
            if (byPath && byPath instanceof TFile) {
                return byPath.path;
            }
            if (sourceFile) {
                const dest = this.app?.metadataCache.getFirstLinkpathDest(cleaned, sourceFile.path);
                if (dest) return dest.path;
            }
            if (sourceFile && !cleaned.startsWith('/')) {
                const base = sourceFile.parent?.path || '';
                const rel = base ? `${base}/${cleaned}` : cleaned;
                const relFile = this.app?.vault.getAbstractFileByPath(rel);
                if (relFile && relFile instanceof TFile) {
                    return relFile.path;
                }
            }
            return null;
        };

        const resolved = tryResolve(src);
        if (resolved) return resolved;

        try {
            const decoded = decodeURIComponent(src);
            if (decoded !== src) {
                return tryResolve(decoded);
            }
        } catch {
            // ignore decode errors
        }

        return null;
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
