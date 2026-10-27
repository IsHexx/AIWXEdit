/**
 * Link Plugin
 * 
 * Handles link rendering with different styles:
 * - original: Keep the destination on the original link text (default)
 * - footnote: Convert to numbered footnotes
 * - inline: Show URL inline
 * - hidden: Hide links, show text only
 */

import type { MarkedExtension } from 'marked';
import { BaseMarkdownPlugin, PluginPriority, type PluginMeta } from './PluginInterface';
import type { LinkStyle } from '../../../types/settings.types';

/**
 * Link rendering options
 */
export interface LinkOptions {
    /** Link display style */
    style: LinkStyle;
    /** Footnote reference format */
    footnoteFormat: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: LinkOptions = {
    style: 'original',
    footnoteFormat: '[{n}]',
};

/**
 * Link Plugin
 * 
 * Renders links according to the selected style.
 */
export class LinkPlugin extends BaseMarkdownPlugin {
    readonly meta: PluginMeta = {
        id: 'link',
        name: 'Link',
        description: 'Preserve original links with optional alternate rendering',
        priority: PluginPriority.NORMAL,
    };

    private options: LinkOptions;
    private footnotes: Array<{ text: string; href: string }> = [];
    private footnoteCounter = 0;

    constructor(options: Partial<LinkOptions> = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Update options
     */
    setOptions(options: Partial<LinkOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Reset footnotes (call before parsing new document)
     */
    reset(): void {
        this.footnotes = [];
        this.footnoteCounter = 0;
    }

    getExtension(): MarkedExtension {
        const renderer = {
            // marked 12 passes three arguments, including the rendered link label.
            link: (href: string, title: string | null | undefined, text: string): string => {
                if (!href) return text;
                return this.renderLink(href, title ?? null, text);
            },
        };

        return {
            renderer,
            extensions: [{
                name: 'namedReferenceLink',
                level: 'inline',
                start: (src) => src.indexOf('['),
                tokenizer(src) {
                    // Accept pasted reference-list entries such as [名称]：https://example.com.
                    // Inline tokenization leaves code spans and fenced blocks untouched.
                    const match = /^\[([^\]\n]+)\][：:][ \t]*(https?:\/\/[^\s<>]+)/.exec(src);
                    if (!match) return;
                    return {
                        type: 'link',
                        raw: match[0],
                        href: match[2],
                        title: null,
                        text: match[1],
                        tokens: this.lexer.inlineTokens(match[1]),
                    };
                },
            }],
        };
    }

    /**
     * Render a link according to style
     */
    private renderLink(href: string, title: string | null, text: string): string {
        // Skip if it's an image link or internal anchor
        if (href.startsWith('#') || href.startsWith('data:')) {
            return this.renderOriginalLink(href, title, text);
        }

        switch (this.options.style) {
            case 'original':
                return this.renderOriginalLink(href, title, text);
            case 'footnote':
                return this.renderFootnoteLink(href, title, text);
            case 'inline':
                return this.renderInlineLink(href, title, text);
            case 'hidden':
                return this.renderHiddenLink(text);
            default:
                return this.renderOriginalLink(href, title, text);
        }
    }

    private renderOriginalLink(href: string, title: string | null, text: string): string {
        const escapeAttribute = (value: string) => value
            .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
        return `<a href="${escapeAttribute(href)}"${titleAttribute}>${text}</a>`;
    }

    /**
     * Render link as footnote reference
     */
    private renderFootnoteLink(href: string, title: string | null, text: string): string {
        this.footnoteCounter++;
        this.footnotes.push({ text, href });

        const footnoteRef = this.options.footnoteFormat.replace('{n}', String(this.footnoteCounter));

        return `<span style="color: #1a73e8;">${text}</span><sup style="color: #1a73e8; font-size: 0.8em;">${footnoteRef}</sup>`;
    }

    /**
     * Render link with inline URL
     */
    private renderInlineLink(href: string, title: string | null, text: string): string {
        return `<span style="color: #1a73e8;">${text}</span><span style="color: #57606a; font-size: 0.9em;"> (${href})</span>`;
    }

    /**
     * Render link text only (hide URL)
     */
    private renderHiddenLink(text: string): string {
        return `<span style="color: #1a73e8;">${text}</span>`;
    }

    /**
     * Get collected footnotes
     */
    getFootnotes(): Array<{ text: string; href: string }> {
        return [...this.footnotes];
    }

    /**
     * Render footnotes section
     */
    renderFootnotesSection(): string {
        if (this.footnotes.length === 0) {
            return '';
        }

        const items = this.footnotes.map((fn, i) => {
            const num = i + 1;
            return `<li style="font-size: 0.9em; color: #57606a; margin: 3px 0;"><span style="color: #1a73e8;">[${num}]</span> ${fn.text}: <span style="word-break: break-all;">${fn.href}</span></li>`;
        }).join('\n');

        return `
<section class="footnotes" style="margin-top: 1.2em; padding-top: 0.8em; border-top: 1px solid #eee;">
    <p style="font-weight: 600; margin-bottom: 0.4em;">参考链接</p>
    <ol style="padding-left: 1.5em; margin: 0;">${items}</ol>
</section>`.trim();
    }
}
