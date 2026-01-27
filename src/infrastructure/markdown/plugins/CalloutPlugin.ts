/**
 * Callout Plugin
 * 
 * Handles Obsidian-style callout blocks (> [!NOTE], > [!WARNING], etc.)
 * Converts them to styled blockquotes for WeChat.
 */

import type { MarkedExtension } from 'marked';
import { BaseMarkdownPlugin, PluginPriority, type PluginMeta } from './PluginInterface';

/**
 * Callout type configuration
 */
interface CalloutConfig {
    icon: string;
    color: string;
    backgroundColor: string;
    title: string;
}

/**
 * Built-in callout types
 */
const CALLOUT_TYPES: Record<string, CalloutConfig> = {
    note: {
        icon: 'ℹ️',
        color: '#0969da',
        backgroundColor: '#ddf4ff',
        title: '注意',
    },
    tip: {
        icon: '💡',
        color: '#1a7f37',
        backgroundColor: '#dafbe1',
        title: '提示',
    },
    important: {
        icon: '❗',
        color: '#8250df',
        backgroundColor: '#fbefff',
        title: '重要',
    },
    warning: {
        icon: '⚠️',
        color: '#9a6700',
        backgroundColor: '#fff8c5',
        title: '警告',
    },
    caution: {
        icon: '🔴',
        color: '#cf222e',
        backgroundColor: '#ffebe9',
        title: '注意',
    },
    info: {
        icon: 'ℹ️',
        color: '#0969da',
        backgroundColor: '#ddf4ff',
        title: '信息',
    },
    success: {
        icon: '✅',
        color: '#1a7f37',
        backgroundColor: '#dafbe1',
        title: '成功',
    },
    question: {
        icon: '❓',
        color: '#8250df',
        backgroundColor: '#fbefff',
        title: '问题',
    },
    quote: {
        icon: '💬',
        color: '#57606a',
        backgroundColor: '#f6f8fa',
        title: '引用',
    },
};

/**
 * Callout Plugin
 * 
 * Extends marked to handle Obsidian-style callouts.
 */
export class CalloutPlugin extends BaseMarkdownPlugin {
    readonly meta: PluginMeta = {
        id: 'callout',
        name: 'Callout',
        description: 'Obsidian-style callout blocks',
        priority: PluginPriority.PRE, // Process before normal blockquotes
    };

    // Match callout syntax: > [!type] or > [!type] Title
    private calloutRegex = /^>\s*\[!(\w+)\](?:\s+(.+))?\n((?:>.*\n?)*)/gm;

    getExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'callout',
                level: 'block',
                start(src: string) {
                    return src.match(/^>\s*\[!/)?.index;
                },
                tokenizer(src: string) {
                    const match = /^>\s*\[!(\w+)\](?:\s+(.+))?\n((?:>.*(?:\n|$))*)/.exec(src);
                    if (match) {
                        const type = match[1].toLowerCase();
                        const customTitle = match[2]?.trim();
                        const content = match[3]
                            .split('\n')
                            .map(line => line.replace(/^>\s?/, ''))
                            .join('\n')
                            .trim();

                        return {
                            type: 'callout',
                            raw: match[0],
                            calloutType: type,
                            customTitle,
                            content,
                        };
                    }
                    return undefined;
                },
                renderer: (token: unknown) => {
                    if (!token || typeof token !== 'object') return '';
                    const t = token as { calloutType?: unknown; content?: unknown; customTitle?: unknown };
                    if (typeof t.calloutType !== 'string' || typeof t.content !== 'string') return '';
                    return this.renderCallout(t.calloutType, t.content, typeof t.customTitle === 'string' ? t.customTitle : undefined);
                },
            }]
        };
    }

    /**
     * Render a callout block
     */
    private renderCallout(type: string, content: string, customTitle?: string): string {
        const config = CALLOUT_TYPES[type] || CALLOUT_TYPES.note;
        const title = customTitle || config.title;

        return `
<section class="callout callout-${type}" style="margin: 0.8em 0; padding: 16px; border-radius: 8px; background-color: ${config.backgroundColor}; border-left: 4px solid ${config.color};">
    <div class="callout-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: ${config.color};">
        <span class="callout-icon">${config.icon}</span>
        <span>${title}</span>
    </div>
    <div class="callout-content" style="color: #24292f;">
        ${content}
    </div>
</section>`.trim();
    }
}

/**
 * Get callout CSS
 */
export function getCalloutCSS(): string {
    return `
.callout {
    margin: 0.8em 0;
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid;
}

.callout-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
}

.callout-icon {
    font-size: 1.2em;
}

.callout-content p:first-child {
    margin-top: 0;
}

.callout-content p:last-child {
    margin-bottom: 0;
}
    `.trim();
}
