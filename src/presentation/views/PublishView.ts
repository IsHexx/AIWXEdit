/**
 * Publish View
 * 
 * Main view for previewing and publishing articles to WeChat.
 */

import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView } from 'obsidian';
import type WDWXEditPlugin from '../../plugin';
import { getPreviewService, PreviewService } from '../../application';
import { StyleEditor, type StyleEditorEvents, BUILTIN_THEMES, BUILTIN_HIGHLIGHTS } from '../components';
import { getSettingsStore, getAssetStore } from '../../infrastructure/storage';
import { PublishModal } from '../modals/PublishModal';

export const VIEW_TYPE_PUBLISH = 'wdwxedit-publish-view';

/**
 * Publish View
 * 
 * Displays article preview and publishing controls.
 */
export class PublishView extends ItemView {
    private plugin: WDWXEditPlugin;
    private previewService: PreviewService;
    private previewEl: HTMLElement | null = null;
    private toolbarEl: HTMLElement | null = null;
    private styleEditor: StyleEditor | null = null;
    private styleEditorContainer: HTMLElement | null = null;
    private dynamicStyleEl: HTMLStyleElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: WDWXEditPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.previewService = getPreviewService();
    }

    getViewType(): string {
        return VIEW_TYPE_PUBLISH;
    }

    getDisplayText(): string {
        return '发布预览';
    }

    getIcon(): string {
        return 'fish-symbol';
    }

    async onOpen(): Promise<void> {
        // Initialize preview service
        await this.previewService.initialize(this.app);

        // Build UI
        this.buildUI();

        // Subscribe to preview changes
        this.previewService.addListener((state) => {
            this.updatePreview(state.article?.styledHtmlContent || '');
        });

        // Watch for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.onActiveFileChange();
            })
        );

        // Initial render
        this.onActiveFileChange();
    }

    async onClose(): Promise<void> {
        this.contentEl.empty();
    }

    /**
     * Build the view UI
     */
    private buildUI(): void {
        this.contentEl.empty();
        this.contentEl.addClass('wdwxedit-publish-view');

        // Dynamic style element for theme switching
        this.dynamicStyleEl = this.contentEl.createEl('style', { cls: 'wdwxedit-dynamic-styles' });
        this.updateDynamicStyles();

        // Toolbar buttons
        this.toolbarEl = this.contentEl.createDiv({ cls: 'wdwxedit-toolbar' });
        this.buildToolbar(this.toolbarEl);

        // Style editor
        this.styleEditorContainer = this.contentEl.createDiv({ cls: 'wdwxedit-style-editor-container' });
        this.buildStyleEditor(this.styleEditorContainer);

        // Preview container
        this.previewEl = this.contentEl.createDiv({ cls: 'wdwxedit-preview' });
        this.previewEl.innerHTML = `
            <div class="wdwxedit-empty-state">
                <p>打开一个 Markdown 文件以预览</p>
            </div>
        `;
    }

    /**
     * Update dynamic styles for theme switching
     */
    private updateDynamicStyles(): void {
        if (!this.dynamicStyleEl) return;

        // Keep preview styles aligned with published HTML (inline styles).
        this.dynamicStyleEl.textContent = '';
    }

    /**
     * Scope CSS to a container selector (best-effort).
     */
    private scopeCss(css: string, scope: string): string {
        if (!css) return '';
        const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
        return cleaned.replace(/(^|})\s*([^@}{][^{]+)\{/g, (match, end, selector) => {
            const scopedSelector = selector.split(',')
                .map((sel: string) => {
                    const trimmed = sel.trim();
                    if (!trimmed) return '';
                    if (trimmed === 'body' || trimmed === 'html' || trimmed === ':root') {
                        return scope;
                    }
                    if (trimmed.startsWith(scope)) {
                        return trimmed;
                    }
                    return `${scope} ${trimmed}`;
                })
                .filter(Boolean)
                .join(', ');
            return `${end}\n${scopedSelector}{`;
        });
    }

    /**
     * Build style editor
     */
    private buildStyleEditor(container: HTMLElement): void {
        const styleConfig = getSettingsStore().getStyleConfig();
        const assetStore = getAssetStore();
        const themes = [...BUILTIN_THEMES];
        assetStore.getThemes().forEach(theme => {
            if (!themes.find(t => t.className === theme.id)) {
                themes.push({ name: theme.name, className: theme.id });
            }
        });
        const highlights = [...BUILTIN_HIGHLIGHTS];
        assetStore.getHighlights().forEach(highlight => {
            if (!highlights.find(h => h.className === highlight.id)) {
                highlights.push({ name: highlight.name, className: highlight.id });
            }
        });

        const events: StyleEditorEvents = {
            onThemeChanged: async (themeClassName) => {
                const theme = BUILTIN_THEMES.find(t => t.className === themeClassName);
                if (theme?.styles) {
                    const styles = theme.styles;
                    if (styles.primaryColor) {
                        await getSettingsStore().updateStyleConfig({ primaryColor: styles.primaryColor });
                    }
                    if (styles.fontFamily) {
                        await getSettingsStore().updateStyleConfig({ fontFamily: styles.fontFamily });
                    }
                }
                await getSettingsStore().updateStyleConfig({ theme: themeClassName });
                this.updateDynamicStyles();
                await this.previewService.refresh();
            },
            onHighlightChanged: async (highlight) => {
                await getSettingsStore().updateStyleConfig({ highlight });
                this.updateDynamicStyles();
                await this.previewService.refresh();
            },
            onFontChanged: async (font) => {
                await getSettingsStore().updateStyleConfig({ fontFamily: font });
                this.updateDynamicStyles();
                await this.previewService.refresh();
            },
            onFontSizeChanged: async (size) => {
                await getSettingsStore().updateStyleConfig({ fontSize: size });
                this.updateDynamicStyles();
                await this.previewService.refresh();
            },
            onPrimaryColorChanged: async (color) => {
                await getSettingsStore().updateStyleConfig({ primaryColor: color });
                this.updateDynamicStyles();
                await this.previewService.refresh();
            },
        };

        this.styleEditor = new StyleEditor(container, events, styleConfig, {
            themes,
            highlights,
        });
        this.styleEditor.render();
    }

    /**
     * Refresh style editor theme list (after download/remove)
     */
    refreshStyleEditor(): void {
        if (!this.styleEditorContainer) return;
        this.styleEditorContainer.empty();
        this.styleEditor = null;
        this.buildStyleEditor(this.styleEditorContainer);
    }
    private buildToolbar(container: HTMLElement): void {
        // Refresh button
        const refreshBtn = container.createEl('button', {
            cls: 'wdwxedit-btn',
            text: '🔄 刷新',
        });
        refreshBtn.addEventListener('click', () => this.refresh());

        // Copy button
        const copyBtn = container.createEl('button', {
            cls: 'wdwxedit-btn',
            text: '📋 复制',
        });
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Publish button
        const publishBtn = container.createEl('button', {
            cls: 'wdwxedit-btn wdwxedit-btn-primary',
            text: '📤 发布',
        });
        publishBtn.addEventListener('click', () => this.publish());
    }

    /**
     * Handle active file change
     */
    private async onActiveFileChange(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();

        if (activeFile && activeFile.extension === 'md') {
            await this.previewService.setFile(activeFile);
        }
    }

    /**
     * Refresh preview
     */
    private async refresh(): Promise<void> {
        await this.previewService.refresh();
        new Notice('预览已刷新');
    }

    /**
     * Update preview content
     */
    private updatePreview(html: string): void {
        if (!this.previewEl) return;

        if (!html) {
            this.previewEl.innerHTML = `
                <div class="wdwxedit-empty-state">
                    <p>打开一个 Markdown 文件以预览</p>
                </div>
            `;
            return;
        }

        this.previewEl.innerHTML = html;
    }

    /**
     * Copy to clipboard
     */
    private async copyToClipboard(): Promise<void> {
        const success = await this.previewService.copyToClipboard();
        if (success) {
            new Notice('已复制到剪贴板');
        } else {
            new Notice('复制失败');
        }
    }

    /**
     * Publish article
     */
    private async publish(): Promise<void> {
        const state = this.previewService.getState();
        if (!state.file) {
            new Notice('请先打开一个 Markdown 文件');
            return;
        }

        new PublishModal(this.app, state.file, {
            article: state.article || undefined,
            onPublished: () => this.refresh(),
        }).open();
    }
}
