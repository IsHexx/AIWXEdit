/**
 * Preview Service
 * 
 * Application service for live preview functionality.
 * Handles article rendering and real-time updates.
 */

import { App, TFile } from 'obsidian';
import type { ParsedArticle, RenderOptions } from '../types/article.types';
import type { StyleConfig } from '../types/settings.types';
import { getArticleTransformer, ArticleTransformer } from '../domain/article';
import { getSettingsStore } from '../infrastructure/storage';
import { getWechatClient } from '../infrastructure/wechat';

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
        let html = this.getStyledHTML();
        if (!html) return false;

        html = await this.uploadImagesForClipboard(html);
        html = await this.inlineLocalImagesForClipboard(html);
        const plainText = this.extractPlainText(html);

        if (this.copyViaElectron(html, plainText)) {
            return true;
        }

        if (await this.copyViaClipboardApi(html, plainText)) {
            return true;
        }

        if (this.copyViaExecCommand(html, plainText)) {
            return true;
        }

        return false;
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

    private async inlineLocalImagesForClipboard(html: string): Promise<string> {
        if (!this.app || !this.state.file) return html;

        const doc = document.implementation.createHTMLDocument('wdwxedit-inline-images');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);

        const images = Array.from(container.querySelectorAll('img'));
        for (const img of images) {
            const src = img.getAttribute('src') || '';
            const vaultPathAttr = img.getAttribute('data-vault-path') || '';
            if (!src) continue;
            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
                continue;
            }

            const candidate = vaultPathAttr || src;
            const resolved = this.resolvePath(candidate, this.state.file);
            const imageFile = this.app.vault.getAbstractFileByPath(resolved);
            if (!imageFile || !(imageFile instanceof TFile)) {
                continue;
            }

            try {
                const buffer = await this.app.vault.readBinary(imageFile as TFile);
                const mime = this.getMimeType(imageFile.name);
                const base64 = this.arrayBufferToBase64(buffer);
                img.setAttribute('src', `data:${mime};base64,${base64}`);
            } catch {
                // Ignore image conversion errors and keep original src.
            }
        }

        return container.innerHTML;
    }

    private async uploadImagesForClipboard(html: string): Promise<string> {
        if (!this.app || !this.state.file || typeof document === 'undefined') return html;

        const settings = getSettingsStore().getAll();
        const account = settings.accounts[settings.defaultAccountIndex];
        if (!account?.appId || !account.appSecret) {
            return html;
        }

        const client = getWechatClient(account.appId, account.appSecret);
        if (!client.isConfigured()) return html;

        const doc = document.implementation.createHTMLDocument('wdwxedit-upload-clipboard');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);

        const images = Array.from(container.querySelectorAll('img'));
        for (const img of images) {
            const src = img.getAttribute('src') || '';
            const vaultPathAttr = img.getAttribute('data-vault-path') || '';

            if (!src) continue;
            if (src.startsWith('http://mmbiz') || src.startsWith('https://mmbiz')) {
                continue;
            }
            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
                continue;
            }

            const candidate = vaultPathAttr || src;
            const resolved = this.resolvePath(candidate, this.state.file);
            const imageFile = this.app.vault.getAbstractFileByPath(resolved);
            if (!imageFile || !(imageFile instanceof TFile)) {
                continue;
            }

            try {
                const buffer = await this.app.vault.readBinary(imageFile);
                const mime = this.getMimeType(imageFile.name);
                const upload = await client.uploadImageBuffer(buffer, imageFile.name, mime, 'article_image');
                if (upload.success && (upload.url || upload.mediaId)) {
                    const nextUrl = upload.url || `https://mmbiz.qlogo.cn/mmbiz_png/${upload.mediaId}/0?wx_fmt=png`;
                    img.setAttribute('src', nextUrl);
                }
            } catch {
                // Ignore upload errors; fallback to base64 copy.
            }
        }

        return container.innerHTML;
    }

    private resolvePath(rawPath: string, sourceFile: TFile): string {
        const trimmed = rawPath.trim();
        if (!trimmed) return trimmed;

        const normalized = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
        const direct = this.app?.vault.getAbstractFileByPath(normalized);
        if (direct && direct instanceof TFile) {
            return direct.path;
        }

        try {
            const decoded = decodeURIComponent(normalized);
            if (decoded !== normalized) {
                const decodedFile = this.app?.vault.getAbstractFileByPath(decoded);
                if (decodedFile && decodedFile instanceof TFile) {
                    return decodedFile.path;
                }
            }
        } catch {
            // ignore decode errors
        }

        const sourceDir = sourceFile.parent?.path || '';
        return sourceDir ? `${sourceDir}/${normalized}` : normalized;
    }

    private getMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
        };
        return mimeTypes[ext || ''] || 'image/png';
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private extractPlainText(html: string): string {
        const doc = document.implementation.createHTMLDocument('wdwxedit-plain-text');
        const container = doc.createElement('div');
        container.innerHTML = html;
        doc.body.appendChild(container);
        return (container.textContent || '').trim();
    }

    private copyViaElectron(html: string, plainText: string): boolean {
        try {
            const w = window as any;
            const electron = w?.require ? w.require('electron') : undefined;
            const clipboard = electron?.clipboard;
            if (clipboard && typeof clipboard.write === 'function') {
                clipboard.write({ html, text: plainText });
                return true;
            }
        } catch {
            // ignore
        }
        return false;
    }

    private async copyViaClipboardApi(html: string, plainText: string): Promise<boolean> {
        const clipboard = navigator.clipboard;
        const canUseClipboardItem = typeof ClipboardItem !== 'undefined';

        if (!clipboard || !canUseClipboardItem || !window.isSecureContext) {
            return false;
        }

        try {
            if (document.hasFocus && !document.hasFocus()) {
                window.focus();
                await new Promise(resolve => setTimeout(resolve, 120));
            }

            await clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' }),
                }),
            ]);
            return true;
        } catch {
            return false;
        }
    }

    private copyViaExecCommand(html: string, plainText: string): boolean {
        try {
            const selection = window.getSelection();
            if (!selection) return false;

            const container = document.createElement('div');
            container.innerHTML = html;
            container.contentEditable = 'true';
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.opacity = '0';
            container.style.pointerEvents = 'none';
            container.style.userSelect = 'text';

            document.body.appendChild(container);

            const range = document.createRange();
            range.selectNodeContents(container);
            selection.removeAllRanges();
            selection.addRange(range);

            (container as any).focus?.();

            let successful = document.execCommand('copy');

            selection.removeAllRanges();
            document.body.removeChild(container);

            if (successful) return true;

            const textarea = document.createElement('textarea');
            textarea.value = plainText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            textarea.style.opacity = '0';
            textarea.style.pointerEvents = 'none';

            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            successful = document.execCommand('copy');
            document.body.removeChild(textarea);

            return successful;
        } catch {
            return false;
        }
    }
}

/**
 * Get preview service instance
 */
export function getPreviewService(): PreviewService {
    return PreviewService.getInstance();
}
