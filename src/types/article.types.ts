/**
 * Article Type Definitions
 * 
 * Defines all types related to article processing and rendering.
 */

import type { TFile } from 'obsidian';

/**
 * Article metadata from frontmatter
 */
export interface ArticleMetadata {
    /** Article title */
    title: string;
    /** Author name */
    author?: string;
    /** Article digest/summary */
    digest?: string;
    /** Cover image path (vault relative) */
    cover?: string;
    /** Tags */
    tags?: string[];
    /** Creation date */
    createdAt?: Date;
    /** Last modified date */
    modifiedAt?: Date;
}

/**
 * Parsed article structure
 */
export interface ParsedArticle {
    /** Source file reference */
    sourceFile: TFile | null;
    /** Extracted metadata */
    metadata: ArticleMetadata;
    /** Raw markdown content (without frontmatter) */
    markdownContent: string;
    /** Rendered HTML content */
    htmlContent: string;
    /** Rendered HTML with inline styles */
    styledHtmlContent: string;
}

/**
 * Rendering options
 */
export interface RenderOptions {
    /** Theme name to apply */
    theme: string;
    /** Code highlight theme */
    highlight: string;
    /** Whether to inline styles */
    inlineStyles: boolean;
    /** Whether to process local images */
    processImages: boolean;
}

/**
 * Image reference in article
 */
export interface ImageReference {
    /** Original href in markdown */
    originalHref: string;
    /** Resolved vault path */
    vaultPath?: string;
    /** Alt text */
    altText: string;
    /** Whether this is a local file */
    isLocal: boolean;
}

/**
 * Processed image result
 */
export interface ProcessedImage {
    /** Original reference */
    reference: ImageReference;
    /** WeChat media ID after upload */
    mediaId?: string;
    /** WeChat URL after upload */
    wechatUrl?: string;
    /** Processing status */
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    /** Error message if failed */
    error?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'html' | 'clipboard' | 'wechat';

/**
 * Export result
 */
export interface ExportResult {
    success: boolean;
    format: ExportFormat;
    content?: string;
    error?: string;
}
