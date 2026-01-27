/**
 * AIWXEdit V5 - Plugin Entry Point
 * 
 * Main plugin class that handles lifecycle and coordinates all modules.
 * 
 * @author IsHexx
 * @license MIT
 */

import { Plugin, WorkspaceLeaf, App, PluginManifest, TFile, Notice } from 'obsidian';
import type { PluginSettings } from './types/settings.types';
import { SettingsStore, getSettingsStore, AssetStore, getAssetStore } from './infrastructure/storage';
import { PublishView, VIEW_TYPE_PUBLISH, SettingsTab, PublishModal } from './presentation';
import type { ParsedArticle } from './types/article.types';
import { getPublishService, getPreviewService, getAIService } from './application';
import { getArticleTransformer } from './domain/article';

/**
 * AIWXEdit Plugin
 * 
 * Obsidian plugin for publishing notes to WeChat Official Account.
 * Features include:
 * - Markdown rendering with WeChat-compatible styling
 * - Local image upload
 * - AI-powered title and cover generation
 * - Multiple account support
 */
export default class AIWXEditPlugin extends Plugin {
    /** Settings store instance */
    private settingsStore: SettingsStore;

    /** Asset store instance */
    private assetStore: AssetStore;

    /** Flag indicating if plugin is fully initialized */
    private isInitialized = false;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);

        // Initialize stores
        this.settingsStore = getSettingsStore();
        this.settingsStore.initialize(this);

        this.assetStore = getAssetStore();
        this.assetStore.initialize(app, manifest);
    }

    /**
     * Plugin load lifecycle hook
     * Called when the plugin is enabled
     */
    async onload(): Promise<void> {
        console.debug('AIWXEdit V5: Loading plugin...');

        // Load settings and assets
        await this.settingsStore.load();
        await this.assetStore.load();

        // Wait for workspace to be ready before registering views
        this.app.workspace.onLayoutReady(() => {
            void this.initializePlugin();
        });
    }

    /**
     * Initialize plugin after workspace is ready
     */
    private async initializePlugin(): Promise<void> {
        try {
            // Initialize application services
            const articleTransformer = getArticleTransformer();
            articleTransformer.initialize(this.app);
            await articleTransformer.setup();

            getPublishService().initialize(this.app);
            await getPreviewService().initialize(this.app);
            getAIService().initialize();

            // Register the publish view
            this.registerView(VIEW_TYPE_PUBLISH, (leaf) => new PublishView(leaf, this));

            // Add ribbon icon
            const ribbonIconEl = this.addRibbonIcon(
                'fish-symbol',
                '发布到公众号',
                () => this.activateView()
            );
            ribbonIconEl.addClass('wdwxedit-ribbon-icon');

            // Register commands
            this.addCommand({
                id: 'open-publish-view',
                name: '打开发布视图',
                callback: () => this.activateView(),
            });

            this.addCommand({
                id: 'publish-current-note',
                name: '发布当前笔记',
                callback: () => this.publishCurrentNote(),
            });

            // Register settings tab
            this.addSettingTab(new SettingsTab(this.app, this));

            // Register file menu
            this.registerEvent(
                this.app.workspace.on('file-menu', (menu, file) => {
                    if (file instanceof TFile && file.extension === 'md') {
                        menu.addItem((item) => {
                            item.setTitle('发布到公众号')
                                .setIcon('fish-symbol')
                                .onClick(() => this.publishFile(file));
                        });
                    }
                })
            );

            this.isInitialized = true;
            console.debug('AIWXEdit V5: Plugin initialized successfully');
        } catch (error) {
            console.error('AIWXEdit V5: Failed to initialize plugin:', error);
            new Notice('插件初始化失败');
        }
    }

    /**
     * Plugin unload lifecycle hook
     * Called when the plugin is disabled
     */
    onunload(): void {
        console.debug('AIWXEdit V5: Unloading plugin...');
    }

    /**
     * Load plugin settings from disk
     * @deprecated Use settingsStore.load() directly
     */
    async loadSettings(): Promise<void> {
        await this.settingsStore.load();
    }

    /**
     * Save plugin settings to disk
     * @deprecated Use settingsStore.save() directly
     */
    async saveSettings(): Promise<void> {
        await this.settingsStore.save();

        // Refresh views if initialized
        if (this.isInitialized) {
            this.refreshViews();
        }
    }

    /**
     * Activate the publish view
     * Creates the view if it doesn't exist, or reveals it if it does
     */
    async activateView(): Promise<void> {
        // Ensure workspace is ready
        if (!this.app.workspace.layoutReady) {
            this.app.workspace.onLayoutReady(() => {
                setTimeout(() => void this.activateView(), 100);
            });
            return;
        }

        const { workspace } = this.app;

        // Check for existing view
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PUBLISH);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            // Create new leaf in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: VIEW_TYPE_PUBLISH,
                    active: true,
                });
            }
        }

        if (leaf) {
            await workspace.revealLeaf(leaf);
        }
    }

    /**
     * Publish the currently active note
     */
    async publishCurrentNote(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('请先打开一个 Markdown 文件');
            return;
        }

        if (activeFile.extension !== 'md') {
            new Notice('只能发布 Markdown 文件');
            return;
        }

        const article = await this.getArticle(activeFile);
        new PublishModal(this.app, activeFile, {
            article,
        }).open();
    }

    /**
     * Publish a specific file
     */
    async publishFile(file: TFile): Promise<void> {
        const article = await this.getArticle(file);
        new PublishModal(this.app, file, {
            article,
        }).open();
    }

    /**
     * Refresh all publish views
     */
    private refreshViews(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PUBLISH);
        for (const leaf of leaves) {
            // TODO: Call refresh on view
        }
    }

    private async getArticle(file: TFile): Promise<ParsedArticle | undefined> {
        try {
            const transformer = getArticleTransformer();
            transformer.initialize(this.app);
            await transformer.setup();
            return await transformer.transformFile(file);
        } catch (error) {
            console.error('Failed to parse article for publish:', error);
            return undefined;
        }
    }

    /**
     * Get current settings
     */
    getSettings(): PluginSettings {
        return this.settingsStore.getAll();
    }

    /**
     * Get settings store instance
     */
    getSettingsStore(): SettingsStore {
        return this.settingsStore;
    }

    /**
     * Get asset store instance
     */
    getAssetStore(): AssetStore {
        return this.assetStore;
    }
}
