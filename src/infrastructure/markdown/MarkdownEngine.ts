/**
 * Markdown Engine
 * 
 * Core markdown parsing and rendering engine.
 * Uses marked.js with a plugin system for extensibility.
 */

import { Marked, type Token, type TokensList } from 'marked';
import { PluginRegistry, type MarkdownPlugin } from './plugins/PluginInterface';

/**
 * Markdown rendering options
 */
export interface RenderOptions {
    /** Whether to sanitize HTML output */
    sanitize?: boolean;
    /** Whether to use GFM (GitHub Flavored Markdown) */
    gfm?: boolean;
    /** Whether to add breaks on single newlines */
    breaks?: boolean;
    /** Base URL for relative links */
    baseUrl?: string;
}

/**
 * Default render options
 */
const DEFAULT_RENDER_OPTIONS: RenderOptions = {
    sanitize: false,
    gfm: true,
    breaks: false,
};

/**
 * Markdown Engine
 * 
 * Main class for parsing and rendering markdown content.
 * Supports a plugin system for extending functionality.
 */
export class MarkdownEngine {
    private static instance: MarkdownEngine | null = null;

    private marked: Marked;
    private pluginRegistry: PluginRegistry;
    private isInitialized = false;

    private constructor() {
        this.marked = new Marked();
        this.pluginRegistry = new PluginRegistry();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): MarkdownEngine {
        if (!MarkdownEngine.instance) {
            MarkdownEngine.instance = new MarkdownEngine();
        }
        return MarkdownEngine.instance;
    }

    /**
     * Initialize the engine with default plugins
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Configure marked with default options
        this.marked.setOptions({
            gfm: true,
            breaks: false,
        });

        // Register built-in plugins
        await this.registerBuiltInPlugins();

        this.isInitialized = true;
    }

    /**
     * Register built-in plugins
     */
    private async registerBuiltInPlugins(): Promise<void> {
        // Plugins will be registered here as they are implemented
        // Example:
        // this.registerPlugin(new CodeBlockPlugin());
        // this.registerPlugin(new MathPlugin());
        // this.registerPlugin(new CalloutPlugin());
    }

    /**
     * Register a plugin
     */
    registerPlugin(plugin: MarkdownPlugin): void {
        this.pluginRegistry.register(plugin);
        this.rebuildExtensions();
    }

    /**
     * Unregister a plugin
     */
    unregisterPlugin(pluginId: string): void {
        this.pluginRegistry.unregister(pluginId);
        this.rebuildExtensions();
    }

    /**
     * Rebuild marked extensions from registered plugins
     */
    private rebuildExtensions(): void {
        // Create a new Marked instance with all extensions
        this.marked = new Marked();

        const extensions = this.pluginRegistry.getExtensions();
        for (const ext of extensions) {
            this.marked.use(ext);
        }
    }

    /**
     * Parse markdown to HTML
     */
    parse(markdown: string, options?: RenderOptions): string {
        const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };

        // Apply options to marked
        this.marked.setOptions({
            gfm: opts.gfm,
            breaks: opts.breaks,
        });

        // Parse markdown to HTML
        const html = this.marked.parse(markdown);

        return typeof html === 'string' ? html : '';
    }

    /**
     * Parse markdown to tokens (for advanced processing)
     */
    tokenize(markdown: string): TokensList {
        return this.marked.lexer(markdown);
    }

    /**
     * Render tokens to HTML
     */
    render(tokens: Token[]): string {
        return this.marked.parser(tokens as TokensList);
    }

    /**
     * Get the plugin registry
     */
    getPluginRegistry(): PluginRegistry {
        return this.pluginRegistry;
    }

    /**
     * Check if engine is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Cleanup and reset the engine
     */
    destroy(): void {
        this.pluginRegistry.clear();
        this.marked = new Marked();
        this.isInitialized = false;
    }
}

/**
 * Get the markdown engine instance
 */
export function getMarkdownEngine(): MarkdownEngine {
    return MarkdownEngine.getInstance();
}
