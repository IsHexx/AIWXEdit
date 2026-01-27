/**
 * Settings Tab
 * 
 * Plugin settings UI in Obsidian's settings panel.
 */

import { App, Notice, PluginSettingTab, Setting, type EventRef } from 'obsidian';
import type AIWXEditPlugin from '../../plugin';
import { getSettingsStore, getAssetStore, SettingsStore } from '../../infrastructure/storage';
import type { AIProvider } from '../../types/ai.types';
import { PROVIDER_DEFAULTS } from '../../types/ai.types';
import { ThemeMarketModal } from '../modals/ThemeMarketModal';
import { getAIService } from '../../application/AIService';
import { DEFAULT_TITLE_PROMPT } from '../../infrastructure/ai/TitleGenerator';
import { AccountModal } from '../modals/AccountModal';
import { getWechatClient } from '../../infrastructure/wechat';

/**
 * Settings Tab
 * 
 * Provides UI for configuring the plugin.
 */
export class SettingsTab extends PluginSettingTab {
    plugin: AIWXEditPlugin;
    private settingsStore: SettingsStore;
    private isVisible = false;

    constructor(app: App, plugin: AIWXEditPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settingsStore = getSettingsStore();

        // Listen for asset changes to refresh dropdowns
        const workspace = this.plugin.app.workspace as unknown as {
            on: (name: string, callback: () => void) => EventRef;
        };
        this.plugin.registerEvent(
            workspace.on('wdwxedit:assets-changed', () => {
                if (this.isVisible) {
                    this.display();
                }
            })
        );
    }

    hide(): void {
        this.isVisible = false;
        super.hide();
    }

