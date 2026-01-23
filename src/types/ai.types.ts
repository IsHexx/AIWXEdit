/**
 * AI Service Type Definitions
 * 
 * Defines all types related to AI service integration.
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'openrouter' | 'zhipu' | 'deepseek' | 'kimi';

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
    role: MessageRole;
    content: string;
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
}

/**
 * Chat completion response choice
 */
export interface ChatCompletionChoice {
    index: number;
    message: ChatMessage;
    finishReason: string;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
    id: string;
    choices: ChatCompletionChoice[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Title generation result
 */
export interface TitleGenerationResult {
    success: boolean;
    titles: string[];
    error?: string;
}

/**
 * Cover generation style
 */
export type CoverStyle = 'realistic' | 'artistic' | 'minimal' | 'abstract';

/**
 * Cover generation request
 */
export interface CoverGenerationRequest {
    /** Article title */
    title: string;
    /** Article summary/content preview */
    summary: string;
    /** Cover style */
    style?: CoverStyle;
    /** Image size (e.g., "1024x1024") */
    size?: string;
}

/**
 * Cover generation result (image)
 */
export interface CoverImageResult {
    success: boolean;
    imageUrl?: string;
    base64Data?: string;
    error?: string;
}

/**
 * Cover generation result (HTML)
 */
export interface CoverHTMLResult {
    success: boolean;
    html?: string;
    error?: string;
}

/**
 * AI connection test result
 */
export interface AIConnectionTestResult {
    success: boolean;
    message: string;
    responseTime?: number;
}

/**
 * Provider configuration defaults
 */
export interface ProviderDefaults {
    name: string;
    baseUrl: string;
    defaultModel: string;
}

/**
 * Default configurations for supported providers
 */
export const PROVIDER_DEFAULTS: Record<AIProvider, ProviderDefaults> = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
    },
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'openai/gpt-3.5-turbo',
    },
    zhipu: {
        name: '智谱 AI',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4',
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
    },
    kimi: {
        name: 'Kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultModel: 'moonshot-v1-8k',
    },
};

/**
 * Image generation models available on OpenRouter
 */
export const IMAGE_GENERATION_MODELS = {
    'black-forest-labs/flux-schnell-free': {
        name: 'FLUX Schnell (免费)',
        price: '免费',
    },
    'black-forest-labs/flux-schnell': {
        name: 'FLUX Schnell',
        price: '$0.003/图',
    },
    'black-forest-labs/flux-dev': {
        name: 'FLUX Dev',
        price: '$0.025/图',
    },
    'black-forest-labs/flux-pro': {
        name: 'FLUX Pro',
        price: '$0.05/图',
    },
} as const;
