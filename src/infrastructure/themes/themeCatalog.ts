/**
 * Theme catalog definitions
 *
 * Theme items are downloadable CSS bundles that can be installed into assets/themes.
 */

export interface ThemeCatalogItem {
    /** Unique theme ID (used as filename) */
    id: string;
    /** Display name */
    name: string;
    /** Description (legacy alias) */
    description?: string;
    /** Short description for store */
    desc?: string;
    /** Remote CSS URL */
    cssUrl: string;
    /** Project homepage */
    homepage?: string;
    /** Author or org */
    author?: string;
    /** License identifier */
    license?: string;
    /** Optional selector replacements (simple string replace) */
    replace?: Array<[string, string]>;
    /** Whether this entry comes from user custom list */
    custom?: boolean;
    /** Tags for categorization */
    tags?: string[];
}

/**
 * Registry item for code highlight themes
 */
export interface HighlightCatalogItem {
    id: string;
    /** Display name */
    name: string;
    /** Description */
    desc?: string;
    /** Remote CSS URL */
    cssUrl: string;
    /** Author or org */
    author?: string;
    /** Tags */
    tags?: string[];
    /** Whether this entry comes from user custom list */
    custom?: boolean;
}

/**
 * Built-in theme catalog (can be extended by user custom list).
 *
 * NOTE: This list is intentionally minimal here; add curated items after
 * confirming the GitHub sources.
 */
