/**
 * Publish View
 * 
 * Main view for previewing and publishing articles to WeChat.
 */

import { ItemView, WorkspaceLeaf, Notice, setIcon, Menu, MarkdownView, type TFile, type EventRef } from 'obsidian';
import type AIWXEditPlugin from '../../plugin';
import { getPreviewService, PreviewService } from '../../application';
import { StyleEditor, type StyleEditorEvents, BUILTIN_THEMES, BUILTIN_HIGHLIGHTS } from '../components';
import { getSettingsStore, getAssetStore } from '../../infrastructure/storage';
import { PublishModal } from '../modals/PublishModal';
import { replaceChildrenWithHtml } from '../../utils/dom';
import { ThemePickerModal } from '../modals/ThemePickerModal';
import { PreviewScrollSync } from '../components/PreviewScrollSync';
import { normalizePreviewPreferences, readingStats } from '../../utils/previewPresentation';
import type { PreviewPreferences } from '../../types/settings.types';

export const VIEW_TYPE_PUBLISH = 'aiwxedit-publish-view';

/**
 * Publish View
 * 
 * Displays article preview and publishing controls.
 */
export class PublishView extends ItemView {
    private plugin: AIWXEditPlugin;
    private previewService: PreviewService;
    private previewEl: HTMLElement | null = null;
    private toolbarEl: HTMLElement | null = null;
    private styleEditor: StyleEditor | null = null;
    private styleEditorContainer: HTMLElement | null = null;
    private stageEl: HTMLElement | null = null;
    private paperEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private themeButton: HTMLButtonElement | null = null;
    private styleButton: HTMLButtonElement | null = null;
    private scrollSync: PreviewScrollSync | null = null;
    private renderTimer: number | null = null;
    private currentPath = '';
    private lastHtml = '';
    private exportBusy = false;

