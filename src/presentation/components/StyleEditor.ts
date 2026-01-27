/**
 * Style Editor Component
 * 
 * Provides UI for editing article styles with theme/highlight switching.
 */

import type { StyleConfig } from '../../types/settings.types';
import { Menu, setIcon } from 'obsidian';

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
];

/**
 * Built-in highlight themes
 */
export const BUILTIN_HIGHLIGHTS: HighlightDefinition[] = [
    { name: 'GitHub', className: 'github' },
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
    onCustomCSSChanged?: (css: string) => void;
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
        // Remove direct style classes like 'style-editor' if they conflict, 
        // but our CSS uses .wdwxedit-style-editor-container > children hierarchy or specific classes.

        // Content
        const content = this.container.createDiv({ cls: 'style-editor-content' });

        // Row 1: Dropdowns and Reset Button
        const row = content.createDiv({ cls: 'style-editor-row' });

        // Theme selector
        this.createThemeDropdown(row, this.themes, this.currentStyle.theme || 'default');

        // Highlight selector
        this.createHighlightDropdown(row, this.highlights, this.currentStyle.highlight || 'github');

        // Font selector
        this.createFontDropdown(row, FONT_OPTIONS, this.currentStyle.fontFamily || '等线');

        // Font size selector
        this.createFontSizeDropdown(row, FONT_SIZE_OPTIONS, this.currentStyle.fontSize || '16px');

        // Primary color selector
        this.createColorPicker(row);

        // Row 2: Custom CSS (Conditional)
        if (this.currentStyle.useCustomCSS) {
            const cssRow = content.createDiv({ cls: 'style-custom-css-row' });
            cssRow.createEl('label', { text: '自定义样式:', cls: 'style-custom-css-label' });

            const textarea = cssRow.createEl('textarea', { cls: 'style-custom-css-input' });
            textarea.placeholder = '在此输入自定义样式';
            textarea.value = this.currentStyle.customCSS || '';

            textarea.oninput = () => {
                this.events.onCustomCSSChanged?.(textarea.value);
            };
        }
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

        const iconName =
            label === '样式' ? 'palette' :
                label === '代码高亮' ? 'code' :
                    label === '字体' ? 'type' :
                        label === '字号' ? 'text' :
                            null;

        if (iconName) {
            const icon = group.createSpan({ cls: 'style-dropdown-icon' });
            setIcon(icon, iconName);
        } else {
            group.createEl('label', { text: `${label}:`, cls: 'style-dropdown-label' });
        }

        const select = group.createEl('select', { cls: 'style-dropdown' });
        select.setAttr('aria-label', label);

        options.forEach(opt => {
            const optionEl = select.createEl('option');
            const value = opt[valueField] || opt.value || opt.className || '';
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

    private createThemeDropdown(
        container: HTMLElement,
        themes: ThemeDefinition[],
        currentValue: string,
    ): void {
        const group = container.createDiv({ cls: 'style-dropdown-group style-theme-dropdown-group' });

        const icon = group.createSpan({ cls: 'style-dropdown-icon' });
        setIcon(icon, 'palette');

        const button = group.createEl('button', {
            cls: 'style-dropdown style-theme-trigger',
            attr: { type: 'button', 'aria-label': '主题' },
        });

        const dot = button.createSpan({ cls: 'style-theme-dot' });
        const label = button.createSpan({ cls: 'style-theme-text' });
        const chevron = button.createSpan({ cls: 'style-theme-chevron' });
        setIcon(chevron, 'chevron-down');

        const applyValue = (value: string) => {
            const theme = themes.find((t) => t.className === value) ?? themes[0];
            const name = theme?.name ?? value;
            const color = theme?.styles?.primaryColor ?? 'var(--interactive-accent)';
            dot.setCssProps({ backgroundColor: color });
            label.textContent = name;
            this.currentStyle.theme = value;
        };

        applyValue(currentValue);

        button.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const selectedValue = this.currentStyle.theme ?? currentValue;
            const doc = button.ownerDocument;

            const menu = new Menu().setNoIcon().setUseNativeMenu(false);

            themes.forEach((theme) => {
                menu.addItem((item) => {
                    const frag = doc.createDocumentFragment();
                    const rowEl = doc.createElement('div');
                    rowEl.className = 'wdwxedit-theme-menu-item';
                    if (theme.className === selectedValue) {
                        rowEl.classList.add('is-selected');
                    }

                    const dotEl = doc.createElement('span');
                    dotEl.className = 'wdwxedit-theme-menu-dot';
                    dotEl.setCssProps({ backgroundColor: theme.styles?.primaryColor ?? 'var(--interactive-accent)' });

                    const textEl = doc.createElement('span');
                    textEl.className = 'wdwxedit-theme-menu-text';
                    textEl.textContent = theme.name;

                    const checkEl = doc.createElement('span');
                    checkEl.className = 'wdwxedit-theme-menu-check';
                    setIcon(checkEl, 'check');

                    rowEl.append(dotEl, textEl, checkEl);
                    frag.append(rowEl);
                    item.setTitle(frag);
                    item.onClick(() => {
                        applyValue(theme.className);
                        this.events.onThemeChanged?.(theme.className);
                    });
                });
            });

            const rect = button.getBoundingClientRect();
            const win = doc.defaultView ?? window;

            // Use a synthetic mouse event to let Obsidian position the menu correctly
            // under different layout/zoom/transform scenarios.
            const posEvt = new MouseEvent('contextmenu', {
                view: win,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left),
                clientY: Math.round(rect.bottom + 4),
            });
            menu.showAtMouseEvent(posEvt);
        });
    }

    private createHighlightDropdown(
        container: HTMLElement,
        highlights: HighlightDefinition[],
        currentValue: string,
    ): void {
        const group = container.createDiv({ cls: 'style-dropdown-group style-highlight-dropdown-group' });

        const icon = group.createSpan({ cls: 'style-dropdown-icon' });
        setIcon(icon, 'code');

        const button = group.createEl('button', {
            cls: 'style-dropdown style-highlight-trigger',
            attr: { type: 'button', 'aria-label': '代码高亮' },
        });

        const label = button.createSpan({ cls: 'style-highlight-text' });
        const chevron = button.createSpan({ cls: 'style-highlight-chevron' });
        setIcon(chevron, 'chevron-down');

        const applyValue = (value: string) => {
            const highlight = highlights.find((h) => h.className === value) ?? highlights[0];
            const name = highlight?.name ?? value;
            label.textContent = name;
            this.currentStyle.highlight = value;
        };

        applyValue(currentValue);

        button.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const selectedValue = this.currentStyle.highlight ?? currentValue;
            const doc = button.ownerDocument;
            const win = doc.defaultView ?? window;

            const menu = new Menu().setNoIcon().setUseNativeMenu(false);

            highlights.forEach((highlight) => {
                menu.addItem((item) => {
                    const frag = doc.createDocumentFragment();
                    const rowEl = doc.createElement('div');
                    rowEl.className = 'wdwxedit-menu-item wdwxedit-highlight-menu-item';
                    if (highlight.className === selectedValue) {
                        rowEl.classList.add('is-selected');
                    }

                    const textEl = doc.createElement('span');
                    textEl.className = 'wdwxedit-menu-text';
                    textEl.textContent = highlight.name;

                    const checkEl = doc.createElement('span');
                    checkEl.className = 'wdwxedit-menu-check';
                    setIcon(checkEl, 'check');

                    rowEl.append(textEl, checkEl);
                    frag.append(rowEl);
                    item.setTitle(frag);
                    item.onClick(() => {
                        applyValue(highlight.className);
                        this.events.onHighlightChanged?.(highlight.className);
                    });
                });
            });

            const rect = button.getBoundingClientRect();
            const posEvt = new MouseEvent('contextmenu', {
                view: win,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left),
                clientY: Math.round(rect.bottom + 4),
            });
            menu.showAtMouseEvent(posEvt);
        });
    }

    private createFontDropdown(
        container: HTMLElement,
        fonts: Array<{ value: string; text: string }>,
        currentValue: string,
    ): void {
        const group = container.createDiv({ cls: 'style-dropdown-group style-font-dropdown-group' });

        const icon = group.createSpan({ cls: 'style-dropdown-icon' });
        setIcon(icon, 'type');

        const button = group.createEl('button', {
            cls: 'style-dropdown style-font-trigger',
            attr: { type: 'button', 'aria-label': '字体' },
        });

        const label = button.createSpan({ cls: 'style-font-text' });
        const chevron = button.createSpan({ cls: 'style-font-chevron' });
        setIcon(chevron, 'chevron-down');

        const applyValue = (value: string) => {
            const font = fonts.find((f) => f.value === value) ?? fonts[0];
            label.textContent = font?.text ?? value;
            this.currentStyle.fontFamily = value;
        };

        applyValue(currentValue);

        button.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const selectedValue = this.currentStyle.fontFamily ?? currentValue;
            const doc = button.ownerDocument;
            const win = doc.defaultView ?? window;

            const menu = new Menu().setNoIcon().setUseNativeMenu(false);

            fonts.forEach((font) => {
                menu.addItem((item) => {
                    const frag = doc.createDocumentFragment();
                    const rowEl = doc.createElement('div');
                    rowEl.className = 'wdwxedit-menu-item wdwxedit-font-menu-item';
                    if (font.value === selectedValue) {
                        rowEl.classList.add('is-selected');
                    }

                    const textEl = doc.createElement('span');
                    textEl.className = 'wdwxedit-menu-text';
                    textEl.textContent = font.text;

                    const checkEl = doc.createElement('span');
                    checkEl.className = 'wdwxedit-menu-check';
                    setIcon(checkEl, 'check');

                    rowEl.append(textEl, checkEl);
                    frag.append(rowEl);
                    item.setTitle(frag);
                    item.onClick(() => {
                        applyValue(font.value);
                        this.events.onFontChanged?.(font.value);
                    });
                });
            });

            const rect = button.getBoundingClientRect();
            const posEvt = new MouseEvent('contextmenu', {
                view: win,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left),
                clientY: Math.round(rect.bottom + 4),
            });
            menu.showAtMouseEvent(posEvt);
        });
    }

    private createFontSizeDropdown(
        container: HTMLElement,
        sizes: Array<{ value: string; text: string }>,
        currentValue: string,
    ): void {
        const group = container.createDiv({ cls: 'style-dropdown-group style-fontsize-dropdown-group' });

        const icon = group.createSpan({ cls: 'style-dropdown-icon style-fontsize-aa' });
        setIcon(icon, 'case-sensitive');

        const button = group.createEl('button', {
            cls: 'style-dropdown style-fontsize-trigger',
            attr: { type: 'button', 'aria-label': '字号' },
        });

        const label = button.createSpan({ cls: 'style-fontsize-text' });
        const chevron = button.createSpan({ cls: 'style-fontsize-chevron' });
        setIcon(chevron, 'chevron-down');

        const applyValue = (value: string) => {
            const size = sizes.find((s) => s.value === value) ?? sizes[0];
            label.textContent = size?.text ?? value;
            this.currentStyle.fontSize = value;
        };

        applyValue(currentValue);

        button.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const selectedValue = this.currentStyle.fontSize ?? currentValue;
            const doc = button.ownerDocument;
            const win = doc.defaultView ?? window;

            const menu = new Menu().setNoIcon().setUseNativeMenu(false);

            sizes.forEach((size) => {
                menu.addItem((item) => {
                    const frag = doc.createDocumentFragment();
                    const rowEl = doc.createElement('div');
                    rowEl.className = 'wdwxedit-menu-item wdwxedit-fontsize-menu-item';
                    if (size.value === selectedValue) {
                        rowEl.classList.add('is-selected');
                    }

                    const textEl = doc.createElement('span');
                    textEl.className = 'wdwxedit-menu-text';
                    textEl.textContent = size.text;

                    const checkEl = doc.createElement('span');
                    checkEl.className = 'wdwxedit-menu-check';
                    setIcon(checkEl, 'check');

                    rowEl.append(textEl, checkEl);
                    frag.append(rowEl);
                    item.setTitle(frag);
                    item.onClick(() => {
                        applyValue(size.value);
                        this.events.onFontSizeChanged?.(size.value);
                    });
                });
            });

            const rect = button.getBoundingClientRect();
            const posEvt = new MouseEvent('contextmenu', {
                view: win,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left),
                clientY: Math.round(rect.bottom + 4),
            });
            menu.showAtMouseEvent(posEvt);
        });
    }

    /**
     * Create color picker
     */
    private createColorPicker(container: HTMLElement): void {
        const group = container.createDiv({ cls: 'style-dropdown-group style-color-dropdown-group' });

        const button = group.createEl('button', {
            cls: 'style-dropdown style-color-trigger',
            attr: { type: 'button', 'aria-label': '主题色' },
        });

        const dot = button.createSpan({ cls: 'style-color-dot' });
        const label = button.createSpan({ cls: 'style-color-text' });
        const chevron = button.createSpan({ cls: 'style-color-chevron' });
        setIcon(chevron, 'chevron-down');

        const colorInput = group.createEl('input', {
            type: 'color',
            cls: 'color-input',
        });
        colorInput.setCssProps({ display: 'none' });

        const getColorLabel = (hex: string) => {
            const preset = COLOR_PRESETS.find((c) => c.value.toLowerCase() === hex.toLowerCase());
            return preset?.text ?? `自定义 (${hex})`;
        };

        const applyColor = (hex: string) => {
            dot.setCssProps({ backgroundColor: hex });
            label.textContent = getColorLabel(hex);
            this.currentStyle.primaryColor = hex;
            this.events.onPrimaryColorChanged?.(hex);
        };

        const currentColor = this.currentStyle.primaryColor || '#1a73e8';
        colorInput.value = currentColor;
        applyColor(currentColor);

        colorInput.oninput = () => {
            applyColor(colorInput.value);
        };

        button.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const selectedValue = this.currentStyle.primaryColor ?? currentColor;
            const doc = button.ownerDocument;
            const win = doc.defaultView ?? window;

            const menu = new Menu().setNoIcon().setUseNativeMenu(false);

            COLOR_PRESETS.forEach((color) => {
                menu.addItem((item) => {
                    const frag = doc.createDocumentFragment();
                    const rowEl = doc.createElement('div');
                    rowEl.className = 'wdwxedit-menu-item wdwxedit-color-menu-item';
                    if (color.value.toLowerCase() === String(selectedValue).toLowerCase()) {
                        rowEl.classList.add('is-selected');
                    }

                    const dotEl = doc.createElement('span');
                    dotEl.className = 'wdwxedit-color-menu-dot';
                    dotEl.setCssProps({ backgroundColor: color.value });

                    const textEl = doc.createElement('span');
                    textEl.className = 'wdwxedit-menu-text';
                    textEl.textContent = color.text;

                    const checkEl = doc.createElement('span');
                    checkEl.className = 'wdwxedit-menu-check';
                    setIcon(checkEl, 'check');

                    rowEl.append(dotEl, textEl, checkEl);
                    frag.append(rowEl);
                    item.setTitle(frag);
                    item.onClick(() => applyColor(color.value));
                });
            });

            menu.addSeparator();
            menu.addItem((item) => {
                const frag = doc.createDocumentFragment();
                const rowEl = doc.createElement('div');
                rowEl.className = 'wdwxedit-menu-item wdwxedit-color-menu-item';
                if (!COLOR_PRESETS.find((c) => c.value.toLowerCase() === String(selectedValue).toLowerCase())) {
                    rowEl.classList.add('is-selected');
                }

                const dotEl = doc.createElement('span');
                dotEl.className = 'wdwxedit-color-menu-dot';
                dotEl.setCssProps({ backgroundColor: String(selectedValue) });

                const textEl = doc.createElement('span');
                textEl.className = 'wdwxedit-menu-text';
                textEl.textContent = `自定义 (${selectedValue})`;

                const checkEl = doc.createElement('span');
                checkEl.className = 'wdwxedit-menu-check';
                setIcon(checkEl, 'check');

                rowEl.append(dotEl, textEl, checkEl);
                frag.append(rowEl);
                item.setTitle(frag);
                item.onClick(() => {
                    colorInput.value = String(selectedValue);
                    colorInput.click();
                });
            });

            const rect = button.getBoundingClientRect();
            const posEvt = new MouseEvent('contextmenu', {
                view: win,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left),
                clientY: Math.round(rect.bottom + 4),
            });
            menu.showAtMouseEvent(posEvt);
        });
    }

    /**
     * Update current style
     */
    updateStyle(style: Partial<StyleConfig>): void {
        this.currentStyle = { ...this.currentStyle, ...style };
    }
}
