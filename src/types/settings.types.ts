/**
 * Settings Type Definitions
 * 
 * Defines all configuration types for the plugin settings.
 */

/**
 * WeChat Official Account configuration
 */
export interface WechatAccountConfig {
    /** Account name/alias for display */
    name: string;
    /** WeChat App ID */
    appId: string;
    /** WeChat App Secret */
    appSecret: string;
    /** Default author name for articles */
    author?: string;
    /** Default cover image (vault path, optional) */
    defaultCoverPath?: string;
    /** Default cover media id (optional) */
    defaultCoverMediaId?: string;
    /** Whether this is the default account */
    isDefault?: boolean;
}

/**
 * Link display style options
 */
export type LinkStyle = 'footnote' | 'inline' | 'hidden';

/**
 * Embed block display style options
 */
export type EmbedStyle = 'quote' | 'inline' | 'hidden';

/**
 * AI cover generation method
 */
export type AICoverMethod = 'image' | 'html';

/**
 * Article styling configuration
 */
export interface StyleConfig {
    /** Theme name */
    theme: string;
    /** Code highlight theme */
    highlight: string;
    /** Font family */
    fontFamily: string;
    /** Font size */
    fontSize: string;
    /** Primary color */
    primaryColor: string;
    /** Show line numbers in code blocks */
    showLineNumbers: boolean;
    /** Use custom CSS */
    useCustomCSS: boolean;
    /** Custom CSS content */
    customCSS: string;
}

/**
 * AI feature configuration
 */
export interface AIConfig {
    /** Whether AI features are enabled */
    enabled: boolean;
    /** AI provider (openai, openrouter, zhipu, deepseek, kimi) */
    provider: string;
    /** API key */
    apiKey: string;
    /** API base URL */
    baseUrl: string;
    /** Model name */
    model: string;
    /** Custom title generation prompt */
    titlePrompt: string;
    /** Cover generation method */
    coverMethod: AICoverMethod;
    /** Cover generation model */
    coverModel: string;
    /** Whether to enable cover generation */
    enableCover: boolean;
}

/**
 * Plugin settings
 */
export interface PluginSettings {
    /** WeChat accounts configuration */
    accounts: WechatAccountConfig[];
    /** Default account index */
    defaultAccountIndex: number;
    /** Style configuration */
    style: StyleConfig;
    /** AI configuration */
    ai: AIConfig;
    /** Link display style */
    linkStyle: LinkStyle;
    /** Embed block display style */
    embedStyle: EmbedStyle;
    /** Show style editor UI */
    showStyleUI: boolean;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    accounts: [],
    defaultAccountIndex: 0,
    style: {
        theme: 'default',
        highlight: 'panda-syntax-light',
        fontFamily: 'system-ui',
        fontSize: '16px',
        primaryColor: '#1a73e8',
        showLineNumbers: true,
        useCustomCSS: false,
        customCSS: '',
    },
    ai: {
        enabled: false,
        provider: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        titlePrompt: '',
        coverMethod: 'image',
        coverModel: 'flux-schnell-free',
        enableCover: true,
    },
    linkStyle: 'footnote',
    embedStyle: 'quote',
    showStyleUI: true,
};
