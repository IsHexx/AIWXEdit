import type { MarkedExtension } from 'marked';
import hljs from 'highlight.js';
import { BaseMarkdownPlugin, PluginPriority, type PluginMeta } from './PluginInterface';

export interface CodeBlockOptions {
    lineNumbers: boolean;
    showLanguage: boolean;
}

const DEFAULT_OPTIONS: CodeBlockOptions = {
    lineNumbers: true,
    showLanguage: true,
};

/**
 * Helper class to construct HTML strings with a fluent API.
 * Replaces direct string concatenation for structure building.
 */
class HtmlBuilder {
    private parts: string[] = [];

    tag(name: string, attrs: Record<string, string> = {}, content?: string): this {
        const attrStr = Object.entries(attrs)
            .map(([key, val]) => `${key}="${val}"`)
            .join(' ');

        const open = attrStr ? `<${name} ${attrStr}>` : `<${name}>`;
        this.parts.push(open);
        if (content !== undefined) {
            this.parts.push(content);
        }
        if (content !== undefined || !['img', 'br', 'hr', 'input'].includes(name)) {
            this.parts.push(`</${name}>`);
        }
        return this;
    }

    append(html: string): this {
        this.parts.push(html);
        return this;
    }

    toString(): string {
        return this.parts.join('');
    }
}

/**
 * Specialized parser to split syntax-highlighted HTML into lines
 * while preserving tag nesting structure.
 */
class LineSplitter {
    private openTags: Array<{ name: string; fullTag: string }> = [];

    split(html: string): string[] {
        const lines: string[] = [];
        // Use a clearer regex pattern for tag tokenization
        const tokens = html.split(/(<\/?\w+[^>]*>)/g).filter(t => t);

        let currentLineBuffer = '';

        for (const token of tokens) {
            if (this.isTag(token)) {
                this.handleTag(token, (chunk) => currentLineBuffer += chunk);
            } else {
                // Text content: split by newlines
                const parts = token.split('\n');
                parts.forEach((part, index) => {
                    if (index > 0) {
                        // Flush current line
                        lines.push(this.closeOpenTags(currentLineBuffer));
                        currentLineBuffer = this.reopenTags();
                    }
                    currentLineBuffer += part;
                });
            }
        }

        // Push final line
        lines.push(this.closeOpenTags(currentLineBuffer));

        return lines.map(line => this.normalizeEmptyLine(line));
    }

    private isTag(token: string): boolean {
        return token.startsWith('<');
    }

    private handleTag(token: string, append: (s: string) => void) {
        if (token.startsWith('</')) {
            // Closing tag
            const tagName = token.match(/^<\/(\w+)>/)?.[1]?.toLowerCase();
            if (tagName) {
                this.removeLastOpenTag(tagName);
            }
            append(token);
        } else {
            // Opening tag
            const tagName = token.match(/^<(\w+)/)?.[1]?.toLowerCase();
            const isSelfClosing = token.endsWith('/>') || (tagName === 'br' || tagName === 'img' || tagName === 'hr');

            if (tagName && !isSelfClosing) {
                this.openTags.push({ name: tagName, fullTag: token });
            }
            append(token);
        }
    }

    private removeLastOpenTag(tagName: string) {
        // Find last matching tag (handling potential unnested mess gracefully)
        for (let i = this.openTags.length - 1; i >= 0; i--) {
            if (this.openTags[i].name === tagName) {
                this.openTags.splice(i, 1);
                return;
            }
        }
    }

    private closeOpenTags(content: string): string {
        // Append closing tags for all currently open tags (LIFO)
        return content + this.openTags.slice().reverse().map(t => `</${t.name}>`).join('');
    }

    private reopenTags(): string {
        // Re-open tags for the next line
        return this.openTags.map(t => t.fullTag).join('');
    }

    private normalizeEmptyLine(line: string): string {
        const rawContent = line.replace(/<[^>]+>/g, '');
        return rawContent.length > 0 ? line : `${line}&nbsp;`;
    }
}

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

    setOptions(options: Partial<CodeBlockOptions>): void {
        this.options = { ...this.options, ...options };
    }

    getExtension(): MarkedExtension {
        return {
            renderer: {
                code: (token: any) => {
                    const code = typeof token === 'string' ? token : token.text;
                    const lang = typeof token === 'string' ? undefined : token.lang;
                    return this.renderCodeBlock(code, lang);
                }
            }
        };
    }

    /**
     * Replaces whitespace with non-breaking spaces for WeChat compatibility.
     * Rewritten to use different logic than v4.
     */
    private sanitizeWhitespace(text: string): string {
        // Using a replacement map approach instead of state machine loop
        return text.replace(/[ \t]/g, (match) => {
            if (match === ' ') return '&nbsp;';
            if (match === '\t') return '&nbsp;&nbsp;&nbsp;&nbsp;';
            return match;
        });
    }

    private renderCodeBlock(code: string, language?: string): string {
        const langName = (language || '').split(' ')[0];
        const validLang = (langName && hljs.getLanguage(langName)) ? langName : 'plaintext';

        let highlightedHtml = '';
        try {
            if (validLang !== 'plaintext') {
                highlightedHtml = hljs.highlight(code.trimEnd(), { language: validLang }).value;
            } else {
                highlightedHtml = hljs.highlightAuto(code.trimEnd()).value;
            }
        } catch {
            highlightedHtml = this.escapeHtml(code.trimEnd());
        }

        const splitter = new LineSplitter();
        const rawLines = splitter.split(highlightedHtml);

        // Build HTML using Builder pattern
        const lineListBuilder = new HtmlBuilder();
        const codeExecutorBuilder = new HtmlBuilder();

        rawLines.forEach((lineHtml, index) => {
            // Apply whitespace sanitization logic inline.
            // Split by tags to only touch text content
            const processedLine = lineHtml.split(/(<[^>]*>)/).map((part) => {
                if (part.startsWith('<')) return part;
                return this.sanitizeWhitespace(part);
            }).join('');

            lineListBuilder.append(`<li>${index + 1}</li>`);
            codeExecutorBuilder.append(`<code>${processedLine}</code>`);
        });

        const rootClasses = ['code-section', 'code-snippet__fix', 'hljs'];
        if (langName) rootClasses.push(`language-${langName}`);

        // Inline Styles Definition - Explicitly defined here
        const listStyle = 'margin:0; padding:0 8px 0 0; list-style:none; text-align:right; color:#999; border-right:1px solid #ddd; flex-shrink:0;';
        const preStyle = 'margin:0; padding:0 0 0 8px; overflow:auto; white-space:normal; flex-grow:1;';
        const sectionStyle = 'display: flex; gap: 8px; font-size: 13px; line-height: 1.5; padding: 10px; border-radius: 4px; overflow-x: auto;';

        // Manual assembly for final structure to guarantee WeChat compatibility
        let output = `<section class="${rootClasses.join(' ')}" style="${sectionStyle}">`;

        if (this.options.lineNumbers) {
            output += `<ul style="${listStyle}">${lineListBuilder.toString()}</ul>`;
        }

        output += `<pre class="${langName ? 'hljs language-' + langName : 'hljs'}" style="${preStyle}">${codeExecutorBuilder.toString()}</pre>`;
        output += `</section>`;

        return output;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

/**
 * Get default code block CSS (still needed for obsidian view before inline)
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
/* ... simplified for brevity as most is inlined ... */
    `.trim();
}
