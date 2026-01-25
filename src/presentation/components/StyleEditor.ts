/**
 * Style Editor Component
 * 
 * Provides UI for editing article styles with theme/highlight switching.
 */

import type { StyleConfig } from '../../types/settings.types';

/**
 * Theme definition
 */
export interface ThemeDefinition {
    name: string;
    className: string;
    description?: string;
    /** Theme style overrides */
    styles?: {
        primaryColor?: string;
        fontFamily?: string;
        backgroundColor?: string;
        codeBackground?: string;
    };
}

/**
 * Highlight theme definition
 */
export interface HighlightDefinition {
    name: string;
    className: string;
}

/**
 * Built-in themes with style presets
 */
export const BUILTIN_THEMES: ThemeDefinition[] = [
    { name: '默认', className: 'default', styles: { primaryColor: '#1a73e8', fontFamily: '等线' } },
    { name: '石墨', className: 'graphite', styles: { primaryColor: '#2d3748', fontFamily: '等线' } },
    { name: '翠绿', className: 'green', styles: { primaryColor: '#10b981', fontFamily: '等线' } },
    { name: '活力橙', className: 'orange', styles: { primaryColor: '#f59e0b', fontFamily: '等线' } },
    { name: '典雅紫', className: 'purple', styles: { primaryColor: '#8b5cf6', fontFamily: '等线' } },
    { name: '朱砂红', className: 'red', styles: { primaryColor: '#ef4444', fontFamily: '等线' } },
    { name: '无衬线', className: 'sans', styles: { primaryColor: '#1a73e8', fontFamily: 'sans-serif' } },
    { name: '衬线体', className: 'serif', styles: { primaryColor: '#2d3748', fontFamily: 'serif' } },
];

/**
 * Built-in highlight themes
 */
export const BUILTIN_HIGHLIGHTS: HighlightDefinition[] = [
    // Pick 10 distinct highlight.js themes (mirrors md project's common list)
    { name: 'Monokai', className: 'monokai' },
    { name: 'Night Owl', className: 'night-owl' },
    { name: 'NNFX Dark', className: 'nnfx-dark' },
    { name: 'NNFX Light', className: 'nnfx-light' },
    { name: 'Nord', className: 'nord' },
    { name: 'Obsidian', className: 'obsidian' },
    { name: 'Panda Syntax Dark', className: 'panda-syntax-dark' },
    { name: 'Panda Syntax Light', className: 'panda-syntax-light' },
    { name: 'Paraiso Dark', className: 'paraiso-dark' },
    { name: 'Pojoaque', className: 'pojoaque' },
];

/**
 * Font options
 */
export const FONT_OPTIONS = [
    { value: '等线', text: '等线' },
    { value: 'sans-serif', text: '无衬线' },
    { value: 'serif', text: '衬线' },
    { value: 'monospace', text: '等宽' },
];

/**
 * Font size options
 */
export const FONT_SIZE_OPTIONS = [
    { value: '14px', text: '14px' },
    { value: '15px', text: '15px' },
    { value: '16px', text: '16px (推荐)' },
    { value: '17px', text: '17px' },
    { value: '18px', text: '18px' },
];

/**
 * Primary color presets
 */
export const COLOR_PRESETS = [
    { value: '#2d3748', text: '石墨黑' },
    { value: '#1a73e8', text: '经典蓝' },
    { value: '#10b981', text: '翠绿' },
    { value: '#f59e0b', text: '橙黄' },
    { value: '#ef4444', text: '朱红' },
    { value: '#8b5cf6', text: '紫罗兰' },
];

/**
 * Style editor events
 */
export interface StyleEditorEvents {
    onThemeChanged?: (theme: string) => void;
    onHighlightChanged?: (highlight: string) => void;
    onFontChanged?: (font: string) => void;
    onFontSizeChanged?: (size: string) => void;
    onPrimaryColorChanged?: (color: string) => void;
    onStyleReset?: () => void;
}

/**
 * Style Editor
 * 
 * Component for editing article styling options.
 */
export class StyleEditor {
    private container: HTMLElement;
    private events: StyleEditorEvents;
    private currentStyle: Partial<StyleConfig>;
    private themes: ThemeDefinition[];
    private highlights: HighlightDefinition[];

    constructor(
        container: HTMLElement,
        events: StyleEditorEvents,
        initialStyle?: Partial<StyleConfig>,
        options: { themes?: ThemeDefinition[]; highlights?: HighlightDefinition[] } = {}
    ) {
        this.container = container;
        this.events = events;
        this.currentStyle = initialStyle || {};
        this.themes = options.themes && options.themes.length > 0 ? options.themes : BUILTIN_THEMES;
        this.highlights = options.highlights && options.highlights.length > 0 ? options.highlights : BUILTIN_HIGHLIGHTS;
    }

