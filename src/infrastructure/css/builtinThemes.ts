/**
 * Built-in theme CSS presets for v5 style switching.
 * These are intentionally lightweight and scoped to `.wx-article`.
 */

type ThemePalette = {
    background: string;
    text: string;
    heading: string;
    muted: string;
    divider: string;
    blockquoteBg: string;
    blockquoteBorder: string;
    tableHeaderBg: string;
};

function buildThemeCss(palette: ThemePalette): string {
    return `
.wx-article {
  background-color: ${palette.background};
  color: ${palette.text};
}

.wx-article h1, .wx-article h2, .wx-article h3,
.wx-article h4, .wx-article h5, .wx-article h6 {
  color: ${palette.heading};
}

.wx-article blockquote {
  background-color: ${palette.blockquoteBg};
  border-left-color: ${palette.blockquoteBorder};
  color: ${palette.muted};
}

.wx-article hr {
  border-top-color: ${palette.divider};
}

.wx-article th {
  background-color: ${palette.tableHeaderBg};
}
    `.trim();
}

const BUILTIN_THEME_PALETTES: Record<string, ThemePalette> = {
    default: {
        background: '#ffffff',
        text: '#333333',
        heading: '#1a1a1a',
        muted: '#57606a',
        divider: '#eeeeee',
        blockquoteBg: '#f8f9fa',
        blockquoteBorder: '#1a73e8',
        tableHeaderBg: '#f6f8fa',
    },
    graphite: {
        background: '#f5f6f7',
        text: '#2d3748',
        heading: '#1f2933',
        muted: '#4b5563',
        divider: '#e5e7eb',
        blockquoteBg: '#e9edf1',
        blockquoteBorder: '#2d3748',
        tableHeaderBg: '#eef0f2',
    },
    green: {
        background: '#f3faf7',
        text: '#1f2937',
        heading: '#0f5132',
        muted: '#3f5f4d',
        divider: '#e2f2ea',
        blockquoteBg: '#e6f5ef',
        blockquoteBorder: '#10b981',
        tableHeaderBg: '#edf7f2',
    },
    orange: {
        background: '#fff8f1',
        text: '#3f2a1d',
        heading: '#9a3412',
        muted: '#6b4c3b',
        divider: '#fde7d5',
        blockquoteBg: '#ffedd5',
        blockquoteBorder: '#f59e0b',
        tableHeaderBg: '#fff2e3',
    },
    purple: {
        background: '#faf5ff',
        text: '#2d1b47',
        heading: '#5b21b6',
        muted: '#4b2a73',
        divider: '#efe5ff',
        blockquoteBg: '#f3e8ff',
        blockquoteBorder: '#8b5cf6',
        tableHeaderBg: '#f7efff',
    },
    red: {
        background: '#fff5f5',
        text: '#3f1d1d',
        heading: '#991b1b',
        muted: '#6b3a3a',
        divider: '#fde2e2',
        blockquoteBg: '#fee2e2',
        blockquoteBorder: '#ef4444',
        tableHeaderBg: '#ffecec',
    },
    // Typography-only presets
    sans: {
        background: '#ffffff',
        text: '#333333',
        heading: '#1a1a1a',
        muted: '#57606a',
        divider: '#eeeeee',
        blockquoteBg: '#f8f9fa',
        blockquoteBorder: '#1a73e8',
        tableHeaderBg: '#f6f8fa',
    },
    serif: {
        background: '#ffffff',
        text: '#2f2f2f',
        heading: '#1a1a1a',
        muted: '#5b5b5b',
        divider: '#eeeeee',
        blockquoteBg: '#f8f9fa',
        blockquoteBorder: '#1a73e8',
        tableHeaderBg: '#f6f8fa',
    },
};

export function getBuiltinThemeCss(themeId: string): string | null {
    const palette = BUILTIN_THEME_PALETTES[themeId];
    if (!palette) return null;
    return buildThemeCss(palette);
}
