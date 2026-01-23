/**
 * Token Manager
 * 
 * Manages WeChat API access tokens with caching and automatic refresh.
 */

import { requestUrl } from 'obsidian';
import type { AccessTokenResponse, CachedToken, WechatAPIError } from '../../types/wechat.types';

/**
 * Token cache storage
 */
const tokenCache: Map<string, CachedToken> = new Map();

/**
 * Buffer time before token expiry (5 minutes)
 */
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

/**
 * Token Manager
 * 
 * Handles access token retrieval, caching, and refresh for WeChat API.
 */
export class TokenManager {
    private appId: string;
    private appSecret: string;

    constructor(appId: string, appSecret: string) {
        this.appId = appId;
        this.appSecret = appSecret;
    }

    /**
     * Get a valid access token
     * Returns cached token if still valid, otherwise fetches a new one
     */
    async getToken(): Promise<string> {
        const cacheKey = this.getCacheKey();
        const cached = tokenCache.get(cacheKey);

        // Check if cached token is still valid
        if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER) {
            return cached.token;
        }

        // Fetch new token
        return this.refreshToken();
    }

    /**
     * Force refresh the access token
     */
    async refreshToken(): Promise<string> {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

        try {
            const response = await requestUrl({
                url,
                method: 'GET',
            });

            const data = response.json;

            // Check for error response
            if (data.errcode) {
                const error = data as WechatAPIError;
                throw new Error(`WeChat API Error: ${error.errcode} - ${error.errmsg}`);
            }

            const tokenResponse = data as AccessTokenResponse;
            const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

            // Cache the token
            const cacheKey = this.getCacheKey();
            tokenCache.set(cacheKey, {
                token: tokenResponse.access_token,
                expiresAt,
            });

            return tokenResponse.access_token;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get access token: ${error.message}`);
            }
            throw new Error('Failed to get access token: Unknown error');
        }
    }

    /**
     * Check if current token is valid
     */
    isTokenValid(): boolean {
        const cacheKey = this.getCacheKey();
        const cached = tokenCache.get(cacheKey);
        return !!cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER;
    }

    /**
     * Clear cached token
     */
    clearToken(): void {
        const cacheKey = this.getCacheKey();
        tokenCache.delete(cacheKey);
    }

    /**
     * Get cache key for this account
     */
    private getCacheKey(): string {
        return `token_${this.appId}`;
    }
}

/**
 * Clear all cached tokens
 */
export function clearAllTokens(): void {
    tokenCache.clear();
}

/**
 * Create a token manager for an account
 */
export function createTokenManager(appId: string, appSecret: string): TokenManager {
    return new TokenManager(appId, appSecret);
}
