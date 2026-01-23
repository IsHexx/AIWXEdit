/**
 * Link Plugin
 * 
 * Handles link rendering with different styles:
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
    style: 'footnote',
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
        description: 'Custom link rendering with footnotes',
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
        const self = this;

        // Use type assertion due to marked.js version type inconsistencies
        const renderer = {
            link(this: any, token: any): string | false {
                const href = typeof token === 'string' ? token : token.href;
                const title = typeof token === 'string' ? null : (token.title ?? null);
                const text = typeof token === 'string' ? '' : token.text;
                return self.renderLink(href, title, text);
            }
        };

        return { renderer } as MarkedExtension;
    }

    /**
     * Render a link according to style
     */
    private renderLink(href: string, title: string | null, text: string): string {
        // Skip if it's an image link or internal anchor
        if (href.startsWith('#') || href.startsWith('data:')) {
            return `<a href="${href}">${text}</a>`;
        }

        switch (this.options.style) {
            case 'footnote':
                return this.renderFootnoteLink(href, title, text);
            case 'inline':
                return this.renderInlineLink(href, title, text);
            case 'hidden':
                return this.renderHiddenLink(text);
            default:
                return this.renderFootnoteLink(href, title, text);
        }
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
        const titleAttr = title ? ` title="${title}"` : '';
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
            return `<li style="font-size: 0.9em; color: #57606a; margin: 4px 0;"><span style="color: #1a73e8;">[${num}]</span> ${fn.text}: <span style="word-break: break-all;">${fn.href}</span></li>`;
        }).join('\n');

        return `
<section class="footnotes" style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee;">
    <p style="font-weight: 600; margin-bottom: 0.5em;">参考链接</p>
    <ol style="padding-left: 1.5em; margin: 0;">${items}</ol>
</section>`.trim();
    }
}
