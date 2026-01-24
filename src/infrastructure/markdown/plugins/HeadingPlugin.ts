/**
 * Heading Plugin
 * 
 * Customizes heading rendering with anchor IDs and styling.
 */

import type { MarkedExtension } from 'marked';
import { BaseMarkdownPlugin, PluginPriority, type PluginMeta } from './PluginInterface';

/**
 * Heading rendering options
 */
export interface HeadingOptions {
    /** Add anchor IDs to headings */
    addAnchors: boolean;
    /** Prefix for anchor IDs */
    anchorPrefix: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: HeadingOptions = {
    addAnchors: false, // WeChat doesn't support anchors well
    anchorPrefix: 'heading-',
};

/**
 * Heading Plugin
 */
export class HeadingPlugin extends BaseMarkdownPlugin {
    readonly meta: PluginMeta = {
        id: 'heading',
        name: 'Heading',
        description: 'Custom heading rendering',
        priority: PluginPriority.NORMAL,
    };

    private options: HeadingOptions;
    private headingCounter = 0;

    constructor(options: Partial<HeadingOptions> = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    getExtension(): MarkedExtension {
        const self = this;

        return {
            renderer: {
                heading(text: string, level: number): string {
                    return self.renderHeading(text, level);
                }
            }
        };
    }

    /**
     * Reset heading counter (call before parsing new document)
     */
    reset(): void {
        this.headingCounter = 0;
    }

    /**
     * Render a heading
     */
    private renderHeading(text: string, level: number): string {
        this.headingCounter++;

        const tag = `h${level}`;
        const id = this.options.addAnchors
            ? ` id="${this.options.anchorPrefix}${this.headingCounter}"`
            : '';

        // Apply WeChat-compatible inline styles
        const styles = this.getHeadingStyles(level);

        return `<${tag}${id} style="${styles}">${text}</${tag}>\n`;
    }

    /**
     * Get inline styles for heading level
     */
    private getHeadingStyles(level: number): string {
        const baseStyles = 'margin-top: 1.2em; margin-bottom: 0.4em; font-weight: 600; color: #1a1a1a;';

        const sizeStyles: Record<number, string> = {
            1: 'font-size: 1.8em;',
            2: 'font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em;',
            3: 'font-size: 1.25em;',
            4: 'font-size: 1.1em;',
            5: 'font-size: 1em;',
            6: 'font-size: 0.9em; color: #57606a;',
        };

        return `${baseStyles} ${sizeStyles[level] || sizeStyles[4]}`;
    }
}