    display(): void {
        this.isVisible = true;
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('发布助手设置').setHeading();

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
        new Setting(container).setName('公众号管理').setHeading();

        const accounts = this.settingsStore.getAccounts();
        const defaultAccount = this.settingsStore.getDefaultAccount();

        // 1. List existing accounts
        if (accounts.length > 0) {
            const listContainer = container.createDiv({ cls: 'wdwxedit-account-list' });

            accounts.forEach((account, index) => {
                const isDefault = defaultAccount && defaultAccount.appId === account.appId;
                const setting = new Setting(listContainer)
                    .setName(account.name || `账号 ${index + 1}`)
                    .setDesc(`${account.appId} ${isDefault ? ' (默认)' : ''}`);

                if (isDefault) {
                    // Add a star icon or label
                    setting.nameEl.createSpan({ text: ' ⭐', cls: 'wdwxedit-default-star' });
                }

                setting
                    .addButton(btn => btn
                        .setButtonText('测试')
                        .onClick(() => {
                            void (async () => {
                                const btnEl = btn.buttonEl;
                                btnEl.disabled = true;
                                const originalText = btnEl.textContent;
                                btnEl.textContent = '测试中...';
                                try {
                                    const client = getWechatClient(account.appId, account.appSecret);
                                    await client.refreshToken();
                                    new Notice('连接成功');
                                } catch (error) {
                                    new Notice(error instanceof Error ? error.message : '连接失败');
                                } finally {
                                    btnEl.disabled = false;
                                    btnEl.textContent = originalText || '测试';
                                }
                            })();
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText('编辑')
                        .onClick(() => {
                            new AccountModal(this.app, {
                                account,
                                onSaved: () => this.display(),
                            }).open();
                        })
                    )
                    .addButton(btn => btn
                        .setButtonText('删除')
                        .setWarning()
                        .onClick(() => {
                            void (async () => {
                                await this.settingsStore.removeAccount(account.appId);
                                this.display();
                            })();
                        })
                    );

                // Add "Set Default" if not default
                if (!isDefault) {
                    setting.addExtraButton(btn => btn
                        .setIcon('star')
                        .setTooltip('设为默认')
                        .onClick(() => {
                            void (async () => {
                                await this.settingsStore.setDefaultAccount(index);
                                this.display();
                            })();
                        })
                    );
                }
            });
        }

        // 2. Add account
        new Setting(container)
            .setName('添加新公众号')
            .setDesc('支持先测试连接，再保存')
            .addButton(btn => btn
                .setButtonText('添加公众号')
                .setCta()
                .onClick(() => {
                    new AccountModal(this.app, {
                        onSaved: () => {
                            void (async () => {
                                // Auto set default if first account
                                if (this.settingsStore.getAccounts().length === 1) {
                                    await this.settingsStore.setDefaultAccount(0);
                                }
                                this.display();
                            })();
                        },
                    }).open();
                })
            );
    }

    /**
     * Create style settings section
     */
    private createStyleSection(container: HTMLElement): void {
        new Setting(container).setName('样式配置').setHeading();

        const style = this.settingsStore.getStyleConfig();
        const assetStore = getAssetStore();
        const themes = assetStore.getThemes();

        new Setting(container)
            .setName('默认主题')
            .setDesc('选择文章渲染的默认主题')
            .addDropdown(dropdown => {
                themes.forEach(theme => {
                    dropdown.addOption(theme.id, theme.name);
                });
                dropdown.setValue(style.theme)
                    .onChange((value) => {
                        void (async () => {
                            await this.settingsStore.updateStyleConfig({ theme: value });
                            // Reuse this event to force refresh
                            this.plugin.app.workspace.trigger('wdwxedit:assets-changed');
                        })();
                    });
            });

        new Setting(container)
            .setName('主题颜色')
            .setDesc('设置文章主色调')
            .addColorPicker(picker => picker
                .setValue(style.primaryColor)
                .onChange((value) => {
                    void this.settingsStore.updateStyleConfig({ primaryColor: value });
                })
            );

        new Setting(container)
            .setName('字体')
            .setDesc('正文字体')
            .addDropdown(dropdown => dropdown
                .addOption('system-ui', '系统默认')
                .addOption('"PingFang SC", sans-serif', '苹方')
                .addOption('"Microsoft YaHei", sans-serif', '微软雅黑')
                .addOption('"Noto Sans SC", sans-serif', '思源黑体')
                .setValue(style.fontFamily)
                .onChange((value) => {
                    void this.settingsStore.updateStyleConfig({ fontFamily: value });
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
                .onChange((value) => {
                    void this.settingsStore.updateStyleConfig({ fontSize: value });
                })
            );

        new Setting(container)
            .setName('代码行号')
            .setDesc('在代码块中显示行号')
            .addToggle(toggle => toggle
                .setValue(style.showLineNumbers)
                .onChange((value) => {
                    void this.settingsStore.updateStyleConfig({ showLineNumbers: value });
                })
            );

        new Setting(container)
            .setName('启用自定义样式')
            .setDesc('将自定义样式注入到文章中（预览与复制）')
            .addToggle(toggle => toggle
                .setValue(style.useCustomCSS)
                .onChange((value) => {
                    void (async () => {
                        await this.settingsStore.updateStyleConfig({ useCustomCSS: value });
                        this.display();
                    })();
                })
            );


        new Setting(container)
            .setName('主题市场')
            .setDesc('浏览并下载更多社区主题')
            .addButton(btn => btn
                .setButtonText('打开主题市场')
                .setCta()
                .onClick(() => {
                    new ThemeMarketModal(this.plugin.app).open();
                })
            );

        if (style.useCustomCSS) {
            new Setting(container)
                .setName('自定义样式')
                .setDesc('直接输入自定义样式')
                .addTextArea(text => text
                    .setValue(style.customCSS)
                    .onChange((value) => {
                        void this.settingsStore.updateStyleConfig({ customCSS: value });
                    })
                );
        }
    }



    /**
     * Create AI settings section
     */
    private createAISection(container: HTMLElement): void {
        new Setting(container).setName('智能服务').setHeading();

        const ai = this.settingsStore.getAIConfig();

        new Setting(container)
            .setName('启用智能功能')
            .setDesc('开启后可使用智能生成标题和封面等功能')
            .addToggle(toggle => toggle
                .setValue(ai.enabled)
                .onChange((value) => {
                    void (async () => {
                        await this.settingsStore.updateAIConfig({ enabled: value });
                        this.display();
                    })();
                })
            );

        if (!ai.enabled) return;

        // --- AI Provider Settings ---
        const providerSection = container.createDiv({ cls: 'wdwxedit-ai-provider-section' });
        providerSection.setCssProps({ marginBottom: '20px' });

        new Setting(providerSection)
            .setName('智能服务商')
            .addDropdown(dropdown => {
                Object.entries(PROVIDER_DEFAULTS).forEach(([key, value]) => {
                    dropdown.addOption(key, value.name);
                });
                return dropdown
                     .setValue(ai.provider)
                     .onChange((value) => {
                         void (async () => {
                             const defaults = PROVIDER_DEFAULTS[value as AIProvider];
                             await this.settingsStore.updateAIConfig({
                                 provider: value,
                                 baseUrl: defaults.baseUrl,
                                 model: defaults.defaultModel,
                             });
                             this.display();
                         })();
                     });
             });

        new Setting(providerSection)
            .setName('接口密钥')
            .setDesc('从服务商控制台获取')
            .addText(text => text
                .setPlaceholder('必填')
                .setValue(ai.apiKey)
                .onChange((value) => {
                    void this.settingsStore.updateAIConfig({ apiKey: value });
                })
            );

        new Setting(providerSection)
            .setName('接口地址')
            .setDesc('默认地址: ' + (PROVIDER_DEFAULTS[ai.provider as AIProvider]?.baseUrl || ''))
            .addText(text => text
                .setValue(ai.baseUrl)
                .onChange((value) => {
                    void this.settingsStore.updateAIConfig({ baseUrl: value });
                })
            );

        new Setting(providerSection)
            .setName('模型名称')
            .setDesc(`推荐: ${PROVIDER_DEFAULTS[ai.provider as AIProvider]?.defaultModel || ''}`)
            .addText(text => text
                .setValue(ai.model)
                .onChange((value) => {
                    void this.settingsStore.updateAIConfig({ model: value });
                })
            );

        // Test Connection Button
        const testBtnDiv = providerSection.createDiv({ cls: 'wdwxedit-test-connection' });
        testBtnDiv.setCssProps({ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' });

        const testBtn = testBtnDiv.createEl('button', { text: '测试连接' });
        testBtn.addEventListener('click', () => {
            void (async () => {
                // Re-read settings
                getAIService().initialize();
                new Notice('正在测试 AI 连接...');
                const result = await getAIService().testConnection();
                if (result.success) {
                    new Notice('连接成功！');
                } else {
                    new Notice('连接失败: ' + result.message);
                }
            })();
        });


        // --- Title Generation Settings ---
        new Setting(container).setName('标题生成设置').setHeading().settingEl.addClass('wdwxedit-section-header');
        const titleSection = container.createDiv({ cls: 'wdwxedit-title-settings' });

        new Setting(titleSection)
            .setName('自定义标题生成提示词')
            .setDesc('留空则使用默认提示词。')
            .addTextArea(text => text
                .setPlaceholder(DEFAULT_TITLE_PROMPT)
                .setValue(ai.titlePrompt)
                .onChange((value) => {
                    void this.settingsStore.updateAIConfig({ titlePrompt: value });
                })
            );

        const resetDiv = titleSection.createDiv();
        resetDiv.setCssProps({ display: 'flex', justifyContent: 'flex-end' });
        const resetBtn = resetDiv.createEl('button', { text: '重置为默认' });
        resetBtn.addEventListener('click', () => {
            void (async () => {
                await this.settingsStore.updateAIConfig({ titlePrompt: '' });
                this.display(); // Reload to show empty/placeholder
                new Notice('已重置提示词');
            })();
        });


        // --- Cover Generation Settings ---
        new Setting(container).setName('智能封面生成').setHeading().settingEl.addClass('wdwxedit-section-header');
        const coverSection = container.createDiv({ cls: 'wdwxedit-cover-settings' });

        new Setting(coverSection)
            .setName('启用封面生成')
            .setDesc('使用智能自动生成文章封面图')
            .addToggle(toggle => toggle
                .setValue(ai.enableCover)
                .onChange((value) => {
                    void (async () => {
                        await this.settingsStore.updateAIConfig({ enableCover: value });
                        this.display();
                    })();
                })
            );

        if (ai.enableCover) {
            new Setting(coverSection)
                .setName('生成方式')
                .addDropdown(dropdown => dropdown
                    .addOption('image', '直接生成图片')
                    // .addOption('html', 'HTML 渲染 (暂未通过)') // Hide if not supported or verified? 
                    // Types say 'image' | 'html'. Let's keep it if logic supports it.
                    // AIService supports logic.
                    // .addOption('html', 'HTML 模板截图') 
                    .setValue(ai.coverMethod)
                    .onChange((value) => {
                        void this.settingsStore.updateAIConfig({ coverMethod: value as 'image' | 'html' });
                    })
                );

            new Setting(coverSection)
                .setName('绘画模型')
                .setDesc('填写绘画模型名称')
                .addText(text => text
                    .setValue(ai.coverModel)
                    .onChange((value) => {
                        void this.settingsStore.updateAIConfig({ coverModel: value });
                    })
                );
        }
    }
}
