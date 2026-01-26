/**
 * WeChat Client
 * 
 * Unified client for all WeChat API operations.
 * Provides a high-level interface combining token management, image upload, and draft publishing.
 */

import type { DraftArticle, DraftBatchGetItem, DraftResponse, ImageUploadResult, WechatClientConfig } from '../../types/wechat.types';
import { TokenManager, createTokenManager } from './TokenManager';
import { ImageUploader, createImageUploader, type MaterialType as UploadMaterialType } from './ImageUploader';
import { DraftPublisher, createDraftPublisher, type BatchGetDraftsResult } from './DraftPublisher';
import { MaterialManager, createMaterialManager, type ListMaterialsResult } from './MaterialManager';
import type { MaterialType as WechatMaterialType } from '../../types/wechat.types';

/**
 * WeChat Client
 * 
 * High-level client for WeChat API operations.
 */
export class WechatClient {
    private config: WechatClientConfig;
    private tokenManager: TokenManager;
    private imageUploader: ImageUploader | null = null;
    private draftPublisher: DraftPublisher | null = null;
    private materialManager: MaterialManager | null = null;

    constructor(config: WechatClientConfig) {
        this.config = config;
        this.tokenManager = createTokenManager(config.appId, config.appSecret);
    }

    /**
     * Get current app ID
     */
    getAppId(): string {
        return this.config.appId;
    }

    /**
     * Check if client is configured
     */
    isConfigured(): boolean {
        return !!this.config.appId && !!this.config.appSecret;
    }

    // ==================== Token Operations ====================

    /**
     * Get a valid access token
     */
    async getToken(): Promise<string> {
        return this.tokenManager.getToken();
    }

    /**
     * Refresh the access token
     */
    async refreshToken(): Promise<string> {
        const token = await this.tokenManager.refreshToken();
        this.updateServiceTokens(token);
        return token;
    }

    /**
     * Check if token is valid
     */
    isTokenValid(): boolean {
        return this.tokenManager.isTokenValid();
    }

    /**
     * Update tokens for all services
     */
    private updateServiceTokens(token: string): void {
        if (this.imageUploader) {
            this.imageUploader.setToken(token);
        }
        if (this.draftPublisher) {
            this.draftPublisher.setToken(token);
        }
        if (this.materialManager) {
            this.materialManager.setToken(token);
        }
    }

    // ==================== Image Operations ====================

    /**
     * Get or create image uploader
     */
    private async getImageUploader(): Promise<ImageUploader> {
        if (!this.imageUploader) {
            const token = await this.getToken();
            this.imageUploader = createImageUploader(token);
        }
        return this.imageUploader;
    }

    /**
     * Upload an image from Blob
     */
    async uploadImage(
        data: Blob,
        filename: string,
        type: UploadMaterialType = 'image'
    ): Promise<ImageUploadResult> {
        const uploader = await this.getImageUploader();
        return uploader.uploadBlob(data, filename, type);
    }

    /**
     * Upload an image from ArrayBuffer
     */
    async uploadImageBuffer(
        buffer: ArrayBuffer,
        filename: string,
        mimeType: string = 'image/png',
        type: UploadMaterialType = 'image'
    ): Promise<ImageUploadResult> {
        const uploader = await this.getImageUploader();
        return uploader.uploadBuffer(buffer, filename, mimeType, type);
    }

    // ==================== Material Operations ====================

    private async getMaterialManager(): Promise<MaterialManager> {
        if (!this.materialManager) {
            const token = await this.getToken();
            this.materialManager = createMaterialManager(token);
        }
        return this.materialManager;
    }

    async listMaterials(
        type: WechatMaterialType = 'image',
        count: number = 20,
        offset: number = 0
    ): Promise<ListMaterialsResult> {
        const manager = await this.getMaterialManager();
        return manager.listMaterials(type, offset, count);
    }

    // ==================== Draft Operations ====================

    /**
     * Get or create draft publisher
     */
    private async getDraftPublisher(): Promise<DraftPublisher> {
        if (!this.draftPublisher) {
            const token = await this.getToken();
            this.draftPublisher = createDraftPublisher(token);
        }
        return this.draftPublisher;
    }

    /**
     * Create a draft article
     */
    async createDraft(article: DraftArticle): Promise<DraftResponse> {
        const publisher = await this.getDraftPublisher();
        return publisher.createDraft(article);
    }

    /**
     * Update a draft article
     */
    async updateDraft(mediaId: string, article: DraftArticle, index: number = 0): Promise<DraftResponse> {
        const publisher = await this.getDraftPublisher();
        return publisher.updateDraft(mediaId, article, index);
    }

    /**
     * Delete a draft
     */
    async deleteDraft(mediaId: string): Promise<{ success: boolean; error?: string }> {
        const publisher = await this.getDraftPublisher();
        return publisher.deleteDraft(mediaId);
    }

    /**
     * Get draft count
     */
    async getDraftCount(): Promise<{ success: boolean; count?: number; error?: string }> {
        const publisher = await this.getDraftPublisher();
        return publisher.getDraftCount();
    }

    async batchGetDrafts(offset: number = 0, count: number = 20, noContent: boolean = false): Promise<BatchGetDraftsResult> {
        const publisher = await this.getDraftPublisher();
        return publisher.batchGetDrafts(offset, count, noContent);
    }

    /**
     * Find the most recently updated draft article with matching title.
     * Returns the draft media_id and article index inside that draft.
     */
    async findDraftByTitle(
        title: string,
        options: { maxScan?: number } = {}
    ): Promise<{ success: boolean; mediaId?: string; index?: number; error?: string }> {
        const normalized = title.trim();
        if (!normalized) return { success: true };

        const maxScan = Math.max(20, options.maxScan ?? 100);
        const pageSize = 20;
        let offset = 0;
        const matches: Array<{ item: DraftBatchGetItem; index: number }> = [];

        while (offset < maxScan) {
            const res = await this.batchGetDrafts(offset, Math.min(pageSize, maxScan - offset), false);
            if (!res.success) {
                return { success: false, error: res.error };
            }

            const items = res.items || [];
            for (const item of items) {
                const news = item.content?.news_item || [];
                const idx = news.findIndex(n => (n.title || '').trim() === normalized);
                if (idx >= 0) {
                    matches.push({ item, index: idx });
                }
            }

            if (items.length < pageSize) break;
            offset += pageSize;
        }

        if (matches.length === 0) return { success: true };

        matches.sort((a, b) => (b.item.update_time || 0) - (a.item.update_time || 0));
        return { success: true, mediaId: matches[0].item.media_id, index: matches[0].index };
    }

    // ==================== Lifecycle ====================

    /**
     * Clear all cached data
     */
    clearCache(): void {
        this.tokenManager.clearToken();
        this.imageUploader = null;
        this.draftPublisher = null;
        this.materialManager = null;
    }
}

/**
 * Create a WeChat client
 */
export function createWechatClient(config: WechatClientConfig): WechatClient {
    return new WechatClient(config);
}

/**
 * Client cache for multiple accounts
 */
const clientCache: Map<string, WechatClient> = new Map();

/**
 * Get or create a WeChat client for an account
 */
export function getWechatClient(appId: string, appSecret: string): WechatClient {
    const cacheKey = appId;

    let client = clientCache.get(cacheKey);
    if (!client) {
        client = createWechatClient({ appId, appSecret });
        clientCache.set(cacheKey, client);
    }

    return client;
}

/**
 * Clear all cached clients
 */
export function clearWechatClientCache(): void {
    for (const client of clientCache.values()) {
        client.clearCache();
    }
    clientCache.clear();
}