export const BUILTIN_THEME_CATALOG: ThemeCatalogItem[] = [
    // sindresorhus/github-markdown-css
    {
        id: 'github-markdown',
        name: 'GitHub Markdown',
        description: '仿 GitHub 的基础排版样式',
        cssUrl: 'https://raw.githubusercontent.com/sindresorhus/github-markdown-css/main/github-markdown.css',
        homepage: 'https://github.com/sindresorhus/github-markdown-css',
        author: 'sindresorhus',
    },
    {
        id: 'github-markdown-light',
        name: 'GitHub Markdown Light',
        description: 'GitHub 亮色版本',
        cssUrl: 'https://raw.githubusercontent.com/sindresorhus/github-markdown-css/main/github-markdown-light.css',
        homepage: 'https://github.com/sindresorhus/github-markdown-css',
        author: 'sindresorhus',
    },
    {
        id: 'github-markdown-dark',
        name: 'GitHub Markdown Dark',
        description: 'GitHub 暗色版本',
        cssUrl: 'https://raw.githubusercontent.com/sindresorhus/github-markdown-css/main/github-markdown-dark.css',
        homepage: 'https://github.com/sindresorhus/github-markdown-css',
        author: 'sindresorhus',
    },

    // jasonm23/markdown-css-themes (gh-pages branch)
    {
        id: 'markdown-css-classic',
        name: 'Markdown Classic',
        description: '经典简洁排版',
        cssUrl: 'https://raw.githubusercontent.com/jasonm23/markdown-css-themes/gh-pages/markdown.css',
        homepage: 'https://github.com/jasonm23/markdown-css-themes',
        author: 'jasonm23',
    },
    {
        id: 'markdown-css-avenir',
        name: 'Avenir White',
        description: '清爽阅读风格',
        cssUrl: 'https://raw.githubusercontent.com/jasonm23/markdown-css-themes/gh-pages/avenir-white.css',
        homepage: 'https://github.com/jasonm23/markdown-css-themes',
        author: 'jasonm23',
    },
    {
        id: 'markdown-css-foghorn',
        name: 'Foghorn',
        description: '强对比文本风格',
        cssUrl: 'https://raw.githubusercontent.com/jasonm23/markdown-css-themes/gh-pages/foghorn.css',
        homepage: 'https://github.com/jasonm23/markdown-css-themes',
        author: 'jasonm23',
    },
    {
        id: 'markdown-css-swiss',
        name: 'Swiss',
        description: '简洁现代排版',
        cssUrl: 'https://raw.githubusercontent.com/jasonm23/markdown-css-themes/gh-pages/swiss.css',
        homepage: 'https://github.com/jasonm23/markdown-css-themes',
        author: 'jasonm23',
    },

    // shfshanyue/markdown-theme
    {
        id: 'markdown-theme-github',
        name: 'Markdown Theme GitHub',
        description: 'GitHub 风格（markdown-theme）',
        cssUrl: 'https://raw.githubusercontent.com/shfshanyue/markdown-theme/master/src/github.css',
        homepage: 'https://github.com/shfshanyue/markdown-theme',
        author: 'shfshanyue',
    },
    {
        id: 'markdown-theme-chocolate',
        name: 'Chocolate',
        description: '暖色阅读主题',
        cssUrl: 'https://raw.githubusercontent.com/shfshanyue/markdown-theme/master/src/chocolate.css',
        homepage: 'https://github.com/shfshanyue/markdown-theme',
        author: 'shfshanyue',
    },
    {
        id: 'markdown-theme-shanyue',
        name: 'Shanyue',
        description: '清爽排版风格',
        cssUrl: 'https://raw.githubusercontent.com/shfshanyue/markdown-theme/master/src/shanyue.css',
        homepage: 'https://github.com/shfshanyue/markdown-theme',
        author: 'shfshanyue',
    },
    {
        id: 'markdown-theme-v-green',
        name: 'V Green',
        description: '轻绿主题',
        cssUrl: 'https://raw.githubusercontent.com/shfshanyue/markdown-theme/master/src/v-green.css',
        homepage: 'https://github.com/shfshanyue/markdown-theme',
        author: 'shfshanyue',
    },

    // rhiokim/markdown-css
    {
        id: 'markdown-css-github-rhio',
        name: 'GitHub (Rhio)',
        description: 'GitHub 风格（rhiokim 版本）',
        cssUrl: 'https://raw.githubusercontent.com/rhiokim/markdown-css/master/assets/css/github/github.css',
        homepage: 'https://github.com/rhiokim/markdown-css',
        author: 'rhiokim',
    },
    {
        id: 'markdown-css-solarized-light',
        name: 'Solarized Light',
        description: 'Solarized 亮色',
        cssUrl: 'https://raw.githubusercontent.com/rhiokim/markdown-css/master/assets/css/solarized-light/solarized-light.css',
        homepage: 'https://github.com/rhiokim/markdown-css',
        author: 'rhiokim',
    },
    {
        id: 'markdown-css-solarized-dark',
        name: 'Solarized Dark',
        description: 'Solarized 暗色',
        cssUrl: 'https://raw.githubusercontent.com/rhiokim/markdown-css/master/assets/css/solarized-dark/solarized-dark.css',
        homepage: 'https://github.com/rhiokim/markdown-css',
        author: 'rhiokim',
    },
    {
        id: 'markdown-css-clearness',
        name: 'Clearness',
        description: '轻量留白风格',
        cssUrl: 'https://raw.githubusercontent.com/rhiokim/markdown-css/master/assets/css/clearness/clearness.css',
        homepage: 'https://github.com/rhiokim/markdown-css',
        author: 'rhiokim',
    },

    // cnak/clean-markdown-theme
    {
        id: 'clean-markdown-theme',
        name: 'Clean Markdown',
        description: '轻量简洁主题',
        cssUrl: 'https://raw.githubusercontent.com/cnak/clean-markdown-theme/master/cleanTheme.css',
        homepage: 'https://github.com/cnak/clean-markdown-theme',
        author: 'cnak',
    },

    // dev-seahouse/markdown-css-theme
    {
        id: 'markdown-css-theme-seahouse',
        name: 'Seahouse Theme',
        description: '滚动阅读优化',
        cssUrl: 'https://raw.githubusercontent.com/dev-seahouse/markdown-css-theme/master/theme.css',
        homepage: 'https://github.com/dev-seahouse/markdown-css-theme',
        author: 'dev-seahouse',
    },

    // hzlzh/MarkDown-Theme
    {
        id: 'markdown-theme-github-readme',
        name: 'GitHub ReadMe',
        description: '阅读型 GitHub 风格',
        cssUrl: 'https://raw.githubusercontent.com/hzlzh/MarkDown-Theme/master/CSS/GitHub-ReadMe.css',
        homepage: 'https://github.com/hzlzh/MarkDown-Theme',
        author: 'hzlzh',
    },
];
