import { parse } from '../../vendor/postcss';

interface AppliedDecl {
    specificity: number;
    order: number;
    important: boolean;
}

function stripQuotes(value: string): string {
    return value.replace(/(^")|("$)/g, '').replace(/(^')|('$)/g, '');
}

function normalizeSelector(selector: string): {
    selector: string;
    pseudo?: 'before' | 'after';
} | null {
    if (!selector) return null;

    // Ignore pseudo-classes (hover/active/visited/...) for WeChat output.
    // Keep pseudo-elements handling for `::before/::after` by converting to real nodes.
    const hasPseudoClass = selector.includes(':') && !selector.includes('::');
    if (hasPseudoClass) return null;

    let pseudo: 'before' | 'after' | undefined;
    if (selector.includes('::before')) pseudo = 'before';
    if (selector.includes('::after')) pseudo = 'after';

    // WeChat does not understand pseudo-elements, so we strip them from selector matching.
    // `::marker` can't be represented directly; stripping is best-effort.
    const cleaned = selector
        .replace(/::before/g, '')
        .replace(/::after/g, '')
        .replace(/::marker/g, '')
        .trim();

    if (!cleaned) return null;
    return { selector: cleaned, pseudo };
}

function calculateSpecificity(selector: string): number {
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

function collectInlineProps(el: HTMLElement): Set<string> {
    const set = new Set<string>();
    const style = el.getAttribute('style') || '';
    style.split(';').forEach(part => {
        const [key] = part.split(':');
        const k = key?.trim();
        if (k) set.add(k);
    });
    return set;
}

function createSpan(doc: Document): HTMLSpanElement {
    return doc.createElement('span');
}

function findMatchingSelector(el: HTMLElement, rawSelector: string): {
    selector: string;
    pseudo?: 'before' | 'after';
    specificity: number;
} | null {
    if (!rawSelector) return null;
    const parts = rawSelector.split(',').map(part => part.trim()).filter(Boolean);
    let best: { selector: string; pseudo?: 'before' | 'after'; specificity: number } | null = null;

    for (const part of parts) {
        const normalized = normalizeSelector(part);
        if (!normalized) continue;

        let matches = false;
        try {
            matches = el.matches(normalized.selector);
        } catch {
            continue;
        }
        if (!matches) continue;

        const specificity = calculateSpecificity(normalized.selector);
        if (!best || specificity > best.specificity) {
            best = { ...normalized, specificity };
        }
    }

    return best;
}

function getAppliedMap(applied: WeakMap<HTMLElement, Map<string, AppliedDecl>>, el: HTMLElement): Map<string, AppliedDecl> {
    const existing = applied.get(el);
    if (existing) return existing;
    const next = new Map<string, AppliedDecl>();
    applied.set(el, next);
    return next;
}

function applyDecl(
    applied: WeakMap<HTMLElement, Map<string, AppliedDecl>>,
    target: HTMLElement,
    prop: string,
    value: string,
    important: boolean,
    specificity: number,
    order: number,
    originalInlineProps: Set<string>
): void {
    if (originalInlineProps.has(prop) && !important) {
        return;
    }

    const map = getAppliedMap(applied, target);
    const existing = map.get(prop);
    if (existing) {
        if (existing.important && !important) return;
        if (!existing.important && important) {
            // override
        } else {
            if (specificity < existing.specificity) return;
            if (specificity === existing.specificity && order < existing.order) return;
        }
    }

    target.style.setProperty(prop, value, important ? 'important' : '');
    map.set(prop, { specificity, order, important });
}

function applyRuleToElement(
    el: HTMLElement,
    rule: any,
    originalInlineProps: Set<string>,
    order: number,
    applied: WeakMap<HTMLElement, Map<string, AppliedDecl>>
): void {
    const rawSelector = String(rule.selector ?? '');
    const matched = findMatchingSelector(el, rawSelector);
    if (!matched) return;

    let target: HTMLElement = el;

    if (matched.pseudo) {
        // Convert ::before/::after to an actual <span> so WeChat keeps layout consistent.
        let content = '';
        try {
            rule.walkDecls('content', (decl: any) => {
                content = String(decl.value ?? '');
            });
        } catch {
            // ignore
        }

        if (content.length > 0) {
            const span = createSpan(el.ownerDocument);
            span.textContent = stripQuotes(content);
            if (matched.pseudo === 'before') {
                el.prepend(span);
            } else {
                el.appendChild(span);
            }
            target = span;
            // Pseudo-element spans don't have original inline props.
            originalInlineProps = new Set<string>();
        } else {
            // No content => nothing to materialize.
            return;
        }
    }

    try {
        rule.walkDecls((decl: any) => {
            const prop = String(decl.prop ?? '').trim();
            const value = String(decl.value ?? '').trim();
            if (!prop || !value) return;

            const important = Boolean(decl.important);
            applyDecl(applied, target, prop, value, important, matched.specificity, order, originalInlineProps);
        });
    } catch {
        // ignore malformed decls
    }
}

function traverse(root: HTMLElement, rules: any[], applied: WeakMap<HTMLElement, Map<string, AppliedDecl>>): void {
    const originalInlineProps = collectInlineProps(root);
    for (let idx = 0; idx < rules.length; idx++) {
        applyRuleToElement(root, rules[idx], originalInlineProps, idx, applied);
    }

    // Skip SVG: selector matching/style application can be fragile for svg subtrees.
    if (root.tagName.toLowerCase() === 'svg') return;

    let child = root.firstElementChild as HTMLElement | null;
    while (child) {
        traverse(child, rules, applied);
        child = child.nextElementSibling as HTMLElement | null;
    }
}

/**
 * Inline CSS into HTML using vendored PostCSS AST + DOM selector matching.
 * Best-effort: ignores pseudo-classes; materializes ::before/::after when possible.
 */
export function inlineCssWithPostcss(html: string, css: string): string {
    if (!css || typeof document === 'undefined') return html;

    const doc = document.implementation.createHTMLDocument('wdwxedit-postcss-inline');
    const container = doc.createElement('div');
    container.innerHTML = html;
    doc.body.appendChild(container);

    const cssRoot = parse(css);
    const rules: any[] = [];
    try {
        cssRoot.walkRules((rule: any) => {
            rules.push(rule);
        });
    } catch {
        return html;
    }

    let el = container.firstElementChild as HTMLElement | null;
    const applied = new WeakMap<HTMLElement, Map<string, AppliedDecl>>();
    while (el) {
        traverse(el, rules, applied);
        el = el.nextElementSibling as HTMLElement | null;
    }

    return container.innerHTML;
}
