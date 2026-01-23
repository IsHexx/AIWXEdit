/**
 * Settings Tab
 * 
 * Plugin settings UI in Obsidian's settings panel.
 */

import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type WDWXEditPlugin from '../../plugin';
import { getSettingsStore, SettingsStore } from '../../infrastructure/storage';
import type { AIProvider } from '../../types/ai.types';
import { PROVIDER_DEFAULTS } from '../../types/ai.types';
import type { WechatAccountConfig } from '../../types/settings.types';

/**
 * Settings Tab
 * 
 * Provides UI for configuring the plugin.
 */
export class SettingsTab extends PluginSettingTab {
    plugin: WDWXEditPlugin;
    private settingsStore: SettingsStore;

    constructor(app: App, plugin: WDWXEditPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settingsStore = getSettingsStore();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: 'WDWXEdit 设置' });

        // WeChat Account Section
        this.createAccountSection(containerEl);

        // Style Section
        this.createStyleSection(containerEl);

        // AI Section
        this.createAISection(containerEl);
    }

    /**
     * Create WeChat account settings section
     */
    private createAccountSection(container: HTMLElement): void {
        container.createEl('h2', { text: '微信公众号配置' });

        const accounts = this.settingsStore.getAccounts();
        const defaultAccount = this.settingsStore.getDefaultAccount();

        if (accounts.length === 0) {
            container.createEl('p', {
                text: '尚未配置微信公众号账号',
                cls: 'setting-item-description'
            });
        }

        // List existing accounts (editable inline)
        accounts.forEach((account, index) => {
            const section = container.createDiv({ cls: 'wdwxedit-account-section' });
            section.createEl('h3', { text: account.name || `账号 ${index + 1}` });

            const state = {
                name: account.name || '',
                appId: account.appId,
                appSecret: account.appSecret,
                author: account.author || '',
                defaultCoverPath: account.defaultCoverPath || '',
                defaultCoverMediaId: account.defaultCoverMediaId || '',
                isDefault: !!(defaultAccount && defaultAccount.appId === account.appId),
            };

            new Setting(section)
                .setName('账号名称')
                .addText(text => text
                    .setValue(state.name)
                    .onChange(value => { state.name = value.trim(); })
                );

            new Setting(section)
                .setName('AppID')
                .addText(text => text
                    .setValue(state.appId)
                    .onChange(value => { state.appId = value.trim(); })
                );

            new Setting(section)
                .setName('AppSecret')
                .addText(text => {
                    text.setValue(state.appSecret)
                        .onChange(value => { state.appSecret = value.trim(); });
                    text.inputEl.type = 'password';
                });

            new Setting(section)
                .setName('默认作者')
                .addText(text => text
                    .setValue(state.author)
                    .onChange(value => { state.author = value.trim(); })
                );

            new Setting(section)
                .setName('默认封面路径')
                .setDesc('vault 路径，如 folder/cover.png 或 /folder/cover.png')
                .addText(text => text
                    .setValue(state.defaultCoverPath)
                    .onChange(value => { state.defaultCoverPath = value.trim(); })
                );

            new Setting(section)
                .setName('默认封面素材 ID')
                .setDesc('已上传素材 media_id，优先级高于默认封面路径')
                .addText(text => text
                    .setValue(state.defaultCoverMediaId)
                    .onChange(value => { state.defaultCoverMediaId = value.trim(); })
                );

            new Setting(section)
                .setName('设为默认账号')
                .addToggle(toggle => toggle
                    .setValue(state.isDefault)
                    .onChange(value => { state.isDefault = value; })
                );

            new Setting(section)
                .addButton(btn => btn
                    .setButtonText('保存')
                    .setCta()
                    .onClick(async () => {
                        if (!state.appId || !state.appSecret) {
                            new Notice('请填写 AppID 和 AppSecret');
                            return;
                        }

                        const newAccount: WechatAccountConfig = {
                            name: state.name || state.appId,
                            appId: state.appId,
                            appSecret: state.appSecret,
                            author: state.author || undefined,
                            defaultCoverPath: state.defaultCoverPath || undefined,
                            defaultCoverMediaId: state.defaultCoverMediaId || undefined,
                        };

                        if (state.appId !== account.appId) {
                            await this.settingsStore.removeAccount(account.appId);
                            await this.settingsStore.addAccount(newAccount);
                        } else {
                            await this.settingsStore.updateAccount(account.appId, newAccount);
                        }

                        if (state.isDefault) {
                            const accountsAfter = this.settingsStore.getAccounts();
                            const newIndex = accountsAfter.findIndex(acc => acc.appId === newAccount.appId);
                            if (newIndex >= 0) {
                                await this.settingsStore.setDefaultAccount(newIndex);
                            }
                        }

                        new Notice('账号已保存');
                        this.display();
                    })
                )
                .addButton(btn => btn
                    .setButtonText('删除')
                    .setWarning()
                    .onClick(async () => {
                        await this.settingsStore.removeAccount(account.appId);
                        this.display();
                    })
                );
        });

        // Add new account inline form
        const addSection = container.createDiv({ cls: 'wdwxedit-account-section' });
        addSection.createEl('h3', { text: '添加新账号' });

        const newState = {
            name: '',
            appId: '',
            appSecret: '',
            author: '',
            defaultCoverPath: '',
            defaultCoverMediaId: '',
            isDefault: false,
        };

        new Setting(addSection)
            .setName('账号名称')
            .addText(text => text
                .setPlaceholder('例如：我的公众号')
                .onChange(value => { newState.name = value.trim(); })
            );

        new Setting(addSection)
            .setName('AppID')
            .addText(text => text
                .setPlaceholder('wx123...')
                .onChange(value => { newState.appId = value.trim(); })
            );

        new Setting(addSection)
            .setName('AppSecret')
            .addText(text => {
                text.setPlaceholder('AppSecret')
                    .onChange(value => { newState.appSecret = value.trim(); });
                text.inputEl.type = 'password';
            });

        new Setting(addSection)
            .setName('默认作者')
            .addText(text => text
                .setPlaceholder('可选')
                .onChange(value => { newState.author = value.trim(); })
            );

        new Setting(addSection)
            .setName('默认封面路径')
            .setDesc('vault 路径，如 folder/cover.png 或 /folder/cover.png')
            .addText(text => text
                .setPlaceholder('可选')
                .onChange(value => { newState.defaultCoverPath = value.trim(); })
            );

        new Setting(addSection)
            .setName('默认封面素材 ID')
            .setDesc('已上传素材 media_id，优先级高于默认封面路径')
            .addText(text => text
                .setPlaceholder('可选')
                .onChange(value => { newState.defaultCoverMediaId = value.trim(); })
            );

        new Setting(addSection)
            .setName('设为默认账号')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(value => { newState.isDefault = value; })
            );

        new Setting(addSection)
            .addButton(btn => btn
                .setButtonText('添加账号')
                .setCta()
                .onClick(async () => {
                    if (!newState.appId || !newState.appSecret) {
                        new Notice('请填写 AppID 和 AppSecret');
                        return;
                    }

                    const newAccount: WechatAccountConfig = {
                        name: newState.name || newState.appId,
                        appId: newState.appId,
                        appSecret: newState.appSecret,
                        author: newState.author || undefined,
                        defaultCoverPath: newState.defaultCoverPath || undefined,
                        defaultCoverMediaId: newState.defaultCoverMediaId || undefined,
                    };

                    await this.settingsStore.addAccount(newAccount);
                    if (newState.isDefault) {
                        const accountsAfter = this.settingsStore.getAccounts();
                        const newIndex = accountsAfter.findIndex(acc => acc.appId === newAccount.appId);
                        if (newIndex >= 0) {
                            await this.settingsStore.setDefaultAccount(newIndex);
                        }
                    }

                    new Notice('账号已添加');
                    this.display();
                })
            );
    }

    /**
     * Create style settings section
     */
    private createStyleSection(container: HTMLElement): void {
        container.createEl('h2', { text: '样式配置' });

        const style = this.settingsStore.getStyleConfig();

        new Setting(container)
            .setName('主题颜色')
            .setDesc('设置文章主色调')
            .addColorPicker(picker => picker
                .setValue(style.primaryColor)
                .onChange(async (value) => {
                    await this.settingsStore.updateStyleConfig({ primaryColor: value });
                })
            );

        new Setting(container)
            .setName('字体')
            .setDesc('正文字体')
            .addDropdown(dropdown => dropdown
                .addOption('system-ui', '系统默认')
                .addOption('"PingFang SC", sans-serif', '苹方')
                .addOption('"Microsoft YaHei", sans-serif', '微软雅黑')
                .addOption('"Noto Sans SC", sans-serif', 'Noto Sans')
                .setValue(style.fontFamily)
                .onChange(async (value) => {
                    await this.settingsStore.updateStyleConfig({ fontFamily: value });
                })
            );

        new Setting(container)
            .setName('字号')
            .setDesc('正文字体大小')
            .addDropdown(dropdown => dropdown
                .addOption('14px', '14px')
                .addOption('15px', '15px')
                .addOption('16px', '16px')
                .addOption('17px', '17px')
                .addOption('18px', '18px')
                .setValue(style.fontSize)
                .onChange(async (value) => {
                    await this.settingsStore.updateStyleConfig({ fontSize: value });
                })
            );

        new Setting(container)
            .setName('代码行号')
            .setDesc('在代码块中显示行号')
            .addToggle(toggle => toggle
                .setValue(style.showLineNumbers)
                .onChange(async (value) => {
                    await this.settingsStore.updateStyleConfig({ showLineNumbers: value });
                })
            );

        new Setting(container)
            .setName('启用自定义 CSS')
            .setDesc('将自定义 CSS 注入到文章中（预览与复制）')
            .addToggle(toggle => toggle
                .setValue(style.useCustomCSS)
                .onChange(async (value) => {
                    await this.settingsStore.updateStyleConfig({ useCustomCSS: value });
                    this.display();
                })
            );

        if (style.useCustomCSS) {
            new Setting(container)
                .setName('自定义 CSS')
                .setDesc('直接输入 CSS 样式')
                .addTextArea(text => text
                    .setValue(style.customCSS)
                    .onChange(async (value) => {
                        await this.settingsStore.updateStyleConfig({ customCSS: value });
                    })
                );
        }
    }

    /**
     * Create AI settings section
     */
    private createAISection(container: HTMLElement): void {
        container.createEl('h2', { text: 'AI 功能配置' });

        const ai = this.settingsStore.getAIConfig();

        new Setting(container)
            .setName('启用 AI 功能')
            .setDesc('开启 AI 标题和封面生成')
            .addToggle(toggle => toggle
                .setValue(ai.enabled)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ enabled: value });
                    this.display();
                })
            );

        if (ai.enabled) {
            new Setting(container)
                .setName('AI 服务商')
                .addDropdown(dropdown => {
                    Object.entries(PROVIDER_DEFAULTS).forEach(([key, value]) => {
                        dropdown.addOption(key, value.name);
                    });
                    return dropdown
                        .setValue(ai.provider)
                        .onChange(async (value) => {
                            const defaults = PROVIDER_DEFAULTS[value as AIProvider];
                            await this.settingsStore.updateAIConfig({
                                provider: value,
                                baseUrl: defaults.baseUrl,
                                model: defaults.defaultModel,
                            });
                            this.display();
                        });
                });

            new Setting(container)
                .setName('API Key')
                .setDesc('AI 服务的 API 密钥')
                .addText(text => text
                    .setPlaceholder('sk-...')
                    .setValue(ai.apiKey)
                    .onChange(async (value) => {
                        await this.settingsStore.updateAIConfig({ apiKey: value });
                    })
                );

            new Setting(container)
                .setName('API Base URL')
                .setDesc('API 端点地址')
                .addText(text => text
                    .setValue(ai.baseUrl)
                    .onChange(async (value) => {
                        await this.settingsStore.updateAIConfig({ baseUrl: value });
                    })
                );

            new Setting(container)
                .setName('模型')
                .setDesc('使用的 AI 模型')
                .addText(text => text
                    .setValue(ai.model)
                    .onChange(async (value) => {
                        await this.settingsStore.updateAIConfig({ model: value });
                    })
                );
        }
    }
}
