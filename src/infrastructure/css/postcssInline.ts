import { parse, Root, Rule, Declaration } from 'postcss';

/**
 * Represents the calculated weight of a CSS selector.
 * Used to determine which styles should take precedence.
 * 
 * Replaces the ad-hoc calculation in the previous version with a structured Value Object.
 */
class SelectorWeight {
    constructor(
        public readonly ids: number,
        public readonly classesAndAttributes: number,
        public readonly elements: number
    ) { }

    /**
     * Calculates a single numeric value for comparison.
     * Uses a standard base-100 weighting system (10000, 100, 1).
     */
    public value(): number {
        return (this.ids * 10000) + (this.classesAndAttributes * 100) + this.elements;
    }

    public static from(selector: string): SelectorWeight {
        let ids = 0;
        let classesAndAttrs = 0;
        let elements = 0;

        // Simplified parser for weight calculation
        // Matches #id, .class, [attr], and element names
        // Note: usage of lookahead/lookbehind for cleaner splitting
        const parts = selector.split(/(?=[#\.\[])|(?<=[\]])/);

        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('#')) {
                ids++;
            } else if (trimmed.startsWith('.') || trimmed.startsWith('[')) {
                classesAndAttrs++;
            } else if (trimmed.length > 0 && !['>', '+', '~', '*'].includes(trimmed)) {
                // Assume anything else that isn't a combinator is an element
                elements++;
            }
        }

        return new SelectorWeight(ids, classesAndAttrs, elements);
    }
}

interface StyleDeclaration {
    property: string;
    value: string;
    priority: 'important' | 'normal';
    weight: number;
    ruleIndex: number; // For stable sort on equal specificity
}

/**
 * Service responsible for applying CSS styles directly to HTML elements.
 * Uses PostCSS for parsing and a DOM TreeWalker for efficient traversal.
 * 
 * This class-based approach replaces the recursive functional approach of the original.
 */
export class StyleInliner {
    private cssAst: Root | null = null;
    private document: Document;

    constructor() {
        if (typeof document === 'undefined') {
            throw new Error('StyleInliner requires a DOM environment');
        }
        // Create an isolated document to avoid polluting the main window
        this.document = document.implementation.createHTMLDocument('style-inliner-ctx');
    }

    /**
     * Inlines CSS string into HTML string.
     */
    public inline(html: string, css: string): string {
        if (!css) return html;

        // 1. Prepare the isolated DOM environment
        const wrapper = this.document.createElement('div');
        wrapper.innerHTML = html;
        this.document.body.appendChild(wrapper);

        // 2. Parse CSS if changed
        try {
            this.cssAst = parse(css);
        } catch (e) {
            console.error('Failed to parse CSS for inlining', e);
            return html;
        }

        // 3. Collect all styling rules
        const styleRules: { selector: string, decls: Declaration[], ruleIndex: number }[] = [];
        let ruleCounter = 0;

        this.cssAst.walkRules(rule => {
            // Split comma-separated selectors and handle each
            rule.selector.split(',').forEach(rawSelector => {
                const selector = rawSelector.trim();

                // Skip pseudo-elements as they cannot be inlined usually.
                // Note: The original implementation had logic to convert ::before/::after to spans.
                // If that is strictly required for WeChat, we should implemented a separate
                // "PseudoElementConverter" pass, but for pure CSS inlining, we skip them.
                if (selector && !selector.includes('::')) {
                    const cleanDecls: Declaration[] = [];
                    // Fixed: wrapped in block to return void instead of number (push result)
                    rule.walkDecls(decl => {
                        cleanDecls.push(decl);
                    });

                    styleRules.push({
                        selector,
                        decls: cleanDecls,
                        ruleIndex: ruleCounter++
                    });
                }
            });
        });

        // 4. Apply styles using TreeWalker (Different traversal strategy than original)
        const walker = this.document.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT);
        let currentNode: Node | null = walker.nextNode(); // Skip root wrapper

        while (currentNode) {
            this.applyStylesToElement(currentNode as HTMLElement, styleRules);
            currentNode = walker.nextNode();
        }

        // 5. Cleanup and return
        const result = wrapper.innerHTML;
        wrapper.remove();
        return result;
    }

    private applyStylesToElement(
        element: HTMLElement,
        rules: { selector: string, decls: Declaration[], ruleIndex: number }[]
    ) {
        const applicableStyles: Map<string, StyleDeclaration> = new Map();

        // Check every rule against this element
        for (const rule of rules) {
            try {
                if (element.matches(rule.selector)) {
                    const weight = SelectorWeight.from(rule.selector).value();

                    for (const decl of rule.decls) {
                        this.mergeDeclaration(applicableStyles, decl, weight, rule.ruleIndex);
                    }
                }
            } catch (e) {
                // Ignore invalid selector matches (e.g. browser specific pseudo-classes)
            }
        }

        // Apply final styles
        if (applicableStyles.size > 0) {
            this.writeStylesToElement(element, applicableStyles);
        }
    }

    private mergeDeclaration(
        map: Map<string, StyleDeclaration>,
        decl: Declaration,
        weight: number,
        ruleIndex: number
    ) {
        const prop = decl.prop;
        const existing = map.get(prop);
        const isImportant = decl.important ? 'important' : 'normal';

        let shouldApply = false;

        if (!existing) {
            shouldApply = true;
        } else if (isImportant === 'important' && existing.priority === 'normal') {
            shouldApply = true;
        } else if (isImportant === existing.priority) {
            if (weight > existing.weight) {
                shouldApply = true;
            } else if (weight === existing.weight && ruleIndex > existing.ruleIndex) {
                shouldApply = true;
            }
        }

        if (shouldApply) {
            map.set(prop, {
                property: prop,
                value: decl.value,
                priority: isImportant,
                weight: weight,
                ruleIndex: ruleIndex
            });
        }
    }

    private writeStylesToElement(element: HTMLElement, styles: Map<string, StyleDeclaration>) {
        let styleString = element.getAttribute('style') || '';

        // Basic semicolon normalization
        if (styleString && !styleString.trim().endsWith(';')) {
            styleString += '; ';
        }

        // Append new styles
        // Note: This naive append respects the inliner's decisions but doesn't overwrite 
        // existing inline styles if they conflict (standard CSS behavior: inline > style sheet).
        // However, standard behavior usually implies the browser engine parsing this.
        // For WeChat optimization, we might mostly care about adding what's missing.
        const stylesToApply: string[] = [];
        styles.forEach(style => {
            stylesToApply.push(`${style.property}: ${style.value}${style.priority === 'important' ? ' !important' : ''}`);
        });

        element.setAttribute('style', styleString + stylesToApply.join('; '));
    }
}

/**
 * Functional wrapper for backward compatibility or simple usage.
 * Maintains the original API signature but delegates to the new Class implementation.
 */
export function inlineCssWithPostcss(html: string, css: string): string {
    const inliner = new StyleInliner();
    return inliner.inline(html, css);
}
