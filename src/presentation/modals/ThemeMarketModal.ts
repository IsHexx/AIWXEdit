/**
 * Theme Market Modal
 * 
 * A UI for browsing and downloading themes from the remote catalog.
 */

import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';
import { getAssetStore } from '../../infrastructure/storage';
import { THEME_MARKET_CATALOG, HIGHLIGHT_MARKET_CATALOG } from '../../infrastructure/storage/ThemeCatalogData';
import { ThemeCatalogItem, HighlightCatalogItem } from '../../infrastructure/themes/themeCatalog';

export class ThemeMarketModal extends Modal {
    private assetStore = getAssetStore();
    private activeTab: 'themes' | 'highlights' = 'themes';

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.render();
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '主题市场 (Store)' });

        // Tab Header
        const tabContainer = contentEl.createDiv({ cls: 'wdwxedit-market-tabs' });
        tabContainer.style.display = 'flex';
        tabContainer.style.marginBottom = '15px';
        tabContainer.style.borderBottom = '1px solid var(--background-modifier-border)';

        this.createTab(tabContainer, '文章主题', 'themes');
        this.createTab(tabContainer, '代码高亮', 'highlights');

        // Spacer
        tabContainer.createDiv({ attr: { style: 'flex: 1' } });



        const desc = contentEl.createEl('p', { cls: 'wdwxedit-market-desc' });
        desc.textContent = this.activeTab === 'themes'
            ? '浏览并下载社区主题。下载后可在“样式配置”中选择使用。'
            : '浏览并下载代码高亮样式。';

        const container = contentEl.createDiv({ cls: 'wdwxedit-market-container' });
        // Grid layout
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        container.style.gap = '15px';
        container.style.marginTop = '10px';
        container.style.maxHeight = 'calc(60vh - 50px)'; // Adjust height to account for footer
        container.style.overflowY = 'auto';
        container.style.marginBottom = '15px'; // Space for footer

        const catalog = this.activeTab === 'themes' ? THEME_MARKET_CATALOG : HIGHLIGHT_MARKET_CATALOG;

        catalog.forEach(item => {
            this.renderCard(container, item);
        });

        // Bottom Footer
        const footerContainer = contentEl.createDiv({ cls: 'wdwxedit-market-footer' });
        footerContainer.style.display = 'flex';
        footerContainer.style.justifyContent = 'flex-end';
        footerContainer.style.gap = '10px'; // Space between buttons
        footerContainer.style.paddingTop = '10px';
        footerContainer.style.borderTop = '1px solid var(--background-modifier-border)';

        // Batch Uninstall Button
        const uninstallAllBtn = new ButtonComponent(footerContainer);
        uninstallAllBtn.setButtonText('全部卸载')
            .setTooltip('一键卸载当前列表所有已安装的项目')
            .onClick(async () => {
                await this.uninstallAll(uninstallAllBtn);
            });

        // Batch Download Button
        const batchBtn = new ButtonComponent(footerContainer);
        batchBtn.setButtonText('全部下载')
            .setTooltip('一键下载当前列表所有未安装的项目')
            .onClick(async () => {
                await this.downloadAll(batchBtn);
            });
        batchBtn.buttonEl.classList.add('mod-cta'); // Make it primary
    }

    private createTab(container: HTMLElement, text: string, type: 'themes' | 'highlights') {
        const tab = container.createDiv({ cls: 'wdwxedit-market-tab' });
        tab.textContent = text;
        tab.style.padding = '8px 16px';
        tab.style.cursor = 'pointer';
        tab.style.fontWeight = this.activeTab === type ? 'bold' : 'normal';
        tab.style.borderBottom = this.activeTab === type ? '2px solid var(--interactive-accent)' : '2px solid transparent';
        tab.style.color = this.activeTab === type ? 'var(--text-normal)' : 'var(--text-muted)';

        tab.onClickEvent(() => {
            if (this.activeTab !== type) {
                this.activeTab = type;
                this.render();
            }
        });
    }

    private renderCard(container: HTMLElement, item: ThemeCatalogItem | HighlightCatalogItem) {
        const card = container.createDiv({ cls: 'wdwxedit-theme-card' });
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.padding = '15px';
        card.style.display = 'flex';
        card.style.flexDirection = 'row';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.backgroundColor = 'var(--background-secondary)';

        // Left: Info
        const info = card.createDiv({ cls: 'wdwxedit-card-info' });
        info.style.flex = '1';
        info.style.marginRight = '15px';
        info.style.minWidth = '0';

        // Title & Author
        const header = info.createDiv({ cls: 'wdwxedit-card-header' });
        header.style.marginBottom = '6px';
        header.createEl('div', { text: item.name, cls: 'wdwxedit-card-title', attr: { style: 'font-weight: bold; font-size: 1.1em;' } });
        if (item.author) {
            header.createEl('div', { text: `by ${item.author}`, cls: 'wdwxedit-card-author', attr: { style: 'font-size: 0.8em; color: var(--text-muted);' } });
        }

        // Description
        const desc = info.createDiv({ cls: 'wdwxedit-card-desc' });
        desc.textContent = item.desc || (this.activeTab === 'highlights' ? '代码高亮样式' : '暂无描述');
        desc.style.fontSize = '0.9em';
        desc.style.color = 'var(--text-normal)';
        desc.style.lineHeight = '1.4';

        // Right: Action
        const action = card.createDiv({ cls: 'wdwxedit-card-action' });
        action.style.minWidth = '80px';
        action.style.textAlign = 'right';

        this.renderButton(action, item);
    }

    private renderButton(container: HTMLElement, item: ThemeCatalogItem | HighlightCatalogItem) {
        container.empty();

        const isInstalled = this.activeTab === 'themes'
            ? this.assetStore.isThemeInstalled(item.id)
            : this.assetStore.isHighlightInstalled(item.id);

        const button = new ButtonComponent(container);
        button.setButtonText(isInstalled ? '卸载' : '下载');

        if (isInstalled) {
            button.buttonEl.classList.remove('mod-cta');
            button.buttonEl.classList.add('mod-warning');
        } else {
            button.buttonEl.classList.remove('mod-warning');
            button.buttonEl.classList.add('mod-cta');
        }

        button.onClick(async () => {
            if (isInstalled) {
                // Uninstall
                if (this.activeTab === 'themes') {
                    await this.assetStore.uninstallTheme(item.id);
                } else {
                    await this.assetStore.uninstallHighlight(item.id);
                }
                new Notice(`已卸载: ${item.name}`);
            } else {
                // Install
                button.setButtonText('...').setDisabled(true);
                try {
                    if (this.activeTab === 'themes') {
                        await this.assetStore.installTheme(item as ThemeCatalogItem);
                    } else {
                        await this.assetStore.installHighlight(item as HighlightCatalogItem);
                    }
                    new Notice(`下载成功: ${item.name}`);
                } catch (error) {
                    new Notice(`下载失败: ${error}`);
                    console.error(error);
                }
            }
            // Re-render button state
            this.renderButton(container, item);
        });
    }

    private async downloadAll(btn: ButtonComponent) {
        const isTheme = this.activeTab === 'themes';
        const catalog = isTheme ? THEME_MARKET_CATALOG : HIGHLIGHT_MARKET_CATALOG;

        // Filter uninstalled
        const toInstall = catalog.filter(item =>
            isTheme
                ? !this.assetStore.isThemeInstalled(item.id)
                : !this.assetStore.isHighlightInstalled(item.id)
        );

        if (toInstall.length === 0) {
            new Notice('当前所有项目均已安装');
            return;
        }

        // Confirm
        // Usually we'd ask, but for "One Click" let's just do it with a notice.
        new Notice(`开始批量下载 ${toInstall.length} 个项目，请稍候...`);
        btn.setButtonText('下载中...').setDisabled(true);

        try {
            let count = 0;
            if (isTheme) {
                count = await this.assetStore.installThemes(toInstall as ThemeCatalogItem[]);
            } else {
                count = await this.assetStore.installHighlights(toInstall as HighlightCatalogItem[]);
            }
            new Notice(`批量下载完成，成功安装 ${count} 个项目`);
        } catch (error) {
            console.error('Batch download failed:', error);
            new Notice('批量下载过程中发生错误，请查看控制台');
        } finally {
            this.render(); // Re-render to update UI state
        }
    }

    private async uninstallAll(btn: ButtonComponent) {
        const isTheme = this.activeTab === 'themes';
        const catalog = isTheme ? THEME_MARKET_CATALOG : HIGHLIGHT_MARKET_CATALOG;

        // Filter installed
        const toUninstall = catalog.filter(item =>
            isTheme
                ? this.assetStore.isThemeInstalled(item.id)
                : this.assetStore.isHighlightInstalled(item.id)
        );

        if (toUninstall.length === 0) {
            new Notice('当前没有已安装的项目');
            return;
        }

        new Notice(`开始批量卸载 ${toUninstall.length} 个项目...`);
        btn.setButtonText('卸载中...').setDisabled(true);

        try {
            let count = 0;
            if (isTheme) {
                count = await this.assetStore.uninstallThemes(toUninstall as ThemeCatalogItem[]);
            } else {
                count = await this.assetStore.uninstallHighlights(toUninstall as HighlightCatalogItem[]);
            }
            new Notice(`批量卸载完成，成功卸载 ${count} 个项目`);
        } catch (error) {
            console.error('Batch uninstall failed:', error);
            new Notice('批量卸载过程中发生错误，请查看控制台');
        } finally {
            this.render(); // Re-render to update UI state
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
