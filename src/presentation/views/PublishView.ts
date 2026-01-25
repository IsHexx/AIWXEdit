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

    private getAccounts() {
        return getSettingsStore().getAll().accounts || [];
    }

    private getDefaultAccountIndex() {
        return getSettingsStore().getAll().defaultAccountIndex || 0;
    }

    /**
     * Build the refined toolbar
     */
    private buildToolbar(container: HTMLElement): void {
        container.empty();

        // Left Section: Account & Cover
        const leftSection = container.createDiv({ cls: 'wdwxedit-toolbar-group' });

        // Account Selector
        const accountGroup = leftSection.createDiv({ cls: 'wdwxedit-toolbar-group' });
        accountGroup.createEl('span', { text: '公众号:', cls: 'wdwxedit-toolbar-label' });

        const accounts = this.getAccounts();
        const accountSelect = accountGroup.createEl('select', { cls: 'wdwxedit-account-select' });

        if (accounts.length === 0) {
            accountSelect.createEl('option', { text: '未配置', value: '-1' });
            accountSelect.disabled = true;
        } else {
            accounts.forEach((acc, idx) => {
                const opt = accountSelect.createEl('option', {
                    text: acc.name || `账号 ${idx + 1}`,
                    value: String(idx)
                });
                if (idx === this.getDefaultAccountIndex()) {
                    opt.selected = true;
                }
            });
            accountSelect.onchange = async () => {
                const idx = parseInt(accountSelect.value);
                await getSettingsStore().update({ defaultAccountIndex: idx });
            };
        }

        // Cover options
        const coverGroup = leftSection.createDiv({ cls: 'wdwxedit-toolbar-group' });
        coverGroup.createEl('span', { text: '封面:', cls: 'wdwxedit-toolbar-label' });

        // Radio group
        const coverOptions = coverGroup.createDiv({ cls: 'wdwxedit-cover-options' });

        // Default radio
        const defaultLabel = coverOptions.createEl('label', { cls: 'wdwxedit-radio-label' });
        const defaultRadio = defaultLabel.createEl('input', { type: 'radio', attr: { name: 'cover-mode' } });
        defaultRadio.checked = true; // Use default logic for now
        defaultLabel.createSpan({ text: '默认' });

        // Upload radio
        const uploadLabel = coverOptions.createEl('label', { cls: 'wdwxedit-radio-label' });
        const uploadRadio = uploadLabel.createEl('input', { type: 'radio', attr: { name: 'cover-mode' } });
        uploadLabel.createSpan({ text: '上传' });

        // Right Section: Buttons
        const rightSection = container.createDiv({ cls: 'wdwxedit-toolbar-right' });

        // Refresh button
        const refreshBtn = rightSection.createEl('button', {
            cls: 'wdwxedit-btn',
            attr: { 'aria-label': '刷新预览' }
        });
        refreshBtn.innerHTML = '🔄'; // Using emoji as icon
        refreshBtn.addEventListener('click', () => this.refresh());

        // Copy button
        const copyBtn = rightSection.createEl('button', {
            cls: 'wdwxedit-btn',
            attr: { 'aria-label': '复制到剪贴板' }
        });
        copyBtn.innerHTML = '📋';
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Publish button (Send)
        const sendBtn = rightSection.createEl('button', {
            cls: 'wdwxedit-btn',
            attr: { 'aria-label': '发布到公众号' }
        });
        sendBtn.innerHTML = '📤';
        sendBtn.addEventListener('click', () => this.publish());
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
            onCustomCSSChanged: async (css) => {
                await getSettingsStore().updateStyleConfig({ customCSS: css });
                await this.previewService.refresh();
            },
            onStyleReset: async () => {
                // Reset to defaults
                await getSettingsStore().updateStyleConfig({
                    theme: 'default',
                    highlight: 'github',
                    fontFamily: '等线',
                    fontSize: '16px',
                    primaryColor: '#1a73e8',
                    customCSS: ''
                });
                // Re-render editor
                this.refreshStyleEditor();
                this.updateDynamicStyles();
                await this.previewService.refresh();
                new Notice('样式已重置');
            }
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
