import type { ArticleMetadata } from '../types/article.types';
import type { WechatAccountConfig } from '../types/settings.types';

export function readPublishMetadata(frontmatter: Record<string, unknown>): Partial<ArticleMetadata> {
    const text = (...keys: string[]): string | undefined => {
        for (const key of keys) {
            const value = frontmatter[key];
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return undefined;
    };
    const flag = (value: unknown): boolean | undefined => {
        if (value === true || value === 1 || value === 'true' || value === '1') return true;
        if (value === false || value === 0 || value === 'false' || value === '0') return false;
        return undefined;
    };
    const metadata = {
        digest: text('digest', 'summary', 'description'),
        contentSourceUrl: text('content_source_url', 'source_url'),
        needOpenComment: flag(frontmatter.need_open_comment),
        onlyFansCanComment: flag(frontmatter.only_fans_can_comment),
    };
    return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

export function getPublishDefaults(metadata: ArticleMetadata, account: WechatAccountConfig) {
    const comments = metadata.needOpenComment ?? account.publishDefaults?.needOpenComment ?? false;
    return {
        author: metadata.author ?? account.author ?? '',
        contentSourceUrl: metadata.contentSourceUrl ?? '',
        needOpenComment: comments,
        onlyFansCanComment: comments && (metadata.onlyFansCanComment ?? account.publishDefaults?.onlyFansCanComment ?? false),
    };
}

export function validatePublishFields(fields: {
    title: string; author?: string; digest?: string; contentSourceUrl?: string;
    existingDraftId?: string; existingDraftIndex?: number;
}): string | undefined {
    if (!fields.title.trim()) return '请填写文章标题';
    // Limits from the current official draft/add reference; never truncate user text silently.
    if (Array.from(fields.title).length > 32) return '标题超过微信接口文档的 32 字限制，请精简后保存';
    if (Array.from(fields.author ?? '').length > 16) return '作者不能超过 16 字';
    if (Array.from(fields.digest ?? '').length > 120) return '摘要不能超过 120 字';
    if (fields.contentSourceUrl) {
        try {
            const url = new URL(fields.contentSourceUrl);
            if (!['https:', 'http:'].includes(url.protocol)) return '阅读原文链接须以 https:// 或 http:// 开头';
        } catch { return '请填写有效的阅读原文链接'; }
        if (new TextEncoder().encode(fields.contentSourceUrl).length > 1024) return '阅读原文链接不能超过 1 KB';
    }
    if (fields.existingDraftIndex !== undefined && (!Number.isInteger(fields.existingDraftIndex) || fields.existingDraftIndex < 0)) return '请选择有效的草稿文章';
    return undefined;
}
