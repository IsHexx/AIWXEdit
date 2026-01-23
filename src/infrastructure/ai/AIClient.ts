/**
 * AI Client
 * 
 * Generic AI API client supporting OpenAI-compatible APIs.
 * Supports multiple providers: OpenAI, OpenRouter, DeepSeek, Kimi, Zhipu.
 */

import { requestUrl } from 'obsidian';
import type {
    AIProvider,
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    AIConnectionTestResult,
} from '../../types/ai.types';
import { PROVIDER_DEFAULTS } from '../../types/ai.types';

/**
 * AI Client Configuration
 */
export interface AIClientConfig {
    provider: AIProvider;
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

/**
 * AI Client
 * 
 * Handles API calls to OpenAI-compatible endpoints.
 */
export class AIClient {
    private config: AIClientConfig;

    constructor(config: AIClientConfig) {
        this.config = {
            ...config,
            baseUrl: config.baseUrl || PROVIDER_DEFAULTS[config.provider]?.baseUrl,
            model: config.model || PROVIDER_DEFAULTS[config.provider]?.defaultModel,
        };
    }

    /**
     * Get effective base URL
     */
    getBaseUrl(): string {
        return this.config.baseUrl || PROVIDER_DEFAULTS[this.config.provider].baseUrl;
    }

    /**
     * Get effective model
     */
    getModel(): string {
        return this.config.model || PROVIDER_DEFAULTS[this.config.provider].defaultModel;
    }

    /**
     * Send a chat completion request
     */
    async chatCompletion(
        messages: ChatMessage[],
        options: { temperature?: number; maxTokens?: number } = {}
    ): Promise<string> {
        const url = `${this.getBaseUrl()}/chat/completions`;

        const body: Record<string, unknown> = {
            model: this.getModel(),
            messages,
            temperature: options.temperature ?? 0.7,
        };

        if (options.maxTokens) {
            body.max_tokens = options.maxTokens;
        }

        // Add provider-specific headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        };

        // OpenRouter requires additional headers
        if (this.config.provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://obsidian.md';
            headers['X-Title'] = 'WDWXEdit';
        }

        try {
            const response = await requestUrl({
                url,
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            const data = response.json;

            // Extract content from response
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message?.content || '';
            }

            throw new Error('Invalid response format from AI API');
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`AI API Error: ${error.message}`);
            }
            throw new Error('Unknown AI API error');
        }
    }

    /**
     * Test connection to the AI service
     */
    async testConnection(): Promise<AIConnectionTestResult> {
        const startTime = Date.now();

        try {
            const response = await this.chatCompletion([
                { role: 'user', content: 'Hi' }
            ], { maxTokens: 5 });

            const responseTime = Date.now() - startTime;

            return {
                success: true,
                message: 'Connection successful',
                responseTime,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    /**
     * Generate an image using image generation API
     * Only works with providers that support image generation (e.g., OpenRouter)
     */
    async generateImage(
        prompt: string,
        model: string,
        size: string = '1024x1024'
    ): Promise<{ success: boolean; imageUrl?: string; base64Data?: string; error?: string }> {
        // For OpenRouter, use generations endpoint
        const url = this.config.provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/images/generations'
            : `${this.getBaseUrl()}/images/generations`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        };

        if (this.config.provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://obsidian.md';
            headers['X-Title'] = 'WDWXEdit';
        }

        try {
            const response = await requestUrl({
                url,
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    prompt,
                    n: 1,
                    size,
                }),
            });

            const data = response.json;

            if (data.data && data.data.length > 0) {
                return {
                    success: true,
                    imageUrl: data.data[0].url,
                    base64Data: data.data[0].b64_json,
                };
            }

            return {
                success: false,
                error: 'No image generated',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Image generation failed',
            };
        }
    }
}

/**
 * Create an AI client
 */
export function createAIClient(config: AIClientConfig): AIClient {
    return new AIClient(config);
}
