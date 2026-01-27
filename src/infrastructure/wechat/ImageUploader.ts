/**
 * Image Uploader
 * 
 * Handles uploading images to WeChat servers.
 * Supports both permanent and temporary materials.
 */

import { requestUrl, getBlobArrayBuffer } from 'obsidian';
import type { ImageUploadResult, WechatAPIError } from '../../types/wechat.types';

/**
 * Material type for upload
 */
export type MaterialType = 'image' | 'temp_image' | 'article_image';

/**
 * Image Uploader
 * 
 * Uploads images to WeChat media storage.
 */
export class ImageUploader {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Update access token
     */
    setToken(token: string): void {
        this.accessToken = token;
    }

    /**
     * Upload an image from Blob data
     */
    async uploadBlob(
        data: Blob,
        filename: string,
        type: MaterialType = 'image'
    ): Promise<ImageUploadResult> {
        try {
            // Build multipart form data
            const formData = await this.buildFormData(data, filename);
            const url = this.getUploadUrl(type);

            const response = await requestUrl({
                url,
                method: 'POST',
                body: formData.buffer,
                headers: {
                    'Content-Type': formData.contentType,
                },
            });

            const result = response.json;

            // Check for error
            if (result.errcode) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Upload failed: ${error.errcode} - ${error.errmsg}`,
                };
            }

            return {
                success: true,
                mediaId: result.media_id,
                url: result.url || this.buildFallbackUrl(result.media_id),
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown upload error',
            };
        }
    }

    /**
     * Upload an image from ArrayBuffer
     */
    async uploadBuffer(
        buffer: ArrayBuffer,
        filename: string,
        mimeType: string = 'image/png',
        type: MaterialType = 'image'
    ): Promise<ImageUploadResult> {
        const blob = new Blob([buffer], { type: mimeType });
        return this.uploadBlob(blob, filename, type);
    }

    /**
     * Get upload URL based on material type
     */
    private getUploadUrl(type: MaterialType): string {
        if (type === 'article_image') {
            // Article content image upload
            return `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${this.accessToken}`;
        }
        if (type === 'temp_image') {
            // Temporary media (valid for 3 days)
            return `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${this.accessToken}&type=image`;
        }
        // Permanent material
        return `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${this.accessToken}&type=image`;
    }

    /**
     * Build multipart form data for upload
     */
    private async buildFormData(
        data: Blob,
        filename: string
    ): Promise<{ buffer: ArrayBuffer; contentType: string }> {
        const boundary = `----AIWXEditBoundary${Date.now()}`;
        const contentType = `multipart/form-data; boundary=${boundary}`;

        // Get blob as ArrayBuffer
        const blobBuffer = await getBlobArrayBuffer(data);

        // Build multipart body
        const header = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="media"; filename="${filename}"`,
            `Content-Type: ${data.type || 'application/octet-stream'}`,
            '',
            '',
        ].join('\r\n');

        const footer = `\r\n--${boundary}--\r\n`;

        // Combine parts
        const headerBytes = new TextEncoder().encode(header);
        const footerBytes = new TextEncoder().encode(footer);
        const bodyBytes = new Uint8Array(blobBuffer);

        const totalLength = headerBytes.length + bodyBytes.length + footerBytes.length;
        const buffer = new ArrayBuffer(totalLength);
        const view = new Uint8Array(buffer);

        view.set(headerBytes, 0);
        view.set(bodyBytes, headerBytes.length);
        view.set(footerBytes, headerBytes.length + bodyBytes.length);

        return { buffer, contentType };
    }

    private buildFallbackUrl(mediaId?: string): string | undefined {
        if (!mediaId) return undefined;
        // WeChat image CDN fallback (consistent with v4 behavior)
        return `https://mmbiz.qlogo.cn/mmbiz_png/${mediaId}/0?wx_fmt=png`;
    }
}

/**
 * Create an image uploader
 */
export function createImageUploader(accessToken: string): ImageUploader {
    return new ImageUploader(accessToken);
}
