/**
 * Draft Publisher
 * 
 * Handles creating and managing WeChat draft articles.
 */

import { requestUrl } from 'obsidian';
import type { DraftArticle, DraftBatchGetResponse, DraftResponse, WechatAPIError } from '../../types/wechat.types';

export interface BatchGetDraftsResult {
    success: boolean;
    totalCount?: number;
    items?: DraftBatchGetResponse['item'];
    error?: string;
}

/**
 * Draft Publisher
 * 
 * Creates and manages WeChat draft articles.
 */
export class DraftPublisher {
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
     * Create a new draft article
     */
    async createDraft(article: DraftArticle): Promise<DraftResponse> {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${this.accessToken}`;

        try {
            // Build request body
            const body = {
                articles: [{
                    title: article.title,
                    author: article.author || '',
                    digest: article.digest || '',
                    content: article.content,
                    content_source_url: article.contentSourceUrl || '',
                    thumb_media_id: article.thumbMediaId,
                    need_open_comment: article.needOpenComment ?? 0,
                    only_fans_can_comment: article.onlyFansCanComment ?? 0,
                }],
            };

            const response = await requestUrl({
                url,
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = response.json;

            // Check for error
            if (result.errcode) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Draft creation failed: ${error.errcode} - ${error.errmsg}`,
                };
            }

            return {
                success: true,
                mediaId: result.media_id,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error creating draft',
            };
        }
    }

    /**
     * Update an existing draft article
     */
    async updateDraft(mediaId: string, article: DraftArticle, index: number = 0): Promise<DraftResponse> {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/update?access_token=${this.accessToken}`;

        try {
            const body = {
                media_id: mediaId,
                index,
                articles: {
                    title: article.title,
                    author: article.author || '',
                    digest: article.digest || '',
                    content: article.content,
                    content_source_url: article.contentSourceUrl || '',
                    thumb_media_id: article.thumbMediaId,
                    need_open_comment: article.needOpenComment ?? 0,
                    only_fans_can_comment: article.onlyFansCanComment ?? 0,
                },
            };

            const response = await requestUrl({
                url,
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = response.json;

            if (result.errcode && result.errcode !== 0) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Draft update failed: ${error.errcode} - ${error.errmsg}`,
                };
            }

            return {
                success: true,
                mediaId,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error updating draft',
            };
        }
    }

    /**
     * Delete a draft
     */
    async deleteDraft(mediaId: string): Promise<{ success: boolean; error?: string }> {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${this.accessToken}`;

        try {
            const response = await requestUrl({
                url,
                method: 'POST',
                body: JSON.stringify({ media_id: mediaId }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = response.json;

            if (result.errcode && result.errcode !== 0) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Draft deletion failed: ${error.errcode} - ${error.errmsg}`,
                };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error deleting draft',
            };
        }
    }

    /**
     * Get draft count
     */
    async getDraftCount(): Promise<{ success: boolean; count?: number; error?: string }> {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/count?access_token=${this.accessToken}`;

        try {
            const response = await requestUrl({
                url,
                method: 'GET',
            });

            const result = response.json;

            if (result.errcode) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Failed to get draft count: ${error.errcode} - ${error.errmsg}`,
                };
            }

            return {
                success: true,
                count: result.total_count,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error getting draft count',
            };
        }
    }

    /**
     * Batch get drafts (list)
     */
    async batchGetDrafts(offset: number = 0, count: number = 20, noContent: boolean = false): Promise<BatchGetDraftsResult> {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${this.accessToken}`;

        try {
            const response = await requestUrl({
                url,
                method: 'POST',
                body: JSON.stringify({
                    offset,
                    count,
                    no_content: noContent ? 1 : 0,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = response.json as DraftBatchGetResponse | WechatAPIError;
            if ((result as WechatAPIError).errcode) {
                const error = result as WechatAPIError;
                return {
                    success: false,
                    error: `Draft batchget failed: ${error.errcode} - ${error.errmsg}`,
                };
            }

            const ok = result as DraftBatchGetResponse;
            return {
                success: true,
                totalCount: ok.total_count,
                items: ok.item || [],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error batch getting drafts',
            };
        }
    }
}

/**
 * Create a draft publisher
 */
export function createDraftPublisher(accessToken: string): DraftPublisher {
    return new DraftPublisher(accessToken);
}
