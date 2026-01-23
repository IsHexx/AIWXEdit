/**
 * Title Generator
 * 
 * Generates engaging article titles using AI.
 */

import type { ChatMessage, TitleGenerationResult } from '../../types/ai.types';
import { AIClient } from './AIClient';

/**
 * Default title generation prompt
 */
export const DEFAULT_TITLE_PROMPT = `给我 5 个适合这篇文章的公众号标题：

每个标题必须包含：
- 一个具体数字（如果适用）
- 明确目标人群或应用场景
- 一个强价值承诺或解决方案
- 一个吸引点击的悬念或对比冲突

标题风格：口语化、直接、信息密度高，长度控制在 14-25 字。

请直接列出标题，每行一个，不需要序号。`;

/**
 * Title Generator Options
 */
export interface TitleGeneratorOptions {
    /** Custom prompt template */
    customPrompt?: string;
    /** Number of titles to generate */
    count?: number;
}

/**
 * Title Generator
 * 
 * Uses AI to generate engaging article titles.
 */
export class TitleGenerator {
    private client: AIClient;
    private customPrompt: string;

    constructor(client: AIClient, options: TitleGeneratorOptions = {}) {
        this.client = client;
        this.customPrompt = options.customPrompt || DEFAULT_TITLE_PROMPT;
    }

    /**
     * Set custom prompt
     */
    setPrompt(prompt: string): void {
        this.customPrompt = prompt;
    }

    /**
     * Generate titles for article content
     */
    async generate(articleContent: string, contentLimit: number = 2000): Promise<TitleGenerationResult> {
        try {
            // Truncate content if too long
            const truncatedContent = articleContent.length > contentLimit
                ? articleContent.substring(0, contentLimit) + '...'
                : articleContent;

            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: '你是一个专业的公众号标题撰写专家，擅长写出吸引眼球且有深度的标题。',
                },
                {
                    role: 'user',
                    content: `${this.customPrompt}\n\n文章内容：\n${truncatedContent}`,
                },
            ];

            const response = await this.client.chatCompletion(messages, {
                temperature: 0.8,
                maxTokens: 500,
            });

            // Parse titles from response
            const titles = this.parseTitles(response);

            if (titles.length === 0) {
                return {
                    success: false,
                    titles: [],
                    error: 'No titles could be extracted from AI response',
                };
            }

            return {
                success: true,
                titles,
            };
        } catch (error) {
            return {
                success: false,
                titles: [],
                error: error instanceof Error ? error.message : 'Title generation failed',
            };
        }
    }

    /**
     * Parse titles from AI response
     */
    private parseTitles(response: string): string[] {
        // Split by newlines and clean up
        const lines = response.split('\n')
            .map(line => line.trim())
            // Remove numbering (1. 2. 3. or 1、2、3、 or • -)
            .map(line => line.replace(/^[\d]+[.、)\]]\s*/, '').replace(/^[•\-\*]\s*/, ''))
            // Filter empty lines and lines that are too short
            .filter(line => line.length > 5 && line.length < 50)
            // Remove quotes if present
            .map(line => line.replace(/^["「『]/, '').replace(/["」』]$/, ''));

        return lines.slice(0, 10); // Max 10 titles
    }
}

/**
 * Create a title generator
 */
export function createTitleGenerator(client: AIClient, options?: TitleGeneratorOptions): TitleGenerator {
    return new TitleGenerator(client, options);
}
