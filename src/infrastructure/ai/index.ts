/**
 * AI Infrastructure Module
 * 
 * Exports all AI-related functionality.
 */

// Client
export { AIClient, createAIClient, type AIClientConfig } from './AIClient';

// Title generation
export {
    TitleGenerator,
    createTitleGenerator,
    DEFAULT_TITLE_PROMPT,
    type TitleGeneratorOptions,
} from './TitleGenerator';

// Cover generation
export {
    CoverGenerator,
    createCoverGenerator,
    type CoverMode,
    type CoverGeneratorOptions,
} from './CoverGenerator';
