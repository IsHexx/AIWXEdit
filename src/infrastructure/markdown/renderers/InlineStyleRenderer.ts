/**
 * Inline Style Renderer
 * 
 * Post-processes HTML to inject inline styles for WeChat compatibility.
 * WeChat requires all styles to be inline since external CSS is not supported.
 */

/**
 * Style mapping for HTML elements
 */
export interface StyleMap {
    [selector: string]: string;
}

/**
 * Default style map for WeChat
 */
const DEFAULT_STYLES: StyleMap = {
    // Typography
    'p': 'margin: 0.6em 0; line-height: 1.6;',
    'strong': 'font-weight: 600;',
    'em': 'font-style: italic;',
    'del': 'text-decoration: line-through; color: #57606a;',

    // Lists
    'ul': 'margin: 0.6em 0; padding-left: 2em;',
    'ol': 'margin: 0.6em 0; padding-left: 2em;',
    'li': 'margin: 0.3em 0; line-height: 1.6;',

    // Blockquote
    'blockquote': 'margin: 0.8em 0; padding: 10px 20px; border-left: 4px solid #1a73e8; background-color: #f8f9fa; color: #57606a;',

    // Code (inline)
    'code': 'font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.9em; padding: 2px 6px; background-color: #f5f5f5; border-radius: 3px;',

    // Table
    'table': 'border-collapse: collapse; width: 100%; margin: 0.6em 0;',
    'th': 'border: 1px solid #ddd; padding: 8px 12px; text-align: left; background-color: #f6f8fa; font-weight: 600;',
    'td': 'border: 1px solid #ddd; padding: 8px 12px; text-align: left;',

    // Horizontal rule
    'hr': 'border: none; border-top: 1px solid #eee; margin: 1.2em 0;',

    // Images
    'img': 'max-width: 100%; height: auto; margin: 0.6em 0; display: block;',
};

/**
 * Inline Style Renderer
 * 
 * Processes HTML and adds inline styles to elements.
 */
export class InlineStyleRenderer {
    private styles: StyleMap;
    private customStyles: string = '';
    private baseStyles: StyleMap;

    constructor(styles: StyleMap = DEFAULT_STYLES) {
        this.baseStyles = { ...styles };
        this.styles = { ...styles };
    }

    /**
     * Update style map
     */
    setStyles(styles: Partial<StyleMap>): void {
        // Filter out undefined values and merge
        for (const [key, value] of Object.entries(styles)) {
            if (value !== undefined) {
                this.styles[key] = value;
            }
        }
    }

    /**
     * Reset styles to defaults
     */
    resetStyles(): void {
        this.styles = { ...this.baseStyles };
    }

    /**
     * Remove specific properties from inline style map for given tags.
     */
    removeStyleProps(tags: string[], props: string[]): void {
        const propSet = new Set(props.map(p => p.toLowerCase()));
        tags.forEach(tag => {
            const style = this.styles[tag];
            if (!style) return;
            const kept: string[] = [];
            style.split(';').forEach(part => {
                const [rawKey, rawValue] = part.split(':');
                if (!rawKey || !rawValue) return;
                const key = rawKey.trim().toLowerCase();
                if (propSet.has(key)) return;
                kept.push(`${rawKey.trim()}: ${rawValue.trim()}`);
            });
            this.styles[tag] = kept.join('; ');
        });
    }

    /**
     * Set custom CSS to be applied
     */
    setCustomCSS(css: string): void {
        this.customStyles = css;
    }

    /**
     * Merge tag-level styles from CSS into inline styles.
     * Only simple tag selectors (and .wx-article/tag scoped selectors) are supported.
     */
    applyTagStylesFromCss(css: string, allowedTags: string[] = [
        'body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'a', 'blockquote', 'ul', 'ol', 'li',
        'table', 'th', 'td', 'pre', 'code', 'img', 'hr'
    ]): void {
        if (!css) return;

        const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
        const ruleRegex = /([^{}]+)\{([^}]*)\}/g;
        let match: RegExpExecArray | null;