    constructor(leaf: WorkspaceLeaf, plugin: AIWXEditPlugin) {
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

        // Refresh toolbar when settings change (e.g. accounts added/edited)
        const offSettings = getSettingsStore().addListener(() => {
            this.updateThemeButton();
            this.applyPreviewPreferences();
        });
        this.register(() => offSettings());

        // Subscribe to preview changes
        const offPreview = this.previewService.addListener((state) => {
            if (this.stageEl) this.stageEl.setAttribute('aria-busy', String(state.isLoading));
            if (state.isLoading) {
                if (this.statusEl) this.statusEl.textContent = '正在更新预览…';
                return;
            }
            const changedFile = this.currentPath !== (state.file?.path ?? '');
            this.currentPath = state.file?.path ?? '';
            const html = state.article?.styledHtmlContent || '';
            if (html !== this.lastHtml || changedFile) this.updatePreview(html);
            if (changedFile && this.stageEl) this.stageEl.scrollTop = 0;
            this.updateStatus();
            this.configureScrollSync();
        });
        this.register(offPreview);

        // Watch for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', leaf => {
                void this.onActiveFileChange(leaf);
            })
        );
        this.registerEvent(this.app.workspace.on('file-open', file => {
            if (file?.extension === 'md') void this.previewFile(file);
        }));
        this.registerEvent(this.app.workspace.on('layout-change', () => this.configureScrollSync()));
        this.registerEvent(this.app.workspace.on('editor-change', (_editor, info) => {
            if (info.file?.path === this.previewService.getState().file?.path) this.scheduleRefresh();
        }));
        this.registerEvent(this.app.vault.on('modify', file => {
            if (file.path === this.previewService.getState().file?.path) this.scheduleRefresh();
        }));
        this.registerEvent(this.app.vault.on('delete', file => {
            if (file.path === this.previewService.getState().file?.path) void this.previewService.setFile(null);
        }));
        this.register(() => {
            if (this.renderTimer !== null) window.clearTimeout(this.renderTimer);
            this.scrollSync?.dispose();
        });

        // Watch for asset changes (theme install/uninstall)
        const workspace = this.app.workspace as unknown as {
            on: (name: string, callback: () => void) => EventRef;
        };
        this.registerEvent(
            workspace.on('wdwxedit:assets-changed', () => {
                this.refreshStyleEditor();
            })
        );

        // Initial render
        void this.onActiveFileChange();
    }

    onClose(): Promise<void> {
        if (this.renderTimer !== null) window.clearTimeout(this.renderTimer);
        this.scrollSync?.dispose();
        this.contentEl.empty();
        return Promise.resolve();
    }

    /**
     * Build the view UI
     */
    private buildUI(): void {
        this.contentEl.empty();
        this.contentEl.addClass('wdwxedit-publish-view');
        const reveal = this.contentEl.createEl('button', { text: '显示工具栏', cls: 'wdwxedit-reveal-toolbar', attr: { 'aria-label': '退出专注阅读，显示工具栏' } });
        setIcon(reveal.createSpan(), 'panel-top-open');
        reveal.addEventListener('click', () => { void this.savePreviewPreferences({ focusMode: false }); });

        // Top bar (toolbar + style row)
        const topBar = this.contentEl.createDiv({ cls: 'wdwxedit-topbar' });

        // Toolbar buttons
        this.toolbarEl = topBar.createDiv({ cls: 'wdwxedit-preview-toolbar' });
        this.buildToolbar(this.toolbarEl);

        // Style editor
        this.styleEditorContainer = topBar.createDiv({ cls: 'wdwxedit-style-editor-container' });
        this.styleEditorContainer.hidden = true;
        this.buildStyleEditor(this.styleEditorContainer);

        // Preview container
        this.stageEl = this.contentEl.createDiv({ cls: 'wdwxedit-preview', attr: { role: 'region', 'aria-label': '文章阅读预览', tabindex: '0' } });
        this.paperEl = this.stageEl.createDiv({ cls: 'wdwxedit-preview-paper' });
        const shadow = this.paperEl.attachShadow({ mode: 'open' });
        this.previewEl = createDiv();
        shadow.appendChild(this.previewEl);
        this.statusEl = this.stageEl.createDiv({ cls: 'wdwxedit-preview-status', attr: { role: 'status', 'aria-live': 'polite' } });
        this.scrollSync = new PreviewScrollSync(this.app, this.stageEl);
        this.applyPreviewPreferences();
        this.registerDomEvent(this.contentEl, 'keydown', event => {
            if (event.key === 'Escape' && this.styleEditorContainer && !this.styleEditorContainer.hidden) {
                this.styleEditorContainer.hidden = true;
                this.styleButton?.setAttribute('aria-expanded', 'false');
                this.styleButton?.focus();
                event.stopPropagation();
            }
        });
        replaceChildrenWithHtml(
            this.previewEl,
            '<p>打开一个 Markdown 文件以预览</p>'
        );
    }

    /**
     * Update dynamic styles for theme switching
     */
    private updateDynamicStyles(): void {
        // Reserved for future theme switching. Avoid injecting <style> tags; Obsidian loads styles.css.
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
        const theme = container.createEl('button', { cls: 'wdwxedit-preview-theme', attr: { 'aria-label': '搜索文章主题' } });
        this.themeButton = theme;
        this.updateThemeButton();
        theme.addEventListener('click', () => {
            const themes = [...BUILTIN_THEMES];
            getAssetStore().getThemes().forEach(item => {
                if (!themes.some(theme => theme.className === item.id)) themes.push({ name: item.name, className: item.id });
            });
            new ThemePickerModal(this.app, themes, selected => {
                void this.applyTheme(selected.className).catch(error => new Notice(error instanceof Error ? error.message : '主题保存失败'));
            }).open();
        });
        const actions = container.createDiv({ cls: 'wdwxedit-preview-actions' });
        const action = (icon: string, title: string, callback: (event: MouseEvent) => void, label?: string) => {
            const button = actions.createEl('button', { cls: 'wdwxedit-preview-action', attr: { 'aria-label': title, title } });
            setIcon(button.createSpan(), icon);
            if (label) button.createSpan({ text: label, cls: 'wdwxedit-action-label' });
            button.addEventListener('click', callback);
            return button;
        };
        this.styleButton = action('type', '调整文章排版', () => {
            if (!this.styleEditorContainer) return;
            this.styleEditorContainer.hidden = !this.styleEditorContainer.hidden;
            this.styleButton?.setAttribute('aria-expanded', String(!this.styleEditorContainer.hidden));
        });
        this.styleButton.setAttribute('aria-expanded', 'false');
        action('smartphone', '切换预览宽度', event => {
            const menu = new Menu();
            const value = this.preferences().width;
            for (const [mode, title] of [['mobile', '手机 · 390px'], ['desktop', '桌面 · 768px'], ['fluid', '适应面板']] as const) {
                menu.addItem(item => item.setTitle(title).setChecked(value === mode).onClick(() => this.savePreviewPreferences({ width: mode })));
            }
            menu.showAtMouseEvent(event);
        });
        action('ellipsis', '更多预览操作', event => this.openPreviewMenu(event));
        const copy = action('copy', '复制到剪贴板', () => {
            copy.disabled = true;
            void this.copyToClipboard().finally(() => { copy.disabled = false; });
        }, '复制');
        const publish = action('send', '发布到公众号', () => {
            publish.disabled = true;
            void this.publish().finally(() => { publish.disabled = false; });
        }, '发布');
        publish.addClass('wdwxedit-preview-publish');
    }

    private preferences(): PreviewPreferences {
        return normalizePreviewPreferences(getSettingsStore().getAll().preview);
    }

    private async savePreviewPreferences(updates: Partial<PreviewPreferences>): Promise<void> {
        try { await getSettingsStore().update({ preview: { ...this.preferences(), ...updates } }); }
        catch (error) { new Notice(error instanceof Error ? error.message : '预览偏好保存失败'); }
    }

    private applyPreviewPreferences(): void {
        const preferences = this.preferences();
        this.contentEl.dataset.previewWidth = preferences.width;
        this.contentEl.toggleClass('is-focus-reading', preferences.focusMode);
        if (preferences.focusMode && this.styleEditorContainer) {
            this.styleEditorContainer.hidden = true;
            this.styleButton?.setAttribute('aria-expanded', 'false');
        }
        this.configureScrollSync();
        this.updateStatus();
    }

    private updateThemeButton(): void {
        if (!this.themeButton) return;
        const value = getSettingsStore().getStyleConfig().theme;
        const label = getAssetStore().getThemes().find(theme => theme.id === value)?.name
            ?? BUILTIN_THEMES.find(theme => theme.className === value)?.name ?? value;
        this.themeButton.empty();
        setIcon(this.themeButton.createSpan(), 'palette');
        this.themeButton.createSpan({ text: label, cls: 'wdwxedit-preview-theme-name' });
        setIcon(this.themeButton.createSpan(), 'chevron-down');
    }

    private async applyTheme(themeId: string): Promise<void> {
        const preset = BUILTIN_THEMES.find(theme => theme.className === themeId)?.styles;
        await getSettingsStore().updateStyleConfig({ theme: themeId,
            ...(preset?.primaryColor ? { primaryColor: preset.primaryColor } : {}),
            ...(preset?.fontFamily ? { fontFamily: preset.fontFamily } : {}),
        });
        this.refreshStyleEditor();
        await this.refreshFromSource();
    }

    private openPreviewMenu(event: MouseEvent): void {
        const menu = new Menu();
        const preferences = this.preferences();
        menu.addItem(item => item.setTitle('同步滚动').setIcon('arrow-down-up').setChecked(preferences.syncScroll)
            .onClick(() => this.savePreviewPreferences({ syncScroll: !preferences.syncScroll })));
        menu.addItem(item => item.setTitle('专注阅读').setIcon('scan-text').setChecked(preferences.focusMode)
            .onClick(() => this.savePreviewPreferences({ focusMode: !preferences.focusMode })));
        menu.addSeparator();
        menu.addItem(item => item.setTitle('刷新预览').setIcon('refresh-cw').onClick(() => this.refresh()));
        menu.addItem(item => item.setTitle('回到文章顶部').setIcon('arrow-up-to-line').onClick(() => { this.stageEl?.scrollTo({ top: 0 }); }));
        menu.addSeparator();
        menu.addItem(item => item.setTitle('导出 HTML 文件').setIcon('file-code').setDisabled(this.exportBusy || !this.previewService.getState().article)
            .onClick(() => this.exportHTML()));
        menu.showAtMouseEvent(event);
    }

    private sourceView(file: TFile): MarkdownView | null {
        const active = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (active?.file?.path === file.path) return active;
        const views = this.app.workspace.getLeavesOfType('markdown').map(leaf => leaf.view);
        const matches = views.filter((view): view is MarkdownView => view instanceof MarkdownView && view.file?.path === file.path);
        return matches.find(view => view.containerEl.clientHeight > 0) ?? matches[0] ?? null;
    }

    async previewFile(file: TFile | null): Promise<void> {
        await this.previewService.setFile(file, file ? this.sourceView(file)?.editor?.getValue() : undefined);
    }

    private configureScrollSync(): void {
        this.scrollSync?.configure(this.previewService.getState().file?.path ?? '', this.preferences().syncScroll);
    }

    private scheduleRefresh(): void {
        if (this.renderTimer !== null) window.clearTimeout(this.renderTimer);
        this.renderTimer = window.setTimeout(() => {
            this.renderTimer = null;
            void this.refreshFromSource();
        }, 180);
    }

    private async refreshFromSource(): Promise<void> {
        if (this.renderTimer !== null) { window.clearTimeout(this.renderTimer); this.renderTimer = null; }
        const file = this.previewService.getState().file;
        if (file) await this.previewService.setFile(file, this.sourceView(file)?.editor?.getValue());
    }

    private updateStatus(): void {
        if (!this.statusEl || !this.previewEl) return;
        const state = this.previewService.getState();
        if (state.isLoading) { this.statusEl.textContent = '正在更新预览…'; return; }
        if (!state.article) { this.statusEl.textContent = state.file ? '预览失败，请刷新重试' : ''; return; }
        const { words, minutes } = readingStats(this.previewEl.textContent ?? '');
        const width = this.preferences().width;
        const mode = width === 'mobile' ? '手机 390px' : width === 'desktop' ? '桌面 768px' : '适应面板';
        this.statusEl.textContent = `${words.toLocaleString()} 字 · 约 ${minutes} 分钟 · ${mode}${this.preferences().syncScroll ? ' · 同步滚动' : ''}`;
    }

    private async exportHTML(): Promise<void> {
        if (this.exportBusy) return;
        this.exportBusy = true;
        try {
            await this.refreshFromSource();
            const path = await this.previewService.exportHTML();
            new Notice(`已导出 ${path}（本地图片已内嵌，远程图片仍需联网）`);
        } catch (error) { new Notice(error instanceof Error ? error.message : '导出失败'); }
        finally { this.exportBusy = false; }
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
            onThemeChanged: (themeClassName) => {
                void (async () => {
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
                    await this.refreshFromSource();
                })();
            },
            onHighlightChanged: (highlight) => {
                void (async () => {
                    await getSettingsStore().updateStyleConfig({ highlight });
                    this.updateDynamicStyles();
                    await this.refreshFromSource();
                })();
            },
            onFontChanged: (font) => {
                void (async () => {
                    await getSettingsStore().updateStyleConfig({ fontFamily: font });
                    this.updateDynamicStyles();
                    await this.refreshFromSource();
                })();
            },
            onFontSizeChanged: (size) => {
                void (async () => {
                    await getSettingsStore().updateStyleConfig({ fontSize: size });
                    this.updateDynamicStyles();
                    await this.refreshFromSource();
                })();
            },
            onPrimaryColorChanged: (color) => {
                void (async () => {
                    await getSettingsStore().updateStyleConfig({ primaryColor: color });
                    this.updateDynamicStyles();
                    await this.refreshFromSource();
                })();
            },
            onCustomCSSChanged: (css) => {
                void (async () => {
                    await getSettingsStore().updateStyleConfig({ customCSS: css });
                    await this.refreshFromSource();
                })();
            },
            onStyleReset: () => {
                void (async () => {
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
                    await this.refreshFromSource();
                    new Notice('样式已重置');
                })();
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
    private async onActiveFileChange(leaf?: WorkspaceLeaf | null): Promise<void> {
        if (leaf && !(leaf.view instanceof MarkdownView)) { this.configureScrollSync(); return; }
        const activeFile = leaf?.view instanceof MarkdownView ? leaf.view.file : this.app.workspace.getActiveFile();

        if (activeFile && activeFile.extension === 'md') {
            await this.previewFile(activeFile);
        }
    }

    /**
     * Refresh preview
     */
    private async refresh(): Promise<void> {
        await this.refreshFromSource();
        new Notice('预览已刷新');
    }

    /**
     * Update preview content
     */
    private updatePreview(html: string): void {
        if (!this.previewEl) return;
        this.lastHtml = html;
        const scrollTop = this.stageEl?.scrollTop ?? 0;

        if (!html) {
            this.paperEl?.setCssProps({ '--aiwxedit-paper-background': '#ffffff' });
            replaceChildrenWithHtml(
                this.previewEl,
                '<p>打开一个 Markdown 文件以预览</p>'
            );
            return;
        }

        replaceChildrenWithHtml(this.previewEl, html);
        const root = this.previewEl.querySelector<HTMLElement>('.wx-article');
        const background = root ? getComputedStyle(root).backgroundColor : '';
        this.paperEl?.setCssProps({ '--aiwxedit-paper-background': background && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)' ? background : '#ffffff' });
        if (this.stageEl) this.stageEl.scrollTop = scrollTop;
    }

    /**
     * Copy to clipboard
     */
    private async copyToClipboard(): Promise<void> {
        await this.refreshFromSource();
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

        try {
            await this.sourceView(state.file)?.save();
            await this.refreshFromSource();
        } catch (error) {
            new Notice(error instanceof Error ? error.message : '笔记保存失败');
            return;
        }
        const current = this.previewService.getState();
        if (current.file?.path !== state.file.path || !current.article) return;

        new PublishModal(this.app, state.file, {
            article: current.article,
            onPublished: () => {
                void this.refresh();
            },
        }).open();
    }
}
