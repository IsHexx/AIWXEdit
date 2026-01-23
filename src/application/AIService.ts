/**
 * AI Service
 * 
 * Application service for AI-powered features.
 * Coordinates title and cover generation.
 */

import type { TitleGenerationResult, CoverImageResult, CoverHTMLResult, AIProvider } from '../types/ai.types';
import { AIClient, createAIClient, TitleGenerator, CoverGenerator, type CoverMode } from '../infrastructure/ai';
import { getSettingsStore } from '../infrastructure/storage';
import type { CoverStyle } from '../types/ai.types';

/**
 * AI Service
 * 
 * Provides high-level AI functionality for the plugin.
 */
export class AIService {
    private static instance: AIService | null = null;

    private client: AIClient | null = null;
    private titleGenerator: TitleGenerator | null = null;
    private coverGenerator: CoverGenerator | null = null;

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    /**
     * Initialize or reinitialize with current settings
     */
    initialize(): void {
        const settings = getSettingsStore().getAIConfig();

        if (!settings.enabled || !settings.apiKey) {
            this.client = null;
            this.titleGenerator = null;
            this.coverGenerator = null;
            return;
        }

        this.client = createAIClient({
            provider: settings.provider as AIProvider,
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
        });

        this.titleGenerator = new TitleGenerator(this.client, {
            customPrompt: settings.titlePrompt,
        });

        this.coverGenerator = new CoverGenerator(this.client, {
            mode: settings.coverMethod as CoverMode || 'image',
            imageModel: settings.coverModel,
            style: 'minimal' as CoverStyle,
        });
    }

    /**
     * Check if AI is available
     */
    isAvailable(): boolean {
        return this.client !== null;
    }

    /**
     * Test AI connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.client) {
            return { success: false, message: 'AI not configured' };
        }
        return this.client.testConnection();
    }

    /**
     * Generate titles for article content
     */
    async generateTitles(content: string): Promise<TitleGenerationResult> {
        if (!this.titleGenerator) {
            return { success: false, titles: [], error: 'AI not configured' };
        }
        return this.titleGenerator.generate(content);
    }

    /**
     * Generate cover image
     */
    async generateCover(
        title: string,
        summary: string
    ): Promise<CoverImageResult | CoverHTMLResult> {
        if (!this.coverGenerator) {
            return { success: false, error: 'AI not configured' };
        }
        return this.coverGenerator.generate(title, summary);
    }

    /**
     * Generate cover as image
     */
    async generateCoverImage(title: string, summary: string): Promise<CoverImageResult> {
        if (!this.coverGenerator) {
            return { success: false, error: 'AI not configured' };
        }
        return this.coverGenerator.generateImage(title, summary);
    }

    /**
     * Generate cover as HTML
     */
    async generateCoverHTML(title: string, summary: string): Promise<CoverHTMLResult> {
        if (!this.coverGenerator) {
            return { success: false, error: 'AI not configured' };
        }
        return this.coverGenerator.generateHTML(title, summary);
    }

    /**
     * Update title prompt
     */
    setTitlePrompt(prompt: string): void {
        this.titleGenerator?.setPrompt(prompt);
    }

    /**
     * Set cover generation mode
     */
    setCoverMode(mode: CoverMode): void {
        this.coverGenerator?.setMode(mode);
    }
}

/**
 * Get AI service instance
 */
export function getAIService(): AIService {
    return AIService.getInstance();
}
