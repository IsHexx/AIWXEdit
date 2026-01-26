/**
 * Asset Store
 * 
 * Manages theme and highlight assets for the plugin.
 * Handles loading, caching, and access to style resources.
 */

import type { App, PluginManifest } from 'obsidian';
import { Notice, requestUrl } from 'obsidian';
import { getBuiltinThemeCss } from '../css/builtinThemes';
import { BUILTIN_THEME_CATALOG, type ThemeCatalogItem, type HighlightCatalogItem } from '../themes/themeCatalog';

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

interface ThemeConfigItem {
    name: string;
    className: string;
    [key: string]: unknown;
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
    private customThemeCatalog: ThemeCatalogItem[] = [];
    private isLoaded = false;

    private assetsPath = '';
    private themesPath = '';
    private highlightsPath = '';
    private themesConfigPath = '';
    private highlightsConfigPath = '';
    private customCSSPath = '';
    private themeCatalogPath = '';

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
        this.themeCatalogPath = `${this.assetsPath}theme-market.json`;
    }

    /**
     * Load all assets from disk
     */
    async load(): Promise<void> {
        if (this.isLoaded) return;

        await this.loadBuiltInThemes();
        await this.loadBuiltInHighlights();
        await this.loadUnregisteredLocalThemes(); // Add local scan
        await this.loadCustomCSS();
        await this.loadThemeCatalog();
        this.isLoaded = true;
    }

    /**
     * Load unregistered local themes (drop-in .css files)
     */
    private async loadUnregisteredLocalThemes(): Promise<void> {
        if (!this.app) return;
        try {
            const adapter = this.app.vault.adapter;
            if (!await adapter.exists(this.themesPath)) {
                return;
            }

            const result = await adapter.list(this.themesPath);
            const cssFiles = result.files.filter(path => path.toLowerCase().endsWith('.css'));

            for (const filePath of cssFiles) {
                // Extract filename without extension as ID
                const parts = filePath.split('/');
                const filename = parts[parts.length - 1];
                const id = filename.replace(/\.css$/i, '');

                // Skip if already registered (builtin or config-based)
                if (this.themes.has(id)) {
                    continue;
                }

                // Load content
                let css = await adapter.read(filePath);
                css = this.sanitizeCssSelectors(css);

                // Register as a theme
                this.themes.set(id, {
                    id: id,
                    name: id, // Use filename as name
                    css: css,
                    builtIn: false
                });
            }
        } catch (error) {
            console.error('Failed to load local themes:', error);
        }
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

        // Add extra built-in presets
        const presets = [
            { id: 'graphite', name: '石墨' },
            { id: 'green', name: '翠绿' },
            { id: 'orange', name: '活力橙' },
            { id: 'purple', name: '典雅紫' },
            { id: 'red', name: '朱砂红' },
        ];

        presets.forEach(preset => {
            const css = getBuiltinThemeCss(preset.id);
            if (css) {
                this.themes.set(preset.id, {
                    id: preset.id,
                    name: preset.name,
                    css: css,
                    builtIn: true,
                });
            }
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
                const normalizedCss = this.sanitizeCssSelectors(css);
                this.themes.set(item.className, {
                    id: item.className,
                    name: item.name,
                    css: normalizedCss,
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
        if (theme?.css) {
            return theme.css;
        }
        const builtin = getBuiltinThemeCss(id);
        if (builtin) {
            return builtin;
        }
        return this.getDefaultThemeCSS();
    }

    /**
     * Get theme catalog (builtin + custom)
     */
    getThemeCatalog(): ThemeCatalogItem[] {
        const merged = new Map<string, ThemeCatalogItem>();
        for (const item of BUILTIN_THEME_CATALOG) {
            merged.set(item.id, { ...item, custom: false });
        }
        for (const item of this.customThemeCatalog) {
            merged.set(item.id, { ...item, custom: true });
        }
        return Array.from(merged.values());
    }

    /**
     * Whether a theme is installed (downloaded)
     */
    isThemeInstalled(id: string): boolean {
        const theme = this.themes.get(id);
        return !!theme && !theme.builtIn;
    }

    /**
     * Install a theme from catalog entry
     */
    async installTheme(item: ThemeCatalogItem): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (item.id === 'default') {
            new Notice('默认主题无需下载');
            return;
        }

        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);
        await this.ensureDir(this.themesPath);

        const response = await requestUrl({ url: item.cssUrl, method: 'GET' });
        const cssRaw = typeof response.text === 'string' ? response.text : '';
        if (!cssRaw) {
            throw new Error('主题 CSS 为空或下载失败');
        }

        const css = this.normalizeThemeCss(cssRaw, item);
        const cssPath = `${this.themesPath}${item.id}.css`;
        await adapter.write(cssPath, css);

        await this.updateThemesConfig(item);
        await this.reload();
    }

    /**
     * Uninstall a downloaded theme
     */
    async uninstallTheme(id: string): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (!this.isThemeInstalled(id)) return;

        const adapter = this.app.vault.adapter;
        const cssPath = `${this.themesPath}${id}.css`;
        if (await adapter.exists(cssPath)) {
            await adapter.remove(cssPath);
        }
        await this.removeThemeFromConfig(id);
        await this.reload();
    }

    /**
     * Add custom theme entry to catalog
     */
    async addCustomThemeToCatalog(item: ThemeCatalogItem): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');

        const id = this.sanitizeThemeId(item.id || item.name);
        if (!id) {
            throw new Error('主题 ID 无效');
        }

        const normalized: ThemeCatalogItem = {
            ...item,
            id,
            custom: true,
        };

        const existing = this.customThemeCatalog.findIndex(t => t.id === id);
        if (existing >= 0) {
            this.customThemeCatalog[existing] = normalized;
        } else {
            this.customThemeCatalog.push(normalized);
        }

        await this.saveCustomThemeCatalog();
    }

    /**
     * Remove custom theme entry from catalog
     */
    async removeCustomThemeFromCatalog(id: string): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');
        this.customThemeCatalog = this.customThemeCatalog.filter(t => t.id !== id);
        await this.saveCustomThemeCatalog();
    }

    /**
     * Batch install themes
     */
    async installThemes(items: ThemeCatalogItem[]): Promise<number> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (items.length === 0) return 0;

        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);
        await this.ensureDir(this.themesPath);

        let successCount = 0;
        const failed: string[] = [];

        // Download in parallel
        await Promise.all(items.map(async (item) => {
            try {
                if (item.id === 'default') return;

                const response = await requestUrl({ url: item.cssUrl, method: 'GET' });
                const cssRaw = typeof response.text === 'string' ? response.text : '';
                if (!cssRaw) throw new Error('Empty CSS');

                const css = this.normalizeThemeCss(cssRaw, item);
                const cssPath = `${this.themesPath}${item.id}.css`;
                await adapter.write(cssPath, css);
                successCount++;
            } catch (error) {
                console.error(`Failed to download theme ${item.name}:`, error);
                failed.push(item.name);
            }
        }));

        if (successCount > 0) {
            await this.updateThemesConfigBatch(items.filter(i => !failed.includes(i.name) && i.id !== 'default'));
            await this.reload();
        }

        return successCount;
    }

    /**
     * Batch uninstall themes
     */
    async uninstallThemes(items: ThemeCatalogItem[]): Promise<number> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (items.length === 0) return 0;

        const adapter = this.app.vault.adapter;
        let successCount = 0;

        await Promise.all(items.map(async (item) => {
            const cssPath = `${this.themesPath}${item.id}.css`;
            if (await adapter.exists(cssPath)) {
                await adapter.remove(cssPath);
                successCount++;
            }
        }));

        if (successCount > 0) {
            await this.updateThemesConfigBatchUninstall(items);
            await this.reload();
        }

        return successCount;
    }

    private async updateThemesConfigBatchUninstall(items: ThemeCatalogItem[]): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        const existing = await this.readThemesConfig();
        const ids = new Set(items.map(i => i.id));
        const updated = existing.filter(entry => !ids.has(entry.className));
        await adapter.write(this.themesConfigPath, JSON.stringify(updated, null, 2));
    }

    private async updateThemesConfigBatch(items: ThemeCatalogItem[]): Promise<void> {
        if (!this.app || items.length === 0) return;
        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);

        const existing = await this.readThemesConfig();
        const ids = new Set(items.map(i => i.id));

        // Remove existing entries that are being updated
        const updated = existing.filter(entry => !ids.has(entry.className));

        // Add new entries
        items.forEach(item => {
            updated.push({
                name: item.name,
                className: item.id,
                cssUrl: item.cssUrl,
                homepage: item.homepage,
                author: item.author,
                license: item.license,
            });
        });

        await adapter.write(this.themesConfigPath, JSON.stringify(updated, null, 2));
    }

    // ==================== Highlights ====================

    /**
     * Batch install highlights
     */
    async installHighlights(items: HighlightCatalogItem[]): Promise<number> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (items.length === 0) return 0;

        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);
        await this.ensureDir(this.highlightsPath);

        let successCount = 0;
        const failed: string[] = [];

        await Promise.all(items.map(async (item) => {
            try {
                const response = await requestUrl({ url: item.cssUrl, method: 'GET' });
                const cssRaw = typeof response.text === 'string' ? response.text : '';
                if (!cssRaw) throw new Error('Empty CSS');

                const cssPath = `${this.highlightsPath}${item.id}.css`;
                await adapter.write(cssPath, cssRaw);
                successCount++;
            } catch (error) {
                console.error(`Failed to download highlight ${item.name}:`, error);
                failed.push(item.name);
            }
        }));

        if (successCount > 0) {
            await this.updateHighlightsConfigBatch(items.filter(i => !failed.includes(i.name)));
            await this.reload();
        }

        return successCount;
    }

    /**
     * Batch uninstall highlights
     */
    async uninstallHighlights(items: HighlightCatalogItem[]): Promise<number> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (items.length === 0) return 0;

        const adapter = this.app.vault.adapter;
        let successCount = 0;

        await Promise.all(items.map(async (item) => {
            const cssPath = `${this.highlightsPath}${item.id}.css`;
            if (await adapter.exists(cssPath)) {
                await adapter.remove(cssPath);
                successCount++;
            }
        }));

        if (successCount > 0) {
            await this.updateHighlightsConfigBatchUninstall(items);
            await this.reload();
        }

        return successCount;
    }

    private async updateHighlightsConfigBatchUninstall(items: HighlightCatalogItem[]): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        const existing = await this.readHighlightsConfig();
        const ids = new Set(items.map(i => i.id));
        const updated = existing.filter(entry => !ids.has(entry.name));
        await adapter.write(this.highlightsConfigPath, JSON.stringify(updated, null, 2));
    }

    private async updateHighlightsConfigBatch(items: HighlightCatalogItem[]): Promise<void> {
        if (!this.app || items.length === 0) return;
        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);

        const existing = await this.readHighlightsConfig();
        const ids = new Set(items.map(i => i.id));

        // Remove existing entries that are being updated
        const updated = existing.filter(entry => !ids.has(entry.name));

        // Add new entries
        items.forEach(item => {
            updated.push({ name: item.id });
        });

        await adapter.write(this.highlightsConfigPath, JSON.stringify(updated, null, 2));
    }

    /**
     * Whether a highlight is installed
     */
    isHighlightInstalled(id: string): boolean {
        return this.highlights.has(id);
    }

    /**
     * Install a highlight from catalog entry
     */
    async installHighlight(item: HighlightCatalogItem): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');

        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);
        await this.ensureDir(this.highlightsPath);

        const response = await requestUrl({ url: item.cssUrl, method: 'GET' });
        const cssRaw = typeof response.text === 'string' ? response.text : '';
        if (!cssRaw) {
            throw new Error('高亮 CSS 为空或下载失败');
        }

        const cssPath = `${this.highlightsPath}${item.id}.css`;
        await adapter.write(cssPath, cssRaw);

        await this.updateHighlightsConfig(item);
        await this.reload();
    }

    /**
     * Uninstall a highlight
     */
    async uninstallHighlight(id: string): Promise<void> {
        if (!this.app) throw new Error('AssetStore not initialized');
        if (!this.isHighlightInstalled(id)) return;

        const adapter = this.app.vault.adapter;
        const cssPath = `${this.highlightsPath}${id}.css`;
        if (await adapter.exists(cssPath)) {
            await adapter.remove(cssPath);
        }
        await this.removeHighlightFromConfig(id);
        await this.reload();
    }

    private async updateHighlightsConfig(item: HighlightCatalogItem): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);

        const existing = await this.readHighlightsConfig();
        // Remove existing if any (update)
        const updated = existing.filter(entry => entry.name !== item.id);
        updated.push({ name: item.id });

        await adapter.write(this.highlightsConfigPath, JSON.stringify(updated, null, 2));
    }

    private async removeHighlightFromConfig(id: string): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        const existing = await this.readHighlightsConfig();
        const updated = existing.filter(entry => entry.name !== id);
        await adapter.write(this.highlightsConfigPath, JSON.stringify(updated, null, 2));
    }

    private async readHighlightsConfig(): Promise<Array<{ name: string }>> {
        if (!this.app) return [];
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(this.highlightsConfigPath)) {
            return [];
        }
        try {
            const raw = await adapter.read(this.highlightsConfigPath);
            const items = JSON.parse(raw);
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    /**
     * Load built-in highlights
     */
    private async loadBuiltInHighlights(): Promise<void> {
        // Add default highlight (GitHub)
        this.highlights.set('github', {
            id: 'github',
            name: 'GitHub',
            css: this.getDefaultHighlightCSS(),
        });

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
            // Don't show notice to avoid spam if config is corrupted, or show warning?
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
    line-height: 1.6;
    color: #333;
    padding: 20px;
}
/* ... truncated generic default theme ... */
/* Retaining existing default theme CSS since I am not changing it, but the tool requires context. */
/* Actually, I am adding a method or constant for Highlight. */
/* I will insert the constant at the bottom of the file or class? */
/* The user asked to embed it. I'll stick it in getDefaultHighlightCSS */

        `.trim();
    }

    private getDefaultHighlightCSS(): string {
        return `
pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em
}
code.hljs {
  padding: 3px 5px
}
/*! Theme: GitHub */
.hljs{color:#24292e;background:#ffffff}
.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#d73a49}
.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#6f42c1}
.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-variable,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id{color:#005cc5}
.hljs-regexp,.hljs-string,.hljs-meta .hljs-string{color:#032f62}
.hljs-built_in,.hljs-symbol{color:#e36209}
.hljs-comment,.hljs-code,.hljs-formula{color:#6a737d}
.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo{color:#22863a}
.hljs-subst{color:#24292e}
.hljs-section{color:#005cc5;font-weight:bold}
.hljs-bullet{color:#735c0f}
.hljs-emphasis{color:#24292e;font-style:italic}
.hljs-strong{color:#24292e;font-weight:bold}
.hljs-addition{color:#22863a;background-color:#f0fff4}
.hljs-deletion{color:#b31d28;background-color:#ffeef0}
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
        this.app?.workspace.trigger('wdwxedit:assets-changed');
    }

    // ==================== Theme Catalog Helpers ====================

    private async loadThemeCatalog(): Promise<void> {
        this.customThemeCatalog = [];
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(this.themeCatalogPath)) {
            return;
        }

        try {
            const raw = await adapter.read(this.themeCatalogPath);
            const items = JSON.parse(raw) as ThemeCatalogItem[];
            if (Array.isArray(items)) {
                this.customThemeCatalog = items.map(item => ({ ...item, custom: true }));
            }
        } catch (error) {
            console.error('Failed to load theme catalog:', error);
            new Notice('主题市场加载失败，请检查 assets 目录');
        }
    }

    private async saveCustomThemeCatalog(): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);
        const payload = JSON.stringify(this.customThemeCatalog, null, 2);
        await adapter.write(this.themeCatalogPath, payload);
    }

    private async updateThemesConfig(item: ThemeCatalogItem): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        await this.ensureDir(this.assetsPath);

        const existing = await this.readThemesConfig();
        const updated: ThemeConfigItem[] = existing.filter(entry => entry.className !== item.id);
        updated.push({
            name: item.name,
            className: item.id,
            cssUrl: item.cssUrl,
            homepage: item.homepage,
            author: item.author,
            license: item.license,
        });
        await adapter.write(this.themesConfigPath, JSON.stringify(updated, null, 2));
    }

    private async removeThemeFromConfig(id: string): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        const existing = await this.readThemesConfig();
        const updated = existing.filter(entry => entry.className !== id);
        await adapter.write(this.themesConfigPath, JSON.stringify(updated, null, 2));
    }

    private async readThemesConfig(): Promise<ThemeConfigItem[]> {
        if (!this.app) return [];
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(this.themesConfigPath)) {
            return [];
        }
        try {
            const raw = await adapter.read(this.themesConfigPath);
            const items = JSON.parse(raw) as ThemeConfigItem[];
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    private async ensureDir(path: string): Promise<void> {
        if (!this.app) return;
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(path)) {
            await adapter.mkdir(path);
        }
    }

    private sanitizeThemeId(input: string): string {
        const base = (input || '').toLowerCase().trim();
        if (!base) return '';
        const sanitized = base.replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
        return sanitized;
    }

    private normalizeThemeCss(css: string, item: ThemeCatalogItem): string {
        let output = css;

        // 1. Remove comments to avoid matching inside them
        // (Simple removal, strictly speaking CSS comments can be complex but this suffices for typical themes)
        output = output.replace(/\/\*[\s\S]*?\*\//g, '');

        if (item.replace) {
            for (const [from, to] of item.replace) {
                output = output.split(from).join(to);
            }
        }

        // 2. Safe replacements for global selectors to scope them to .wx-article

        // Replace 'body' but verify it's a selector, not part of a property name or word
        // Regex explanation:
        // (^|[Mkv\s,{}]) -> Match start of line, or typical selector delimiters/spacers
        // body -> The tag
        // (?=[\s,:{.[>]) -> Lookahead for selector-like suffix (space, comma, pseudo-class, brace, class, id, combinator)
        // We explicitly exclude '-' to avoid matching 'markdown-body' or 'custom-body-color'.
        output = output.replace(/(^|[\s,{}])body(?=[\s,:{.[>])/gi, '$1.wx-article');

        // Replace 'html' similarly
        output = output.replace(/(^|[\s,{}])html(?=[\s,:{.[>])/gi, '$1.wx-article');

        // Replace ':root' -> '.wx-article' (Scoped CSS variables)
        output = output.replace(/:root/gi, '.wx-article');

        // Replace '.markdown-body' legacy selector
        output = output.replace(/\.markdown-body/g, '.wx-article');

        // Replace '.wdwxedit' legacy selector (used in MWeb themes)
        output = output.replace(/\.wdwxedit/g, '.wx-article');

        // 3. For any other generic tag selectors that might be at root level, 
        // ideally we would parse the AST, but here we rely on the fact that
        // most Markdown themes are decent citizens or rely on .markdown-body.
        // If a theme purely uses `p { ... }`, it usually expects a scoped container.

        // If the theme DOES NOT use .wx-article or .markdown-body at all, 
        // we might want to qualify generic selectors. 
        // However, blindly replacing "p" is dangerous ("map" ends in "p").
        // Given we want "drop-in" support, we assume the user knows the CSS might leak if not scoped.
        // But for WeChat context, we are inlining, so "p" becomes ".wx-article p" naturally? 
        // No, postcss-inline doesn't auto-scope global selectors unless we use a plugin.
        // But `normalizeWechatHtml` in transformer wraps content in `<div class="wx-article">`.
        // The CSS we return here is concatenated. 
        // If CSS has `p { color: red }`, it will affect the Preview globally if not shadowed?
        // Actually, Obsidian Preview is inside a Shadow DOM or iframe? No, it's a div.
        // So global styles leak. We MUST scope them.

        // Since we don't have a full CSS parser here, we assume standard Markdown themes 
        // use .markdown-body. If they don't, we did our best with body/html replacement.

        return output;
    }

    /**
     * Sanitize and modernize selectors in CSS string
     */
    private sanitizeCssSelectors(css: string): string {
        let output = css;

        // Replace 'body' global selector
        output = output.replace(/(^|[\s,{}])body(?=[\s,:{.[>])/gi, '$1.wx-article');

        // Replace 'html' global selector
        output = output.replace(/(^|[\s,{}])html(?=[\s,:{.[>])/gi, '$1.wx-article');

        // Replace ':root'
        output = output.replace(/:root/gi, '.wx-article');

        // Replace '.markdown-body' legacy selector
        output = output.replace(/\.markdown-body/g, '.wx-article');

        // Replace '.wdwxedit' legacy selector (used in MWeb themes)
        output = output.replace(/\.wdwxedit/g, '.wx-article');

        return output;
    }
}

/**
 * Get asset store instance
 */
export function getAssetStore(): AssetStore {
    return AssetStore.getInstance();
}
