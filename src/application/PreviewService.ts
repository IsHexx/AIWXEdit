/**
 * Preview Service
 * 
 * Application service for live preview functionality.
 * Handles article rendering and real-time updates.
 */

import type { App, TFile } from 'obsidian';
import type { ParsedArticle, RenderOptions } from '../types/article.types';
import type { StyleConfig } from '../types/settings.types';
import { getArticleTransformer, ArticleTransformer } from '../domain/article';
import { getSettingsStore } from '../infrastructure/storage';

/**
 * Preview state
 */
export interface PreviewState {
    /** Currently previewed file */
    file: TFile | null;
    /** Parsed article */
    article: ParsedArticle | null;
    /** Current theme ID */
    themeId: string;
    /** Whether preview is loading */
    isLoading: boolean;
}

/**
 * Preview change listener
 */
export type PreviewChangeListener = (state: PreviewState) => void;

/**
 * Preview Service
 * 
 * Manages article preview rendering and state.
 */
export class PreviewService {
    private static instance: PreviewService | null = null;

    private app: App | null = null;
    private transformer: ArticleTransformer | null = null;
    private state: PreviewState = {
        file: null,
        article: null,
        themeId: 'default',
        isLoading: false,
    };
    private listeners: Set<PreviewChangeListener> = new Set();

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): PreviewService {
        if (!PreviewService.instance) {
            PreviewService.instance = new PreviewService();
        }
        return PreviewService.instance;
    }

    /**
     * Initialize with Obsidian app
     */
    async initialize(app: App): Promise<void> {
        this.app = app;
        this.transformer = getArticleTransformer();
        this.transformer.initialize(app);
        await this.transformer.setup();
    }

    /**
     * Get current preview state
     */
    getState(): PreviewState {
        return { ...this.state };
    }

    /**
     * Set file to preview
     */
    async setFile(file: TFile | null): Promise<void> {
        if (!file) {
            this.updateState({ file: null, article: null });
            return;
        }

        this.updateState({ file, isLoading: true });

        try {
            const article = await this.transformer?.transformFile(file);
            this.updateState({ article: article || null, isLoading: false });
        } catch (error) {
            console.error('Preview render error:', error);
            this.updateState({ article: null, isLoading: false });
        }
    }

    /**
     * Refresh current preview
     */
    async refresh(): Promise<void> {
        if (this.state.file) {
            await this.setFile(this.state.file);
        }
    }

    /**
     * Render markdown content directly
     */
    renderMarkdown(markdown: string): { htmlContent: string; styledHtmlContent: string } {
        if (!this.transformer) {
            return { htmlContent: '', styledHtmlContent: '' };
        }
        return this.transformer.transform(markdown);
    }

    /**
     * Set theme
     */
    setTheme(themeId: string): void {
        this.updateState({ themeId });
        // Refresh to apply new theme
        this.refresh();
    }

    /**
     * Update style settings
     */
    updateStyles(styles: Partial<StyleConfig>): void {
        this.transformer?.updateStyles({
            primaryColor: styles.primaryColor,
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
        });
        this.refresh();
    }

    /**
     * Get styled HTML content
     */
    getStyledHTML(): string {
        return this.state.article?.styledHtmlContent || '';
    }

    /**
     * Get raw HTML content
     */
    getRawHTML(): string {
        return this.state.article?.htmlContent || '';
    }

    /**
     * Copy styled content to clipboard
     */
    async copyToClipboard(): Promise<boolean> {
        const html = this.getStyledHTML();
        if (!html) return false;

        try {
            // Create a blob with HTML content
            const blob = new Blob([html], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([html], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([clipboardItem]);
            return true;
        } catch {
            // Fallback to text copy
            try {
                await navigator.clipboard.writeText(html);
                return true;
            } catch {
                return false;
            }
        }
    }

    /**
     * Add change listener
     */
    addListener(listener: PreviewChangeListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Update state and notify listeners
     */
    private updateState(partial: Partial<PreviewState>): void {
        this.state = { ...this.state, ...partial };
        this.notifyListeners();
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(): void {
        const state = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('Preview listener error:', error);
            }
        });
    }
}

/**
 * Get preview service instance
 */
export function getPreviewService(): PreviewService {
    return PreviewService.getInstance();
}
