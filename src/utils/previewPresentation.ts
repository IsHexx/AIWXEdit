import type { PreviewPreferences } from '../types/settings.types';

export function normalizePreviewPreferences(value?: Partial<PreviewPreferences>): PreviewPreferences {
    return {
        width: value?.width === 'desktop' || value?.width === 'fluid' ? value.width : 'mobile',
        syncScroll: typeof value?.syncScroll === 'boolean' ? value.syncScroll : true,
        focusMode: typeof value?.focusMode === 'boolean' ? value.focusMode : false,
    };
}

export function readingStats(text: string): { words: number; minutes: number } {
    const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
    const remaining = text.replace(/\p{Script=Han}/gu, ' ');
    const words = han + (remaining.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0);
    return { words, minutes: Math.ceil(words / 300) };
}

export function linkedScrollPosition(position: number, sourceHeight: number, targetHeight: number): number {
    if (!Number.isFinite(position) || sourceHeight <= 0 || targetHeight <= 0) return 0;
    return Math.max(0, Math.min(1, position / sourceHeight)) * targetHeight;
}
