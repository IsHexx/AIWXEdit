/**
 * Material Manager
 *
 * Fetches permanent materials from WeChat Official Account API.
 */

import { requestUrl } from 'obsidian';
import type { BatchGetMaterialResponse, MaterialItem, MaterialType, WechatAPIError } from '../../types/wechat.types';

export interface ListMaterialsResult {
    success: boolean;
    items?: MaterialItem[];
    totalCount?: number;
    error?: string;
}

export class MaterialManager {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    setToken(token: string): void {
        this.accessToken = token;
    }

    async listMaterials(type: MaterialType, offset: number = 0, count: number = 20): Promise<ListMaterialsResult> {
        const url = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${this.accessToken}`;

        try {
            const response = await requestUrl({
                url,
                method: 'POST',
                body: JSON.stringify({ type, offset, count }),
                headers: { 'Content-Type': 'application/json' },
            });

            const result = response.json as BatchGetMaterialResponse | WechatAPIError;
            if ((result as WechatAPIError).errcode) {
                const error = result as WechatAPIError;
                return { success: false, error: `Batch get material failed: ${error.errcode} - ${error.errmsg}` };
            }

            const ok = result as BatchGetMaterialResponse;
            return {
                success: true,
                items: ok.item || [],
                totalCount: ok.total_count,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error fetching materials',
            };
        }
    }
}

export function createMaterialManager(accessToken: string): MaterialManager {
    return new MaterialManager(accessToken);
}