    /**
     * Render the style editor UI
     */
    render(): void {
        this.container.empty();
        this.container.addClass('style-editor');

        // Create row container
        const row = this.container.createDiv({ cls: 'style-editor-row' });

        // Theme selector
        this.createDropdown(row, '样式', this.themes,
            this.currentStyle.theme || 'default',
            (value) => this.events.onThemeChanged?.(value)
        );

        // Highlight selector
        this.createDropdown(row, '代码高亮', this.highlights,
            this.currentStyle.highlight || 'github',
            (value) => this.events.onHighlightChanged?.(value)
        );

        // Font selector
        this.createDropdown(row, '字体', FONT_OPTIONS,
            this.currentStyle.fontFamily || '等线',
            (value) => this.events.onFontChanged?.(value),
            'text'
        );

        // Font size selector
        this.createDropdown(row, '字号', FONT_SIZE_OPTIONS,
            this.currentStyle.fontSize || '16px',
            (value) => this.events.onFontSizeChanged?.(value)
        );

        // Primary color selector
        this.createColorPicker(row);
    }

    /**
     * Create a dropdown selector
     */
    private createDropdown(
        container: HTMLElement,
        label: string,
        options: Array<{ name?: string; className?: string; value?: string; text?: string }>,
        currentValue: string,
        onChange: (value: string) => void,
        valueField: 'className' | 'value' | 'text' | 'name' = 'className'
    ): HTMLSelectElement {
        const group = container.createDiv({ cls: 'style-dropdown-group' });
        group.createEl('label', { text: `${label}:`, cls: 'style-dropdown-label' });

        const select = group.createEl('select', { cls: 'style-dropdown' });

        options.forEach(opt => {
            const optionEl = select.createEl('option');
            const value = (opt as any)[valueField] || opt.value || opt.className || '';
            const text = opt.text || opt.name || '';
            optionEl.value = value;
            optionEl.textContent = text;

            if (value === currentValue || text === currentValue) {
                optionEl.selected = true;
            }
        });

        select.onchange = () => onChange(select.value);

        return select;
    }

    /**
     * Create color picker
     */
    private createColorPicker(container: HTMLElement): void {
        const group = container.createDiv({ cls: 'style-dropdown-group' });
        group.createEl('label', { text: '主题色:', cls: 'style-dropdown-label' });

        const select = group.createEl('select', { cls: 'style-dropdown' });
        const currentColor = this.currentStyle.primaryColor || '#1a73e8';
        let isPreset = false;

        COLOR_PRESETS.forEach(color => {
            const option = select.createEl('option');
            option.value = color.value;
            option.textContent = color.text;
            if (color.value === currentColor) {
                option.selected = true;
                isPreset = true;
            }
        });

        // Custom option
        const customOption = select.createEl('option');
        customOption.value = 'custom';
        customOption.textContent = isPreset ? '自定义' : `自定义 (${currentColor})`;
        if (!isPreset) {
            customOption.selected = true;
        }

        // Color input
        const colorInput = group.createEl('input', {
            type: 'color',
            cls: 'color-input',
        }) as HTMLInputElement;
        colorInput.value = currentColor;
        colorInput.style.display = isPreset ? 'none' : 'inline-block';

        select.onchange = () => {
            if (select.value === 'custom') {
                colorInput.style.display = 'inline-block';
                this.events.onPrimaryColorChanged?.(colorInput.value);
            } else {
                colorInput.style.display = 'none';
                this.events.onPrimaryColorChanged?.(select.value);
            }
        };

        colorInput.oninput = () => {
            customOption.textContent = `自定义 (${colorInput.value})`;
            this.events.onPrimaryColorChanged?.(colorInput.value);
        };
    }

    /**
     * Update current style
     */
    updateStyle(style: Partial<StyleConfig>): void {
        this.currentStyle = { ...this.currentStyle, ...style };
    }
}

/**
 * Get style editor CSS
 */
export function getStyleEditorCSS(): string {
    return `
.style-editor {
    background: #f8f8f8;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
}

.style-editor-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.style-dropdown-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.style-dropdown-label {
    font-size: 13px;
    color: var(--text-normal);
    white-space: nowrap;
}

.style-dropdown {
    padding: 4px 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 13px;
    cursor: pointer;
    min-width: 80px;
}

.style-dropdown:hover {
    border-color: var(--interactive-accent);
}

.color-input {
    width: 32px;
    height: 28px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    cursor: pointer;
    padding: 2px;
    margin-left: 4px;
}
    `.trim();
}