        while ((match = ruleRegex.exec(cleaned)) !== null) {
            const selectorText = match[1].trim();
            const declarations = match[2].trim();
            if (!selectorText || !declarations) continue;

            const selectors = selectorText.split(',');
            for (const rawSelector of selectors) {
                const tag = this.extractTagSelector(rawSelector.trim());
                if (!tag || !allowedTags.includes(tag)) continue;

                if (this.styles[tag]) {
                    this.styles[tag] = `${this.styles[tag]} ${declarations}`.trim();
                } else {
                    this.styles[tag] = declarations;
                }
            }
        }
    }

    private extractTagSelector(selector: string): string | null {
        if (!selector) return null;

        let cleaned = selector
            .replace(/::?[\w-]+/g, '')
            .trim();

        cleaned = cleaned.replace(/^section\.wx-article\s+/, '');
        cleaned = cleaned.replace(/^\.wx-article\s+/, '');
        cleaned = cleaned.replace(/^\.wdwxedit\s+/, '');

        if (/^(body|html)\s+/.test(cleaned)) {
            cleaned = cleaned.replace(/^(body|html)\s+/, '');
        }

        if (/^[a-z][a-z0-9-]*$/i.test(cleaned)) {
            return cleaned.toLowerCase();
        }

        return null;
    }

    /**
     * Apply primary color to relevant elements
     */
    setPrimaryColor(color: string): void {
        // Update styles that use primary color
        this.styles['a'] = `color: ${color}; text-decoration: none;`;
        this.styles['blockquote'] = `margin: 0.8em 0; padding: 10px 20px; border-left: 4px solid ${color}; background-color: #f8f9fa; color: #57606a;`;
        this.styles['h1'] = `color: ${color};`;
        this.styles['h2'] = `color: ${color};`;
        this.styles['h3'] = `color: ${color};`;
        this.styles['h4'] = `color: ${color};`;
        this.styles['h5'] = `color: ${color};`;
        this.styles['h6'] = `color: ${color};`;
    }

    /**
     * Set font family
     */
    setFontFamily(fontFamily: string): void {
        this.styles['body'] = `font-family: ${fontFamily};`;
    }

    /**
     * Set font size
     */
    setFontSize(fontSize: string): void {
        this.styles['body'] = (this.styles['body'] || '') + ` font-size: ${fontSize};`;
    }

    /**
     * Process HTML and inject inline styles
     */
    process(html: string): string {
        let processed = html;

        // Apply styles to each element type
        for (const [tag, style] of Object.entries(this.styles)) {
            // Skip body as it's applied to wrapper
            if (tag === 'body') continue;

            // Match opening tags and add style attribute
            const regex = tag === 'code'
                ? new RegExp(`<${tag}(?![^>]*\\bwdwx-code-line\\b)(\\s|>)`, 'gi')
                : new RegExp(`<${tag}(\\s|>)`, 'gi');
            processed = processed.replace(regex, (match, suffix) => {
                if (suffix === '>') {
                    return `<${tag} style="${style}">`;
                }
                return `<${tag} style="${style}" `;
            });
        }

        // Handle elements that already have style attributes
        processed = this.mergeExistingStyles(processed);

        return processed;
    }

    /**
     * Merge styles for elements that already have style attributes
     */
    private mergeExistingStyles(html: string): string {
        // Find elements with multiple style attributes and merge them
        const multiStyleRegex = /style="([^"]*)"\s+style="([^"]*)"/gi;

        let result = html;
        let match;

        while ((match = multiStyleRegex.exec(html)) !== null) {
            const merged = `style="${match[1]} ${match[2]}"`;
            result = result.replace(match[0], merged);
        }

        return result;
    }

    /**
     * Wrap content in article container with base styles
     */
    wrapInArticle(content: string, options: { fontFamily?: string; fontSize?: string } = {}): string {
        const baseStyle = [
            `font-family: ${options.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}`,
            `font-size: ${options.fontSize || '16px'}`,
            'line-height: 1.6',
            'color: #333',
            'padding: 20px',
        ].join('; ');

        return `<section class="wx-article" style="${baseStyle}">${content}</section>`;
    }

    /**
     * Inline CSS rules into HTML content using selector matching.
     * Best-effort: ignores pseudo-classes and pseudo-elements.
     */
    inlineCss(html: string, css: string): string {
        if (!css || typeof document === 'undefined') {
            return html;
        }

        const doc = document.implementation.createHTMLDocument('wdwxedit-inline');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);

        const styleEl = doc.createElement('style');
        styleEl.textContent = css;
        doc.head.appendChild(styleEl);

        const rules = this.collectStyleRules(styleEl.sheet);
        const inlineProps = new WeakMap<Element, Set<string>>();
        const applied = new WeakMap<Element, Map<string, { spec: number; order: number }>>();

        let order = 0;
        for (const rule of rules) {
            const selectors = rule.selectorText.split(',').map(s => s.trim()).filter(Boolean);
            for (const selector of selectors) {
                if (selector.includes(':')) {
                    continue;
                }
                let elements: NodeListOf<Element>;
                try {
                    elements = container.querySelectorAll(selector);
                } catch {
                    continue;
                }

                const spec = this.calculateSpecificity(selector);
                for (const el of elements) {
                    if (this.shouldSkipInline(el)) {
                        continue;
                    }
                    const inlineSet = inlineProps.get(el) || this.parseInlineStyle(el);
                    inlineProps.set(el, inlineSet);

                    let elementMap = applied.get(el);
                    if (!elementMap) {
                        elementMap = new Map();
                        applied.set(el, elementMap);
                    }

                    for (let i = 0; i < rule.style.length; i++) {
                        const prop = rule.style[i];
                        const value = rule.style.getPropertyValue(prop);
                        if (!prop || !value) continue;
                        if (inlineSet.has(prop)) continue;

                        const existing = elementMap.get(prop);
                        if (!existing || spec > existing.spec || (spec === existing.spec && order >= existing.order)) {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.setProperty(prop, value);
                            elementMap.set(prop, { spec, order });
                        }
                    }
                }
            }
            order++;
        }

        return container.innerHTML;
    }

    /**
     * Normalize HTML for consistent rendering (list cleanup, spacing).
     */
    normalizeHtml(html: string): string {
        if (typeof document === 'undefined') {
            return html;
        }

        const doc = document.implementation.createHTMLDocument('wdwxedit-normalize');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);

        // Reduce list spacing by removing paragraph margins inside list items
        const listParagraphs = container.querySelectorAll('li p');
        listParagraphs.forEach(p => {
            const el = p as HTMLElement;
            el.style.setProperty('margin', '0');
        });

        const listItems = container.querySelectorAll('li');
        listItems.forEach(li => {
            const el = li as HTMLElement;
            const text = (el.textContent || '').replace(/\u200B/g, '').trim();
            const hasMedia = !!el.querySelector('img,svg,video,code,pre,a');
            const onlyBreak = !!el.querySelector('br') && text.length === 0;
            if (!text && !hasMedia) {
                el.remove();
                return;
            }
            if (onlyBreak) {
                el.remove();
                return;
            }
            if (!el.style.margin || el.style.margin.trim() === '') {
                el.style.setProperty('margin', '0.35em 0');
            }
        });

        return container.innerHTML;
    }

    private shouldSkipInline(el: Element): boolean {
        return !!el.closest('.code-block-wrapper, .code-section');
    }

    private collectStyleRules(sheet: CSSStyleSheet | null): CSSStyleRule[] {
        if (!sheet) return [];
        const rules: CSSStyleRule[] = [];
        for (const rule of Array.from(sheet.cssRules)) {
            if (rule.type === CSSRule.STYLE_RULE) {
                rules.push(rule as CSSStyleRule);
            } else if (rule.type === CSSRule.MEDIA_RULE) {
                const mediaRule = rule as CSSMediaRule;
                for (const inner of Array.from(mediaRule.cssRules)) {
                    if (inner.type === CSSRule.STYLE_RULE) {
                        rules.push(inner as CSSStyleRule);
                    }
                }
            }
        }
        return rules;
    }

    private parseInlineStyle(el: Element): Set<string> {
        const set = new Set<string>();
        const inline = el.getAttribute('style') || '';
        inline.split(';').forEach(part => {
            const [key] = part.split(':');
            if (key && key.trim()) {
                set.add(key.trim());
            }
        });
        return set;
    }

    private calculateSpecificity(selector: string): number {
        const ids = (selector.match(/#[\w-]+/g) || []).length;
        const classes = (selector.match(/\.[\w-]+/g) || []).length;
        const attrs = (selector.match(/\[[^\]]+\]/g) || []).length;
        const elements = (selector
            .replace(/#[\w-]+/g, '')
            .replace(/\.[\w-]+/g, '')
            .replace(/\[[^\]]+\]/g, '')
            .match(/\b[a-zA-Z][\w-]*\b/g) || []).length;

        return ids * 10000 + (classes + attrs) * 100 + elements;
    }

    /**
     * Get current style map
     */
    getStyles(): StyleMap {
        return { ...this.styles };
    }
}

/**
 * Create a pre-configured inline style renderer
 */
export function createInlineStyleRenderer(options: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
} = {}): InlineStyleRenderer {
    const renderer = new InlineStyleRenderer();

    if (options.primaryColor) {
        renderer.setPrimaryColor(options.primaryColor);
    }
    if (options.fontFamily) {
        renderer.setFontFamily(options.fontFamily);
    }
    if (options.fontSize) {
        renderer.setFontSize(options.fontSize);
    }

    return renderer;
}
