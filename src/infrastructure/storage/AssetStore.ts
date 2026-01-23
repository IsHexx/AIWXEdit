/**
 * Asset Store
 * 
 * Manages theme and highlight assets for the plugin.
 * Handles loading, caching, and access to style resources.
 */

import type { App, PluginManifest } from 'obsidian';
import { Notice } from 'obsidian';

/**
 * Theme definition
 */
export interface ThemeAsset {
    /** Theme identifier */
    id: string;
    /** Display name */
    name: string;
    /** CSS content */
    css: string;
    /** Whether this is a built-in theme */
    builtIn: boolean;
}

/**
 * Highlight theme definition
 */
export interface HighlightAsset {
    /** Highlight identifier */
    id: string;
    /** Display name */
    name: string;
    /** CSS content */
    css: string;
}

/**
 * Asset Store
 * 
 * Singleton class that manages theme and highlight assets.
 */
export class AssetStore {
    private static instance: AssetStore | null = null;
    private app: App | null = null;
    private manifest: PluginManifest | null = null;

    private themes: Map<string, ThemeAsset> = new Map();
    private highlights: Map<string, HighlightAsset> = new Map();
    private customCSS = '';
    private isLoaded = false;

    private assetsPath = '';
    private themesPath = '';
    private highlightsPath = '';
    private themesConfigPath = '';
    private highlightsConfigPath = '';
    private customCSSPath = '';

    private constructor() { }

    /**
     * Get the singleton instance
     */
    static getInstance(): AssetStore {
        if (!AssetStore.instance) {
            AssetStore.instance = new AssetStore();
        }
        return AssetStore.instance;
    }

    /**
     * Initialize the store with app and manifest
     */
    initialize(app: App, manifest: PluginManifest): void {
        this.app = app;
        this.manifest = manifest;
        this.assetsPath = `${this.app.vault.configDir}/plugins/${manifest.id}/assets/`;
        this.themesPath = `${this.assetsPath}themes/`;
        this.highlightsPath = `${this.assetsPath}highlights/`;
        this.themesConfigPath = `${this.assetsPath}themes.json`;
        this.highlightsConfigPath = `${this.assetsPath}highlights.json`;
        this.customCSSPath = `${this.assetsPath}custom.css`;
    }

    /**
     * Load all assets from disk
     */
    async load(): Promise<void> {
        if (this.isLoaded) return;

        await this.loadBuiltInThemes();
        await this.loadBuiltInHighlights();
        await this.loadCustomCSS();
        this.isLoaded = true;
    }

    // ==================== Themes ====================

    /**
     * Load built-in themes
     */
    private async loadBuiltInThemes(): Promise<void> {
        // Add default theme
        this.themes.set('default', {
            id: 'default',
            name: '默认主题',
            css: this.getDefaultThemeCSS(),
            builtIn: true,
        });

        if (!this.app) return;

        try {
            const adapter = this.app.vault.adapter;
            if (!await adapter.exists(this.themesConfigPath)) {
                return;
            }

            const raw = await adapter.read(this.themesConfigPath);
            const items = JSON.parse(raw) as Array<{ name: string; className: string }>;

            for (const item of items) {
                const cssPath = `${this.themesPath}${item.className}.css`;
                if (!await adapter.exists(cssPath)) {
                    continue;
                }
                const css = await adapter.read(cssPath);
                this.themes.set(item.className, {
                    id: item.className,
                    name: item.name,
                    css,
                    builtIn: false,
                });
            }
        } catch (error) {
            console.error('Failed to load themes:', error);
            new Notice('主题加载失败，请检查 assets 目录');
        }
    }

    /**
     * Get all available themes
     */
    getThemes(): ThemeAsset[] {
        return Array.from(this.themes.values());
    }

    /**
     * Get theme by ID
     */
    getTheme(id: string): ThemeAsset | null {
        return this.themes.get(id) || null;
    }

