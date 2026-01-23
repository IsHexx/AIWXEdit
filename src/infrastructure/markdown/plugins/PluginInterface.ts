/**
 * Markdown Plugin Interface
 * 
 * Defines the contract for markdown parsing plugins.
 * Each plugin can extend marked.js functionality.
 */

import type { MarkedExtension } from 'marked';

/**
 * Plugin priority levels
 * Higher priority plugins are processed first
 */
export enum PluginPriority {
    /** Pre-processing plugins (run first) */
    PRE = 100,
    /** Normal plugin priority */
    NORMAL = 50,
    /** Post-processing plugins (run last) */
    POST = 0,
}

/**
 * Plugin metadata
 */
export interface PluginMeta {
    /** Unique plugin identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Plugin description */
    description?: string;
    /** Plugin priority */
    priority: PluginPriority;
}

/**
 * Markdown Plugin Interface
 * 
 * All markdown plugins must implement this interface.
 */
export interface MarkdownPlugin {
    /** Plugin metadata */
    readonly meta: PluginMeta;

    /**
     * Get the marked extension configuration
     * This is called when the plugin is registered
     */
    getExtension(): MarkedExtension;

    /**
     * Initialize the plugin
     * Called once when the plugin is first loaded
     */
    initialize?(): void | Promise<void>;

    /**
     * Cleanup when plugin is unloaded
     */
    destroy?(): void;
}

/**
 * Base class for markdown plugins
 * Provides common functionality and default implementations
 */
export abstract class BaseMarkdownPlugin implements MarkdownPlugin {
    abstract readonly meta: PluginMeta;

    abstract getExtension(): MarkedExtension;

    initialize(): void {
        // Default: no initialization needed
    }

    destroy(): void {
        // Default: no cleanup needed
    }
}

/**
 * Plugin registry for managing markdown plugins
 */
export class PluginRegistry {
    private plugins: Map<string, MarkdownPlugin> = new Map();

    /**
     * Register a plugin
     */
    register(plugin: MarkdownPlugin): void {
        if (this.plugins.has(plugin.meta.id)) {
            console.warn(`Plugin ${plugin.meta.id} is already registered, replacing...`);
        }
        this.plugins.set(plugin.meta.id, plugin);
        plugin.initialize?.();
    }

    /**
     * Unregister a plugin
     */
    unregister(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.destroy?.();
            this.plugins.delete(pluginId);
        }
    }

    /**
     * Get a plugin by ID
     */
    get(pluginId: string): MarkdownPlugin | undefined {
        return this.plugins.get(pluginId);
    }

    /**
     * Get all plugins sorted by priority (highest first)
     */
    getAll(): MarkdownPlugin[] {
        return Array.from(this.plugins.values())
            .sort((a, b) => b.meta.priority - a.meta.priority);
    }

    /**
     * Get all marked extensions from registered plugins
     */
    getExtensions(): MarkedExtension[] {
        return this.getAll().map(p => p.getExtension());
    }

    /**
     * Clear all plugins
     */
    clear(): void {
        for (const plugin of this.plugins.values()) {
            plugin.destroy?.();
        }
        this.plugins.clear();
    }
}
