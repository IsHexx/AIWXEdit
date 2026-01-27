/**
 * Preview Service
 * 
 * Application service for live preview functionality.
 * Handles article rendering and real-time updates.
 */

import { App, TFile } from 'obsidian';
import type { ParsedArticle } from '../types/article.types';
import type { StyleConfig } from '../types/settings.types';
import { getArticleTransformer, ArticleTransformer } from '../domain/article';
import { getSettingsStore } from '../infrastructure/storage';
import { getWechatClient } from '../infrastructure/wechat';
import { replaceChildrenWithHtml } from '../utils/dom';

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
        void this.refresh();
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
        void this.refresh();
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
        html = await this.wrapWechatBackgroundForClipboard(html);
        const plainText = this.extractPlainText(html);

        if (this.copyViaElectron(html, plainText)) {
            return true;
        }

        if (await this.copyViaClipboardApi(html, plainText)) {
            return true;
        }

        if (await this.copyViaClipboardText(plainText)) {
            return true;
        }

        return false;
    }

    private async copyViaClipboardText(text: string): Promise<boolean> {
        try {
            if (!navigator.clipboard || !window.isSecureContext) return false;
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    private async wrapWechatBackgroundForClipboard(html: string): Promise<string> {
        if (!html || typeof document === 'undefined') {
            return html;
        }

        const container = document.createElement('div');
        container.setCssProps({
            position: 'fixed',
            left: '-9999px',
            top: '0',
            opacity: '0',
            'pointer-events': 'none',
            'user-select': 'none',
        });
        replaceChildrenWithHtml(container, html);

        document.body.appendChild(container);

        try {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            const root = container.firstElementChild as HTMLElement | null;
            if (!root) return html;

            const article = root.classList.contains('wx-article')
                ? root
                : (root.querySelector<HTMLElement>('.wx-article') || root);

            const isTransparent = (value: string) =>
                !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';

            const isInheritLike = (value: string) => {
                const v = value.trim().toLowerCase();
                return v === 'inherit' || v === 'initial' || v === 'unset' || v === 'revert';
            };

            let pageBg: string | null = null;
            for (let node: HTMLElement | null = article; node; node = node.parentElement) {
                const bg = getComputedStyle(node).backgroundColor;
                if (!isTransparent(bg)) {
                    pageBg = this.normalizeWechatColor(bg);
                    break;
                }
            }

            const effectiveBg = pageBg;

            const articleStyle = getComputedStyle(article);
            const baseFontFamily = articleStyle.fontFamily || '';
            const baseFontSize = articleStyle.fontSize || '';
            const baseLineHeight = articleStyle.lineHeight || '';
            const baseColor = articleStyle.color ? this.normalizeWechatColor(articleStyle.color) : '';
            const baseTextAlign = articleStyle.textAlign || '';

            const rootPadLeft = parseFloat(articleStyle.paddingLeft) || 0;
            const rootPadRight = parseFloat(articleStyle.paddingRight) || 0;
            const rootPadTop = parseFloat(articleStyle.paddingTop) || 0;
            const rootPadBottom = parseFloat(articleStyle.paddingBottom) || 0;

            // Wrap everything into a clean <section> root (WeChat paste tends to keep it more consistently than div wrappers).
            const wrapper = document.createElement('section');
            // Keep the original class so copy/selection fallbacks treat it as the article root.
            wrapper.classList.add('wx-article');
            const wrapperStyle: string[] = [];
            if (baseFontFamily) wrapperStyle.push(`font-family: ${baseFontFamily}`);
            if (baseFontSize) wrapperStyle.push(`font-size: ${baseFontSize}`);
            if (baseLineHeight && !isInheritLike(baseLineHeight)) wrapperStyle.push(`line-height: ${baseLineHeight}`);
            if (baseColor) wrapperStyle.push(`color: ${baseColor}`);
            if (baseTextAlign) wrapperStyle.push(`text-align: ${baseTextAlign}`);
            if (effectiveBg) wrapperStyle.push(`background-color: ${effectiveBg}`);
            // Keep the same outer padding as the preview container (avoid multiplying padding onto children).
            if (rootPadLeft || rootPadRight || rootPadTop || rootPadBottom) {
                wrapperStyle.push(`padding: ${rootPadTop}px ${rootPadRight}px ${rootPadBottom}px ${rootPadLeft}px`);
            }
            if (wrapperStyle.length > 0) wrapper.setAttribute('style', `${wrapperStyle.join('; ')};`);

            while (article.firstChild) {
                wrapper.appendChild(article.firstChild);
            }
            article.replaceWith(wrapper);

            const fallbackBg = effectiveBg || 'rgb(255, 255, 255)';
            const fallbackBgHex = this.toHexColor(this.normalizeWechatColor(fallbackBg));

            const isSameBg = (a: string, b: string): boolean => {
                const aa = this.toHexColor(this.normalizeWechatColor(a));
                const bb = this.toHexColor(this.normalizeWechatColor(b));
                if (aa && bb) return aa === bb;
                return a.trim().toLowerCase() === b.trim().toLowerCase();
            };

            const hasNonPageBackgroundAncestor = (el: HTMLElement): boolean => {
                for (let node = el.parentElement; node && node !== wrapper; node = node.parentElement) {
                    const bg = this.normalizeWechatColor(getComputedStyle(node).backgroundColor);
                    if (isTransparent(bg)) continue;
                    // Any non-page background ancestor counts (e.g. callout/blockquote containers).
                    if (!fallbackBgHex) {
                        if (!isSameBg(bg, fallbackBg)) return true;
                    } else {
                        const bgHex = this.toHexColor(bg);
                        if (bgHex && bgHex !== fallbackBgHex) return true;
                        if (!bgHex && !isSameBg(bg, fallbackBg)) return true;
                    }
                }
                return false;
            };

            const getInlineStyleProp = (el: HTMLElement, prop: string): string | null => {
                const raw = el.getAttribute('style') || '';
                const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i');
                const m = raw.match(re);
                return m ? m[1].trim() : null;
            };

            const blockTagNames = new Set([
                'div', 'section', 'article',
                'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'blockquote', 'pre',
                'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
                'hr'
            ]);

            const elements: HTMLElement[] = [wrapper, ...Array.from(wrapper.querySelectorAll<HTMLElement>('*'))];
            for (const element of elements) {
                const tag = element.tagName.toLowerCase();
                const computed = getComputedStyle(element);

                if (blockTagNames.has(tag)) {
                    const isCodeLike = tag === 'pre' || tag === 'code';
                    const inCodeSection = !!element.closest('.code-section');
                    const display = (computed.display || '').trim().toLowerCase();
                    // Avoid structural rewrites on layout containers (flex/grid/table), otherwise wrapping children
                    // into an inner div can collapse columns/rows into a single stacked block after paste.
                    const isLayoutContainer =
                        display.includes('flex') ||
                        display.includes('grid') ||
                        display === 'table' ||
                        display === 'inline-table' ||
                        display.startsWith('table-') ||
                        display === 'contents';
                    const bgColor = this.normalizeWechatColor(computed.backgroundColor);
                    const isPageBg = isTransparent(bgColor)
                        ? false
                        : (fallbackBgHex
                            ? (this.toHexColor(bgColor) === fallbackBgHex)
                            : isSameBg(bgColor, fallbackBg));
                    const hasOwnBg = !isTransparent(bgColor);
                    const isColoredBlock = hasOwnBg && !isPageBg;
                    const mt = parseFloat(computed.marginTop) || 0;
                    const mb = parseFloat(computed.marginBottom) || 0;
                    const isLast = element.parentElement?.lastElementChild === element;
                    const canSplitBox = tag === 'section' || tag === 'div' || tag === 'article' || tag === 'blockquote' || tag === 'pre';
                    const hasBoxPadding = (parseFloat(computed.paddingTop) || 0) > 0
                        || (parseFloat(computed.paddingRight) || 0) > 0
                        || (parseFloat(computed.paddingBottom) || 0) > 0
                        || (parseFloat(computed.paddingLeft) || 0) > 0;
                    const hasBoxBorder = (parseFloat(computed.borderTopWidth) || 0) > 0
                        || (parseFloat(computed.borderRightWidth) || 0) > 0
                        || (parseFloat(computed.borderBottomWidth) || 0) > 0
                        || (parseFloat(computed.borderLeftWidth) || 0) > 0;

                    // Only fill transparent block backgrounds when they're not inside a colored block.
                    // Otherwise, paragraphs inside callouts/quotes become white boxes.
                    if (isTransparent(bgColor) && !hasNonPageBackgroundAncestor(element)) {
                        element.setCssProps({ 'background-color': fallbackBg });
                    }

                    // Copy-time margin normalization converts margin to padding to avoid WeChat "double margins".
                    // If an element has its own box styling (background/border/padding), adding margin into its padding
                    // changes the look (e.g. colored callouts eat spacing; sections with padding get inflated).
                    // Split it into: outer (page background + spacing) + inner (original background/border/padding).
                    const needsSplitBox = !inCodeSection
                        && !isLayoutContainer
                        && canSplitBox
                        && (isColoredBlock || ((mt > 0 || (mb > 0 && isLast)) && (hasBoxPadding || hasBoxBorder)));
                    if (needsSplitBox) {
                        const inner = document.createElement('div');
                        // Preserve the original box styling on the inner wrapper.
                        inner.setCssProps({
                            'background-color': bgColor,
                            'border-top': computed.borderTop,
                            'border-right': computed.borderRight,
                            'border-bottom': computed.borderBottom,
                            'border-left': computed.borderLeft,
                            'border-radius': computed.borderRadius,
                            'padding-top': computed.paddingTop,
                            'padding-right': computed.paddingRight,
                            'padding-bottom': computed.paddingBottom,
                            'padding-left': computed.paddingLeft,
                            'box-sizing': 'border-box',
                        });

                        while (element.firstChild) {
                            inner.appendChild(element.firstChild);
                        }
                        element.appendChild(inner);

                        // Make the outer element a neutral spacing container.
                        element.setCssProps({
                            'background-color': fallbackBg,
                            border: '0',
                            'border-radius': '0',
                            'padding-top': '0',
                            'padding-right': '0',
                            'padding-bottom': '0',
                            'padding-left': '0',
                        });
                    }

                    if (!inCodeSection && tag !== 'hr') {
                        // WeChat does not paint backgrounds on margins.
                        // Convert margin-top to padding-top to preserve spacing without margin collapse doubling.
                        // Exception: HR elements should keep margins to avoid inflating their height with padding (since they have bg color).
                        if (mt > 0) {
                            // Note: some blocks may have had padding moved to an inner wrapper above.
                            const pt = parseFloat(element.getCssPropertyValue('padding-top')) || parseFloat(computed.paddingTop) || 0;
                            element.setCssProps({
                                'padding-top': `${pt + mt}px`,
                                'margin-top': '0',
                            });
                        }
                        if (mb > 0) {
                            // Keep spacing at the end of the container, otherwise rely on next element's top spacing.
                            if (isLast) {
                                const pb = parseFloat(element.getCssPropertyValue('padding-bottom')) || parseFloat(computed.paddingBottom) || 0;
                                element.setCssProps({
                                    'padding-bottom': `${pb + mb}px`,
                                });
                            }
                            element.setCssProps({ 'margin-bottom': '0' });
                        }
                    }

                    // If the original wrapper gets stripped by WeChat, inherited typography would be lost.
                    // Pin base typography styles onto block nodes (without overriding explicit styles).
                    if (!isCodeLike && !inCodeSection && baseFontFamily) {
                        const current = getInlineStyleProp(element, 'font-family');
                        if (!current || isInheritLike(current)) {
                            element.setCssProps({ 'font-family': baseFontFamily });
                        }
                    }

                    const isHeading = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6';
                    if (!isCodeLike && !inCodeSection && !isHeading && baseFontSize) {
                        const current = getInlineStyleProp(element, 'font-size');
                        if (!current || isInheritLike(current)) {
                            element.setCssProps({ 'font-size': baseFontSize });
                        }
                    }

                    if (
                        !isCodeLike &&
                        !inCodeSection &&
                        !isHeading &&
                        baseLineHeight &&
                        !isInheritLike(baseLineHeight)
                    ) {
                        const current = getInlineStyleProp(element, 'line-height');
                        if (!current || isInheritLike(current)) {
                            element.setCssProps({ 'line-height': baseLineHeight });
                        }
                    }

                    if (!isCodeLike && !inCodeSection && baseTextAlign) {
                        const current = getInlineStyleProp(element, 'text-align');
                        if (!current || isInheritLike(current)) {
                            element.setCssProps({ 'text-align': baseTextAlign });
                        }
                    }

                    if (!isCodeLike && !inCodeSection && baseColor) {
                        const current = getInlineStyleProp(element, 'color');
                        if (!current || isInheritLike(current)) {
                            element.setCssProps({ color: baseColor });
                        }
                    }
                }

            }

            return wrapper.outerHTML;
        } catch {
            return html;
        } finally {
            document.body.removeChild(container);
        }
    }

    private normalizeWechatColor(color: string): string {
        const rgbaMatch = color.match(
            /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i
        );
        if (!rgbaMatch) {
            return color;
        }

        const r = Math.min(255, Math.max(0, Number(rgbaMatch[1])));
        const g = Math.min(255, Math.max(0, Number(rgbaMatch[2])));
        const b = Math.min(255, Math.max(0, Number(rgbaMatch[3])));
        const a = Math.min(1, Math.max(0, Number(rgbaMatch[4])));

        if (a <= 0) {
            return 'transparent';
        }

        // Assume white backdrop and flatten alpha to solid rgb for WeChat paste compatibility.
        const rr = Math.round((1 - a) * 255 + a * r);
        const gg = Math.round((1 - a) * 255 + a * g);
        const bb = Math.round((1 - a) * 255 + a * b);

        return `rgb(${rr}, ${gg}, ${bb})`;
    }

    private toHexColor(color: string): string | null {
        if (!color) return null;

        const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
            const hex = hexMatch[1].toLowerCase();
            if (hex.length === 3) {
                return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
            }
            return `#${hex}`;
        }

        const rgbMatch = color.trim().match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
        if (!rgbMatch) return null;

        const r = Math.min(255, Math.max(0, Number(rgbMatch[1])));
        const g = Math.min(255, Math.max(0, Number(rgbMatch[2])));
        const b = Math.min(255, Math.max(0, Number(rgbMatch[3])));
        const toHex2 = (v: number) => v.toString(16).padStart(2, '0');

        return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
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
        replaceChildrenWithHtml(container, html);
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
                const buffer = await this.app.vault.readBinary(imageFile);
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
        replaceChildrenWithHtml(container, html);
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
        replaceChildrenWithHtml(container, html);
        doc.body.appendChild(container);
        return (container.textContent || '').trim();
    }

    private copyViaElectron(html: string, plainText: string): boolean {
        try {
            type ElectronClipboard = {
                write: (data: { html: string; text: string }) => void;
            };
            type ElectronModule = { clipboard?: ElectronClipboard };

            const w = window as Window & { require?: (module: string) => unknown };
            const electron = typeof w.require === 'function'
                ? (w.require('electron') as ElectronModule)
                : undefined;
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

    // Intentionally no `execCommand` fallback: it is deprecated and blocked in some contexts.
}

/**
 * Get preview service instance
 */
export function getPreviewService(): PreviewService {
    return PreviewService.getInstance();
}
