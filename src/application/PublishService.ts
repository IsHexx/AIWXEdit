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
            const { content, uploadedCount, firstMediaId } = await this.processImages(article, client);

            // Ensure cover image
            let coverMediaId = options.thumbMediaId || '';
            const coverPath = options.coverPath || article.metadata.cover;

            if (!coverMediaId && coverPath) {
                const coverUpload = await this.uploadLocalImage(coverPath, client, article.sourceFile, 'image');
                if (!coverUpload.success || !coverUpload.mediaId) {
                    if (firstMediaId) {
                        coverMediaId = firstMediaId;
                    } else {
                        return {
                            success: false,
                            error: coverUpload.error || 'Cover upload failed',
                        };
                    }
                }
                coverMediaId = coverMediaId || coverUpload.mediaId || '';
            }

            if (!coverMediaId && firstMediaId) {
                coverMediaId = firstMediaId;
            }

            if (!coverMediaId && account.defaultCoverMediaId) {
                coverMediaId = account.defaultCoverMediaId;
            }

            if (!coverMediaId && account.defaultCoverPath) {
                const coverUpload = await this.uploadLocalImage(account.defaultCoverPath, client, null, 'image');
                if (!coverUpload.success || !coverUpload.mediaId) {
                    if (firstMediaId) {
                        coverMediaId = firstMediaId;
                    } else {
                        return {
                            success: false,
                            error: coverUpload.error || 'Default cover upload failed',
                        };
                    }
                }
                coverMediaId = coverMediaId || coverUpload.mediaId || '';
            }

            if (!coverMediaId) {
                return { success: false, error: '未配置封面，且未能从正文图片中获取封面。请在账号设置中配置默认封面。' };
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
    ): Promise<{ content: string; uploadedCount: number; firstMediaId?: string }> {
        let content = article.styledHtmlContent;
        let uploadedCount = 0;
        let firstMediaId: string | undefined;

        // Skip if no source file (cannot resolve relative paths)
        if (!article.sourceFile || typeof document === 'undefined') {
            return { content, uploadedCount };
        }

        const doc = document.implementation.createHTMLDocument('wdwxedit-upload-images');
        const container = doc.createElement('div');
        container.innerHTML = content;
        doc.body.appendChild(container);

        const images = Array.from(container.querySelectorAll('img'));
        for (const img of images) {
            const src = img.getAttribute('src') || '';
            const vaultPathAttr = img.getAttribute('data-vault-path') || '';

            if (src.startsWith('http://mmbiz') || src.startsWith('https://mmbiz')) {
                continue;
            }

            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
                continue;
            }

            let localPath = vaultPathAttr || src;
            if (localPath && !localPath.startsWith('/')) {
                localPath = `/${localPath}`;
            }

            if (!localPath) continue;

            const uploadResult = await this.uploadLocalImage(localPath, client, article.sourceFile, 'article_image');
            if (uploadResult.success && uploadResult.url) {
                img.setAttribute('src', uploadResult.url);
                uploadedCount++;
                if (!firstMediaId && uploadResult.mediaId) {
                    firstMediaId = uploadResult.mediaId;
                }
            }
        }

        content = container.innerHTML;
        return { content, uploadedCount, firstMediaId };
    }

    /**
     * Upload a local image to WeChat
     */
    private async uploadLocalImage(
        imagePath: string,
        client: WechatClient,
        sourceFile: TFile | null,
        type: 'image' | 'temp_image' | 'article_image' = 'image'
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
            return await client.uploadImage(blob, imageFile.name, type);
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