    /**
     * Get theme CSS by ID
     */
    getThemeCSS(id: string): string {
        const theme = this.themes.get(id);
        return theme?.css || this.getDefaultThemeCSS();
    }

    /**
     * Load built-in highlights
     */
    private async loadBuiltInHighlights(): Promise<void> {
        if (!this.app) return;

        try {
            const adapter = this.app.vault.adapter;
            if (!await adapter.exists(this.highlightsConfigPath)) {
                return;
            }

            const raw = await adapter.read(this.highlightsConfigPath);
            const items = JSON.parse(raw) as Array<{ name: string }>;

            for (const item of items) {
                const cssPath = `${this.highlightsPath}${item.name}.css`;
                if (!await adapter.exists(cssPath)) {
                    continue;
                }
                const css = await adapter.read(cssPath);
                this.highlights.set(item.name, {
                    id: item.name,
                    name: item.name,
                    css,
                });
            }
        } catch (error) {
            console.error('Failed to load highlights:', error);
            new Notice('高亮主题加载失败，请检查 assets 目录');
        }
    }

    /**
     * Get all available highlights
     */
    getHighlights(): HighlightAsset[] {
        return Array.from(this.highlights.values());
    }

    /**
     * Get highlight by ID
     */
    getHighlight(id: string): HighlightAsset | null {
        return this.highlights.get(id) || null;
    }

    /**
     * Get highlight CSS by ID
     */
    getHighlightCSS(id: string): string {
        return this.highlights.get(id)?.css || '';
    }

    /**
     * Load custom CSS (assets/custom.css)
     */
    async loadCustomCSS(): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(this.customCSSPath)) {
            this.customCSS = '';
            return;
        }
        this.customCSS = await adapter.read(this.customCSSPath);
    }

    /**
     * Get custom CSS content
     */
    getCustomCSS(): string {
        return this.customCSS;
    }

    /**
     * Get default theme CSS
     */
    private getDefaultThemeCSS(): string {
        return `
/* WDWXEdit V5 - Default Theme */

.wx-article {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #333;
    padding: 20px;
}

.wx-article h1, .wx-article h2, .wx-article h3, 
.wx-article h4, .wx-article h5, .wx-article h6 {
    color: #1a1a1a;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
}

.wx-article h1 { font-size: 1.8em; }
.wx-article h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
.wx-article h3 { font-size: 1.25em; }
.wx-article h4 { font-size: 1.1em; }

.wx-article p {
    margin: 1em 0;
}

.wx-article a {
    color: #1a73e8;
    text-decoration: none;
}

.wx-article blockquote {
    margin: 1em 0;
    padding: 10px 20px;
    border-left: 4px solid #1a73e8;
    background-color: #f8f9fa;
    color: #666;
}

.wx-article code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.9em;
    padding: 2px 6px;
    background-color: #f5f5f5;
    border-radius: 3px;
}

.wx-article pre {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin: 1em 0;
}

.wx-article pre code {
    padding: 0;
    background: transparent;
}

.wx-article img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
}

.wx-article ul, .wx-article ol {
    margin: 1em 0;
    padding-left: 2em;
}

.wx-article li {
    margin: 0.5em 0;
}

.wx-article table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}

.wx-article th, .wx-article td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

.wx-article th {
    background-color: #f6f8fa;
    font-weight: 600;
}

.wx-article hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 2em 0;
}
        `.trim();
    }

    // ==================== Utilities ====================

    /**
     * Check if assets are loaded
     */
    isAssetsLoaded(): boolean {
        return this.isLoaded;
    }

    /**
     * Reload all assets
     */
    async reload(): Promise<void> {
        this.themes.clear();
        this.highlights.clear();
        this.isLoaded = false;
        await this.load();
    }
}

/**
 * Get asset store instance
 */
export function getAssetStore(): AssetStore {
    return AssetStore.getInstance();
}
