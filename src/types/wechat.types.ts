/**
 * WeChat API Type Definitions
 * 
 * Defines all types related to WeChat Official Account API integration.
 */

/**
 * Access token response from WeChat API
 */
export interface AccessTokenResponse {
    access_token: string;
    expires_in: number;
}

/**
 * API error response from WeChat
 */
export interface WechatAPIError {
    errcode: number;
    errmsg: string;
}

/**
 * Cached access token with expiry
 */
export interface CachedToken {
    token: string;
    expiresAt: number;
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
    success: boolean;
    mediaId?: string;
    url?: string;
    error?: string;
}

/**
 * Material type for batch get
 */
export type MaterialType = 'image' | 'video' | 'voice' | 'news';

/**
 * Material item from batch get
 */
export interface MaterialItem {
    media_id: string;
    name?: string;
    url?: string;
    update_time: number;
}

/**
 * Batch get material response
 */
export interface BatchGetMaterialResponse {
    total_count: number;
    item_count: number;
    item: MaterialItem[];
}

/**
 * Draft article content
 */
export interface DraftArticle {
    /** Article title */
    title: string;
    /** Author name */
    author?: string;
    /** Article digest/summary */
    digest?: string;
    /** Article HTML content */
    content: string;
    /** Original link URL */
    contentSourceUrl?: string;
    /** Cover image media ID */
    thumbMediaId: string;
    /** Whether to allow comments (0 or 1) */
    needOpenComment?: number;
    /** Only fans can comment (0 or 1) */
    onlyFansCanComment?: number;
}

/**
 * Draft creation response
 */
export interface DraftResponse {
    success: boolean;
    mediaId?: string;
    error?: string;
}

/**
 * Draft batch get (list) response types
 */
export interface DraftBatchGetNewsItem {
    title: string;
    author?: string;
    digest?: string;
    thumb_media_id?: string;
    content?: string;
}

export interface DraftBatchGetItem {
    media_id: string;
    content?: {
        news_item: DraftBatchGetNewsItem[];
    };
    update_time: number;
}

export interface DraftBatchGetResponse {
    total_count: number;
    item_count: number;
    item: DraftBatchGetItem[];
}

/**
 * WeChat client configuration
 */
export interface WechatClientConfig {
    appId: string;
    appSecret: string;
}
