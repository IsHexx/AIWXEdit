/**
 * Cover Generator
 * 
 * Generates article cover images using AI.
 * Supports both image generation (FLUX, DALL-E) and HTML generation.
 */

import type { ChatMessage, CoverStyle, CoverImageResult, CoverHTMLResult } from '../../types/ai.types';
import { AIClient } from './AIClient';

/**
 * Cover generation mode
 */
export type CoverMode = 'image' | 'html';

/**
 * Cover Generator Options
 */
export interface CoverGeneratorOptions {
    /** Generation mode */
    mode: CoverMode;
    /** Image model for image mode */
    imageModel?: string;
    /** Image size */
    imageSize?: string;
    /** Cover style preference */
    style?: CoverStyle;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: CoverGeneratorOptions = {
    mode: 'image',
    imageModel: 'black-forest-labs/flux-schnell-free',
    imageSize: '1024x1024',
    style: 'minimal',
};

/**
 * Style descriptions for prompt generation
 */
const STYLE_DESCRIPTIONS: Record<CoverStyle, string> = {
    realistic: 'photorealistic, high detail, professional photography',
    artistic: 'artistic, creative, illustrated, vibrant colors',
    minimal: 'minimalist, clean, simple, modern design',
    abstract: 'abstract, geometric shapes, creative patterns',
};

/**
 * Cover Generator
 * 
 * Uses AI to generate article cover images or HTML.
 */
export class CoverGenerator {
    private client: AIClient;
    private options: CoverGeneratorOptions;

    constructor(client: AIClient, options: Partial<CoverGeneratorOptions> = {}) {
        this.client = client;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Set generation mode
     */
    setMode(mode: CoverMode): void {
        this.options.mode = mode;
    }

    /**
     * Set style preference
     */
    setStyle(style: CoverStyle): void {
        this.options.style = style;
    }

    /**
     * Generate cover based on current mode
     */
    async generate(
        title: string,
        summary: string
    ): Promise<CoverImageResult | CoverHTMLResult> {
        if (this.options.mode === 'html') {
            return this.generateHTML(title, summary);
        }
        return this.generateImage(title, summary);
    }

    /**
     * Generate cover image using image generation model
     */
    async generateImage(title: string, summary: string): Promise<CoverImageResult> {
        try {
            const prompt = this.buildImagePrompt(title, summary);

            const result = await this.client.generateImage(
                prompt,
                this.options.imageModel || DEFAULT_OPTIONS.imageModel!,
                this.options.imageSize
            );

            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Image generation failed',
            };
        }
    }

    /**
     * Generate HTML cover using text model
     */
    async generateHTML(title: string, summary: string): Promise<CoverHTMLResult> {
        try {
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `你是一个专业的 HTML/CSS 设计师，擅长创建现代、美观的封面设计。
规则：
1. 只返回 HTML 代码，不要任何解释
2. 使用内联样式，不使用外部 CSS
3. 尺寸使用 900x383 像素（2.35:1 比例）
4. 使用渐变背景和现代设计元素
5. 标题要醒目，字体大小适中
6. 可以使用 emoji 作为装饰元素`,
                },
                {
                    role: 'user',
                    content: `为以下文章生成一个微信公众号封面图 HTML：

标题：${title}
摘要：${summary.substring(0, 200)}

风格偏好：${STYLE_DESCRIPTIONS[this.options.style || 'minimal']}`,
                },
            ];

            const response = await this.client.chatCompletion(messages, {
                temperature: 0.7,
                maxTokens: 2000,
            });

            // Extract HTML from response
            const html = this.extractHTML(response);

            if (!html) {
                return {
                    success: false,
                    error: 'Could not extract valid HTML from AI response',
                };
            }

            return {
                success: true,
                html,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'HTML generation failed',
            };
        }
    }

    /**
     * Build image generation prompt
     */
    private buildImagePrompt(title: string, summary: string): string {
        const styleDesc = STYLE_DESCRIPTIONS[this.options.style || 'minimal'];

        // Extract keywords from title and summary
        const context = `${title}. ${summary.substring(0, 100)}`;

        return `Create a modern blog cover image. Theme: ${context}. Style: ${styleDesc}. The image should be visually striking and suitable for a WeChat article cover. Do not include any text in the image.`;
    }

    /**
     * Extract HTML from AI response
     */
    private extractHTML(response: string): string | null {
        // Try to find HTML block in markdown code fence
        const codeBlockMatch = response.match(/```(?:html)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }

        // Try to find raw HTML
        const htmlMatch = response.match(/<(?:div|section|html)[^>]*>[\s\S]*<\/(?:div|section|html)>/i);
        if (htmlMatch) {
            return htmlMatch[0].trim();
        }

        // If response looks like HTML, return as-is
        if (response.trim().startsWith('<') && response.trim().endsWith('>')) {
            return response.trim();
        }

        return null;
    }
}

/**
 * Create a cover generator
 */
export function createCoverGenerator(
    client: AIClient,
    options?: Partial<CoverGeneratorOptions>
): CoverGenerator {
    return new CoverGenerator(client, options);
}
