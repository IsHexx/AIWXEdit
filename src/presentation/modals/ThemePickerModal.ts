import { FuzzySuggestModal, type App } from 'obsidian';
import type { ThemeDefinition } from '../components/StyleEditor';

export class ThemePickerModal extends FuzzySuggestModal<ThemeDefinition> {
    constructor(app: App, private themes: ThemeDefinition[], private selectTheme: (theme: ThemeDefinition) => void) {
        super(app);
        this.setPlaceholder('搜索文章主题…');
    }
    getItems(): ThemeDefinition[] { return this.themes; }
    getItemText(theme: ThemeDefinition): string { return theme.name; }
    onChooseItem(theme: ThemeDefinition): void { this.selectTheme(theme); }
}
