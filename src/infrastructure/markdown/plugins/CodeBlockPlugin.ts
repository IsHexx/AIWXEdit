/**
 * Code Block Plugin
 * 
 * Handles syntax highlighting for code blocks using highlight.js.
 * Supports line numbers, copy button, and language labels.
 */

import type { MarkedExtension } from 'marked';
import hljs from 'highlight.js';
import { BaseMarkdownPlugin, PluginPriority, type PluginMeta } from './PluginInterface';

/**
 * Code block rendering options
 */
export interface CodeBlockOptions {
    /** Show line numbers */
    lineNumbers: boolean;
    /** Show language label */
    showLanguage: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: CodeBlockOptions = {
    lineNumbers: true,
    showLanguage: true,
};

/**
 * Code Block Plugin
 * 
 * Extends marked to provide syntax highlighted code blocks.
 */
export class CodeBlockPlugin extends BaseMarkdownPlugin {
    readonly meta: PluginMeta = {
        id: 'code-block',
        name: 'Code Block',
        description: 'Syntax highlighting for code blocks',
        priority: PluginPriority.NORMAL,
    };

    private options: CodeBlockOptions;

    constructor(options: Partial<CodeBlockOptions> = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Update plugin options
     */
    setOptions(options: Partial<CodeBlockOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get the marked extension
     */
    /**
     * Get the marked extension
     */
    getExtension(): MarkedExtension {
        const self = this;
        const renderer = {
            code(this: any, token: any): string | false {
                const code = typeof token === 'string' ? token : token.text;
                const lang = typeof token === 'string' ? undefined : token.lang;
                return self.renderCodeBlock(code, lang);
            }
        };

        return {
            renderer: renderer as any
        };
    }

    /**
     * Render a code block with syntax highlighting
     */
    private replaceSpaces(text: string): string {
        let result = '';
        let ignore = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '<') {
                ignore = true;
                result += ch;
                continue;
            }
            if (ch === '>') {
                ignore = false;
                result += ch;
                continue;
            }
            if (!ignore) {
                if (ch === ' ') {
                    result += '&nbsp;';
                } else if (ch === '\t') {
                    result += '&nbsp;&nbsp;&nbsp;&nbsp;';
                } else {
                    result += ch;
                }
            } else {
                result += ch;
            }
        }
        return result;
    }

    private splitHighlightedLines(html: string): string[] {
        const tokens = html.split(/(<[^>]+>)/g).filter(token => token.length > 0);
        const openTags: Array<{ name: string; open: string }> = [];
        const lines: string[] = [];
        let current = '';

        const openTagsText = () => openTags.map(tag => tag.open).join('');
        const closeTagsText = () => openTags.slice().reverse().map(tag => `</${tag.name}>`).join('');

        for (const token of tokens) {
            if (token[0] === '<') {
                const closingMatch = token.match(/^<\/([a-zA-Z0-9-]+)>$/);
                if (closingMatch) {
                    const name = closingMatch[1].toLowerCase();
                    for (let i = openTags.length - 1; i >= 0; i--) {
                        if (openTags[i].name === name) {
                            openTags.splice(i, 1);
                            break;
                        }
                    }
                    current += token;
                    continue;
                }

                const openingMatch = token.match(/^<([a-zA-Z0-9-]+)\b[^>]*>$/);
                if (openingMatch) {
                    const name = openingMatch[1].toLowerCase();
                    const selfClosing = /\/>$/.test(token) || name === 'br';
                    current += token;
                    if (!selfClosing) {
                        openTags.push({ name, open: token });
                    }
                    continue;
                }

                current += token;
                continue;
            }

            const parts = token.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) {
                    const closed = current + closeTagsText();
                    const hasText = closed.replace(/<[^>]+>/g, '').length > 0;
                    lines.push(hasText ? closed : `${closed}&nbsp;`);
                    current = openTagsText();
                }
                current += parts[i];
            }
        }

        const closed = current + closeTagsText();
        const hasText = closed.replace(/<[^>]+>/g, '').length > 0;
        lines.push(hasText ? closed : `${closed}&nbsp;`);

        return lines;
    }

    private renderCodeBlock(code: string, language?: string): string {
        const langText = language ? language.split(' ')[0] : '';
        const validLang = hljs.getLanguage(langText) ? langText : 'plaintext';
        const normalizedCode = code.replace(/\n$/, '');

        let highlighted = '';
        try {
            if (langText && hljs.getLanguage(langText)) {
                highlighted = hljs.highlight(normalizedCode, { language: validLang }).value;
            } else {
                highlighted = hljs.highlightAuto(normalizedCode).value;
            }
        } catch {
            highlighted = this.escapeHtml(normalizedCode);
        }

        highlighted = this.replaceSpaces(highlighted);

        const lines = this.splitHighlightedLines(highlighted.length === 0 ? '' : highlighted);

        let body = '';
        let liItems = '';
        for (let idx = 0; idx < lines.length; idx++) {
            let lineHtml = lines[idx];
            if (!lineHtml || lineHtml.length === 0) {
                lineHtml = '&nbsp;';
            }
            // v4/note-to-mp compatible: one visual line = one <code> row.
            // This avoids WeChat treating it as a native `<pre><code>` block and stripping inline styles.
            body += `<code>${lineHtml}</code>`;
            liItems += `<li>${idx + 1}</li>`;
        }

        const className = langText ? `hljs language-${langText}` : 'hljs';
        // Include `hljs` on the section so highlight theme background/text can apply to the whole block.
        let out = `<section class="code-section code-snippet__fix hljs">`;
        if (this.options.lineNumbers) {
            // Inline reset avoids WeChat/global list margins affecting alignment.
            out += `<ul style="margin:0; padding:0; padding-left:0; list-style:none;">${liItems}</ul>`;
        }
        // Inline reset avoids theme/pre margins (e.g. margin: 1em 0) shifting content vs line numbers.
        out += `<pre class="${className}" style="margin:0; padding:0; overflow:auto; white-space:normal; max-width:1000% !important;">${body}</pre></section>`;
        return out;
    }

    /**
     * Get theme colors
     */
    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const htmlEscapes: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
    }
}

/**
 * Get default code block CSS
 */
export function getCodeBlockCSS(): string {
    return `
.code-block-wrapper {
    position: relative;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
    background: #f6f8fa;
    font-family: "等线", "DengXian", "Consolas", "Courier New", monospace;
}

.code-block-wrapper .code-language {
    position: absolute;
    top: 8px;
    right: 12px;
    font-size: 11px;
    color: #6e7781;
    font-weight: 500;
    letter-spacing: 0.5px;
}

.code-block-wrapper pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.6;
}

.code-block-wrapper code {
    background: transparent;
    padding: 0;
    font-family: inherit;
}

.code-table {
    border-collapse: collapse;
    width: 100%;
    border: none !important;
}

.code-table tr {
    line-height: 1.6;
    border: none !important;
}

.code-table td {
    border: none !important;
    padding: 0;
}

.code-table .line-num {
    text-align: right;
    padding-right: 16px;
    padding-left: 8px;
    color: #8c959f;
    user-select: none;
    vertical-align: top;
    white-space: nowrap;
    width: 1%;
    border: none !important;
}

.code-table .line-code {
    padding-left: 16px;
    white-space: pre;
    border: none !important;
}
    `.trim();
}
