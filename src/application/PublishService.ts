/**
 * Publish Service
 * 
 * Application service that orchestrates the article publishing workflow.
 * Coordinates between domain services and infrastructure.
 */

import { App, TFile } from 'obsidian';
import type { DraftArticle, DraftResponse, ImageUploadResult } from '../types/wechat.types';
import type { ParsedArticle } from '../types/article.types';
import { getArticleTransformer } from '../domain/article';
import { getWechatClient, WechatClient } from '../infrastructure/wechat';
import { getSettingsStore } from '../infrastructure/storage';

/**
 * Publish options
 */
export interface PublishOptions {
    /** WeChat account App ID to use */
    appId?: string;
    /** Override article title */
    title?: string;
    /** Override article digest */
    digest?: string;
    /** Override author */
    author?: string;
    /** Cover image media ID */
    thumbMediaId?: string;
    /** Cover image path (vault relative or relative to note) */
    coverPath?: string;
    /** Whether to update existing draft */
    existingDraftId?: string;
}

/**
 * Publish result
 */
export interface PublishResult {
    success: boolean;
    mediaId?: string;
    error?: string;
    uploadedImages?: number;
}

/**
 * Publish Service
 * 
 * Orchestrates the complete publishing workflow.
 */
export class PublishService {
    private static instance: PublishService | null = null;
    private app: App | null = null;

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): PublishService {
        if (!PublishService.instance) {
            PublishService.instance = new PublishService();
        }
        return PublishService.instance;
    }

    /**
     * Initialize with Obsidian app
     */
    initialize(app: App): void {
        this.app = app;
    }

    /**
     * Publish a note to WeChat
     */
    async publish(file: TFile, options: PublishOptions = {}): Promise<PublishResult> {
        try {
            // Get settings
            const settings = getSettingsStore().getAll();

            // Get account
            const account = options.appId
                ? settings.accounts.find(a => a.appId === options.appId)
                : settings.accounts[settings.defaultAccountIndex];

            if (!account) {
                return { success: false, error: 'No WeChat account configured' };
            }

            // Transform article
            const transformer = getArticleTransformer();
            const article = await transformer.transformFile(file);

            // Get WeChat client
            const client = getWechatClient(account.appId, account.appSecret);

            // Upload images from content
            const { content, uploadedCount } = await this.processImages(article, client);

            // Ensure cover image
            let coverMediaId = options.thumbMediaId || '';
            const coverPath = options.coverPath || article.metadata.cover;

            if (!coverMediaId && coverPath) {
                const coverUpload = await this.uploadLocalImage(coverPath, client, article.sourceFile);
                if (!coverUpload.success || !coverUpload.mediaId) {
                    return {
                        success: false,
                        error: coverUpload.error || 'Cover upload failed',
                    };
                }
                coverMediaId = coverUpload.mediaId;
            }

            if (!coverMediaId && account.defaultCoverMediaId) {
                coverMediaId = account.defaultCoverMediaId;
            }

            if (!coverMediaId && account.defaultCoverPath) {
                const coverUpload = await this.uploadLocalImage(account.defaultCoverPath, client, null);
                if (!coverUpload.success || !coverUpload.mediaId) {
                    return {
                        success: false,
                        error: coverUpload.error || 'Default cover upload failed',
                    };
                }
                coverMediaId = coverUpload.mediaId;
            }

            if (!coverMediaId) {
                return { success: false, error: '未配置封面，已尝试使用默认封面但未找到。请在账号设置中配置默认封面。' };
            }

            // Build draft article
            const draftArticle: DraftArticle = {
                title: options.title || article.metadata.title,
                content,
                author: options.author || article.metadata.author || account.author,
                digest: options.digest || article.metadata.digest || '',
                thumbMediaId: coverMediaId,
                needOpenComment: 0,
                onlyFansCanComment: 0,
            };

            // Publish or update
            let result: DraftResponse;
            if (options.existingDraftId) {
                result = await client.updateDraft(options.existingDraftId, draftArticle);
            } else {
                result = await client.createDraft(draftArticle);
            }

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return {
                success: true,
                mediaId: result.mediaId,
                uploadedImages: uploadedCount,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Publish failed',
            };
        }
    }

    /**
     * Process and upload images from article content
     */
    private async processImages(
        article: ParsedArticle,
        client: WechatClient
    ): Promise<{ content: string; uploadedCount: number }> {
        let content = article.styledHtmlContent;
        let uploadedCount = 0;

        // Skip if no source file (cannot resolve relative paths)
        if (!article.sourceFile) {
            return { content, uploadedCount };
        }

        // Find all local images in content
        const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        const matches = [...content.matchAll(imageRegex)];

        for (const match of matches) {
            const src = match[1];

            // Skip already uploaded (WeChat URLs) and external URLs
            if (src.startsWith('http://mmbiz') || src.startsWith('https://mmbiz')) {
                continue;
            }

            // Handle local/relative paths
            if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                const uploadResult = await this.uploadLocalImage(src, client, article.sourceFile);

                if (uploadResult.success && uploadResult.url) {
                    content = content.replace(src, uploadResult.url);
                    uploadedCount++;
                }
            }
        }

        return { content, uploadedCount };
    }

    /**
     * Upload a local image to WeChat
     */
    private async uploadLocalImage(
        imagePath: string,
        client: WechatClient,
        sourceFile: TFile | null
    ): Promise<ImageUploadResult> {
        if (!this.app) {
            return { success: false, error: 'App not initialized' };
        }

        try {
            // Resolve path relative to source file
            const resolvedPath = this.resolvePath(imagePath, sourceFile);
            const imageFile = this.app.vault.getAbstractFileByPath(resolvedPath);

            if (!imageFile || !(imageFile instanceof TFile)) {
                return { success: false, error: `Image not found: ${imagePath}` };
            }

            // Read image data
            const buffer = await this.app.vault.readBinary(imageFile as TFile);
            const blob = new Blob([buffer], { type: this.getMimeType(imageFile.name) });

            // Upload
            return await client.uploadImage(blob, imageFile.name, 'image');
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Image upload failed',
            };
        }
    }

    /**
     * Resolve relative path
     */
    private resolvePath(relativePath: string, sourceFile: TFile | null): string {
        // Handle vault-relative paths
        if (relativePath.startsWith('/')) {
            return relativePath.substring(1);
        }

        if (!sourceFile) {
            return relativePath;
        }

        // Handle relative paths
        const sourceDir = sourceFile.parent?.path || '';
        return sourceDir ? `${sourceDir}/${relativePath}` : relativePath;
    }

    /**
     * Get MIME type from filename
     */
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
}

/**
 * Get publish service instance
 */
export function getPublishService(): PublishService {
    return PublishService.getInstance();
}
