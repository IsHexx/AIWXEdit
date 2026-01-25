/**
 * Code theme color definitions
 *
 * Shared between code rendering and preview styling.
 */

export interface CodeThemeColors {
    bg: string;
    text: string;
    keyword: string;
    string: string;
    comment: string;
    number: string;
    function: string;
    variable: string;
    type: string;
}

const CODE_THEMES: Record<string, CodeThemeColors> = {
    github: {
        bg: '#f6f8fa',
        text: '#24292e',
        keyword: '#d73a49',
        string: '#032f62',
        comment: '#6a737d',
        number: '#005cc5',
        function: '#6f42c1',
        variable: '#e36209',
        type: '#6f42c1',
    },
    vs: {
        bg: '#ffffff',
        text: '#000000',
        keyword: '#0000ff',
        string: '#a31515',
        comment: '#008000',
        number: '#098658',
        function: '#795e26',
        variable: '#001080',
        type: '#267f99',
    },
    'atom-one-light': {
        bg: '#fafafa',
        text: '#383a42',
        keyword: '#a626a4',
        string: '#50a14f',
        comment: '#a0a1a7',
        number: '#986801',
        function: '#4078f2',
        variable: '#e45649',
        type: '#c18401',
    },
    'atom-one-dark': {
        bg: '#282c34',
        text: '#abb2bf',
        keyword: '#c678dd',
        string: '#98c379',
        comment: '#5c6370',
        number: '#d19a66',
        function: '#61afef',
        variable: '#e06c75',
        type: '#e5c07b',
    },
    monokai: {
        bg: '#272822',
        text: '#f8f8f2',
        keyword: '#f92672',
        string: '#e6db74',
        comment: '#75715e',
        number: '#ae81ff',
        function: '#a6e22e',
        variable: '#f8f8f2',
        type: '#66d9ef',
    },
    dracula: {
        bg: '#282a36',
        text: '#f8f8f2',
        keyword: '#ff79c6',
        string: '#f1fa8c',
        comment: '#6272a4',
        number: '#bd93f9',
        function: '#50fa7b',
        variable: '#f8f8f2',
        type: '#8be9fd',
    },
    nord: {
        bg: '#2e3440',
        text: '#d8dee9',
        keyword: '#81a1c1',
        string: '#a3be8c',
        comment: '#616e88',
        number: '#b48ead',
        function: '#88c0d0',
        variable: '#d8dee9',
        type: '#8fbcbb',
    },
    tomorrow: {
        bg: '#ffffff',
        text: '#4d4d4c',
        keyword: '#8959a8',
        string: '#718c00',
        comment: '#8e908c',
        number: '#f5871f',
        function: '#4271ae',
        variable: '#c82829',
        type: '#3e999f',
    },
};

function parseDeclarations(block: string): Record<string, string> {
    const result: Record<string, string> = {};
    block.split(';').forEach(part => {
        const [rawKey, rawValue] = part.split(':');
        if (!rawKey || !rawValue) return;
        const key = rawKey.trim().toLowerCase();
        const value = rawValue.trim();
        if (key && value) {
            result[key] = value;
        }
    });
    return result;
}

function extractColorsFromCss(css: string): Partial<CodeThemeColors> {
    if (!css) return {};
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = cleaned.split('}');

    const result: Partial<CodeThemeColors> = {};

    for (const block of blocks) {
        const [rawSelectors, rawDecls] = block.split('{');
        if (!rawSelectors || !rawDecls) continue;
        const selectors = rawSelectors.split(',').map(s => s.trim());
        const decls = parseDeclarations(rawDecls);
        const color = decls.color;
        const background = decls['background-color'] || decls.background;

        if (selectors.includes('.hljs')) {
            if (color) result.text = color;
            if (background) result.bg = background;
        }
        if (selectors.includes('.hljs-keyword') || selectors.includes('.hljs-selector-tag')) {
            if (color) result.keyword = color;
        }
        if (selectors.includes('.hljs-string') || selectors.includes('.hljs-attr')) {
            if (color) result.string = color;
        }
        if (selectors.includes('.hljs-comment') || selectors.includes('.hljs-quote')) {
            if (color) result.comment = color;
        }
        if (selectors.includes('.hljs-number') || selectors.includes('.hljs-literal')) {
            if (color) result.number = color;
        }
        if (selectors.includes('.hljs-function') || selectors.includes('.hljs-title') || selectors.includes('.hljs-section')) {
            if (color) result.function = color;
        }
        if (selectors.includes('.hljs-variable') || selectors.includes('.hljs-template-variable') || selectors.includes('.hljs-name')) {
            if (color) result.variable = color;
        }
        if (selectors.includes('.hljs-type') || selectors.includes('.hljs-class')) {
            if (color) result.type = color;
        }
    }

    return result;
}

export function getCodeThemeColors(theme: string): CodeThemeColors {
    return CODE_THEMES[theme] || CODE_THEMES.github;
}

export function getCodeThemeColorsFromCss(theme: string, css: string): CodeThemeColors {
    const base = getCodeThemeColors(theme);
    const extracted = extractColorsFromCss(css);
    return {
        bg: extracted.bg || base.bg,
        text: extracted.text || base.text,
        keyword: extracted.keyword || base.keyword,
        string: extracted.string || base.string,
        comment: extracted.comment || base.comment,
        number: extracted.number || base.number,
        function: extracted.function || base.function,
        variable: extracted.variable || base.variable,
        type: extracted.type || base.type,
    };
}

/**
 * Generate a minimal highlight.js theme CSS for WeChat output.
 * This is used as a fallback when the user hasn't installed highlight CSS assets.
 *
 * We keep it intentionally small but cover common hljs token classes.
 * The resulting CSS will still be inlined via the PostCSS inliner, so it works for
 * preview/copy/publish consistently.
 */
export function generateHljsFallbackCss(theme: string): string {
    const c = getCodeThemeColors(theme);
    return `
.hljs { color: ${c.text}; background: ${c.bg}; }
.hljs-comment, .hljs-quote { color: ${c.comment}; font-style: italic; }

/* Keywords / tags */
.hljs-doctag,
.hljs-keyword,
.hljs-meta-keyword,
.hljs-template-tag,
.hljs-type,
.hljs-selector-tag,
.hljs-literal { color: ${c.keyword}; font-weight: 600; }
.hljs-tag,
.hljs-name { color: ${c.keyword}; }

/* Strings / regex */
.hljs-string,
.hljs-regexp,
.hljs-symbol,
.hljs-bullet,
.hljs-addition,
.hljs-meta-string { color: ${c.string}; }

/* Numbers / meta */
.hljs-number,
.hljs-meta { color: ${c.number}; }

/* Functions / titles */
.hljs-function,
.hljs-title,
.hljs-title.function_,
.hljs-title.class_,
.hljs-section,
.hljs-selector-id,
.hljs-selector-class { color: ${c.function}; font-weight: 600; }

/* Variables / attributes / properties */
.hljs-variable,
.hljs-template-variable,
.hljs-attr,
.hljs-attribute,
.hljs-params,
.hljs-property,
.hljs-selector-attr,
.hljs-selector-pseudo { color: ${c.variable}; }

/* Builtins / classes */
.hljs-built_in,
.hljs-builtin-name,
.hljs-class { color: ${c.type}; }

/* Misc */
.hljs-subst { color: ${c.text}; }
.hljs-link { color: ${c.number}; text-decoration: underline; }
.hljs-deletion { color: ${c.keyword}; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }
    `.trim();
}
