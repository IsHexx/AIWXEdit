/**
 * Settings Tab
 * 
 * Plugin settings UI in Obsidian's settings panel.
 */

import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type WDWXEditPlugin from '../../plugin';
import { getSettingsStore, getAssetStore, SettingsStore } from '../../infrastructure/storage';
import type { AIProvider } from '../../types/ai.types';
import { PROVIDER_DEFAULTS } from '../../types/ai.types';
import type { WechatAccountConfig } from '../../types/settings.types';
import { VIEW_TYPE_PUBLISH } from '../views/PublishView';
import { ThemeMarketModal } from '../modals/ThemeMarketModal';
import { getAIService } from '../../application/AIService';
import { DEFAULT_TITLE_PROMPT } from '../../infrastructure/ai/TitleGenerator';

/**
 * Settings Tab
 * 
 * Provides UI for configuring the plugin.
 */
export class SettingsTab extends PluginSettingTab {
    plugin: WDWXEditPlugin;
    private settingsStore: SettingsStore;
    private isVisible = false;

    constructor(app: App, plugin: WDWXEditPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settingsStore = getSettingsStore();

        // Listen for asset changes to refresh dropdowns
        this.plugin.registerEvent(
            (this.plugin.app.workspace as any).on('wdwxedit:assets-changed', () => {
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
        container.createEl('h2', { text: '公众号管理' });

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
                        .setButtonText('编辑')
                        .onClick(() => {
                            // Simple edit mode: remove and re-add (user can copy values)
                            // For V5, we might want a modal. For now, let's keep it simple or stick to the "list + add" model.
                            // The reference image shows a list item "祥子AI" with "Test" and "Delete" buttons (presumably). 
                            // It actually shows "测试" (Test) and "删除" (Delete).
                            // Let's implement Test and Delete buttons matching the image.
                            // But wait, how do we test basic account? Maybe check token?
                            // I'll stick to "Delete" for now as per previous logic, maybe "Set Default".

                            // Let's match the image: "祥子AI ⭐ wx..." [Test] [Delete]
                            // I will implement "Delete" and "Set Default" (if not default).
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

                // Add "Set Default" if not default
                if (!isDefault) {
                    setting.addExtraButton(btn => btn
                        .setIcon('star')
                        .setTooltip('设为默认')
                        .onClick(async () => {
                            await this.settingsStore.setDefaultAccount(index);
                            this.display();
                        })
                    );
                }
            });
        }

        // 2. Add New Account Form
        container.createEl('h3', { text: '添加新公众号' });
        const addSection = container.createDiv({ cls: 'wdwxedit-add-account-form' });
        // Use a card-like style
        addSection.style.backgroundColor = 'var(--background-secondary)';
        addSection.style.padding = '15px';
        addSection.style.borderRadius = '8px';
        addSection.style.marginTop = '10px';

        const newState = {
            name: '',
            appId: '',
            appSecret: '',
        };

        new Setting(addSection)
            .setName('公众号名称')
            .addText(text => text
                .setPlaceholder('例如：我的公众号')
                .onChange(value => { newState.name = value.trim(); })
            );

        new Setting(addSection)
            .setName('AppID')
            .addText(text => text
                .setPlaceholder('wx...')
                .onChange(value => { newState.appId = value.trim(); })
            );

        new Setting(addSection)
            .setName('AppSecret')
            .addText(text => {
                text.setPlaceholder('32位密钥')
                    .onChange(value => { newState.appSecret = value.trim(); });
                text.inputEl.type = 'password';
            });

        const btnDiv = addSection.createDiv({ cls: 'wdwxedit-form-actions' });
        btnDiv.style.display = 'flex';
        btnDiv.style.justifyContent = 'flex-end';
        btnDiv.style.marginTop = '15px';

        const addBtn = btnDiv.createEl('button', { text: '添加公众号', cls: 'mod-cta' });
        addBtn.addEventListener('click', async () => {
            if (!newState.appId || !newState.appSecret) {
                new Notice('请填写 AppID 和 AppSecret');
                return;
            }

            const newAccount: WechatAccountConfig = {
                name: newState.name || newState.appId,
                appId: newState.appId,
                appSecret: newState.appSecret,
                // Defaults
                author: '',
                defaultCoverPath: '',
                defaultCoverMediaId: '',
            };

            await this.settingsStore.addAccount(newAccount);

            // Auto set default if first account
            if (this.settingsStore.getAccounts().length === 1) {
                await this.settingsStore.setDefaultAccount(0);
            }

            new Notice('账号已添加');
            this.display();
        });
    }

    /**
     * Create style settings section
     */
    private createStyleSection(container: HTMLElement): void {
        container.createEl('h2', { text: '样式配置' });

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
                    .onChange(async (value) => {
                        await this.settingsStore.updateStyleConfig({ theme: value });
                        // Trigger preview refresh if possible, or reliance on auto-refresh
                        this.plugin.app.workspace.trigger('wdwxedit:assets-changed'); // Reuse this event to force refresh
                    });
            });

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
        container.createEl('h2', { text: 'AI 服务' });

        const ai = this.settingsStore.getAIConfig();

        new Setting(container)
            .setName('启用 AI 功能')
            .setDesc('开启后可使用 AI 生成标题和封面等功能')
            .addToggle(toggle => toggle
                .setValue(ai.enabled)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ enabled: value });
                    this.display();
                })
            );

        if (!ai.enabled) return;

        // --- AI Provider Settings ---
        const providerSection = container.createDiv({ cls: 'wdwxedit-ai-provider-section' });
        providerSection.style.marginBottom = '20px';

        new Setting(providerSection)
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

        new Setting(providerSection)
            .setName('API Key')
            .setDesc('从服务商控制台获取')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(ai.apiKey)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ apiKey: value });
                })
            );

        new Setting(providerSection)
            .setName('Base URL')
            .setDesc('默认: ' + PROVIDER_DEFAULTS[ai.provider as AIProvider]?.baseUrl || '')
            .addText(text => text
                .setValue(ai.baseUrl)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ baseUrl: value });
                })
            );

        new Setting(providerSection)
            .setName('模型名称')
            .setDesc(`推荐: ${PROVIDER_DEFAULTS[ai.provider as AIProvider]?.defaultModel || ''}`)
            .addText(text => text
                .setValue(ai.model)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ model: value });
                })
            );

        // Test Connection Button
        const testBtnDiv = providerSection.createDiv({ cls: 'wdwxedit-test-connection' });
        testBtnDiv.style.display = 'flex';
        testBtnDiv.style.justifyContent = 'flex-end';
        testBtnDiv.style.marginTop = '10px';

        const testBtn = testBtnDiv.createEl('button', { text: '测试连接' });
        testBtn.addEventListener('click', async () => {
            // Save first to ensure service uses latest credentials
            // Actually service reads from store, so waiting for store update in onChange is enough?
            // onChange is async but we don't await distinct keypresses. 
            // Ideally we should re-init service or ensure it reads latest.
            // AIService.initialize() reads from store.
            getAIService().initialize(); // Re-read settings
            new Notice('正在测试 AI 连接...');
            const result = await getAIService().testConnection();
            if (result.success) {
                new Notice('连接成功！');
            } else {
                new Notice('连接失败: ' + result.message);
            }
        });


        // --- Title Generation Settings ---
        container.createEl('h3', { text: '标题生成设置', cls: 'wdwxedit-section-header' });
        const titleSection = container.createDiv({ cls: 'wdwxedit-title-settings' });

        new Setting(titleSection)
            .setName('自定义标题生成提示词')
            .setDesc('留空则使用默认提示词。')
            .addTextArea(text => text
                .setPlaceholder(DEFAULT_TITLE_PROMPT)
                .setValue(ai.titlePrompt)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ titlePrompt: value });
                })
            );

        const resetDiv = titleSection.createDiv();
        resetDiv.style.display = 'flex';
        resetDiv.style.justifyContent = 'flex-end';
        const resetBtn = resetDiv.createEl('button', { text: '重置为默认' });
        resetBtn.addEventListener('click', async () => {
            await this.settingsStore.updateAIConfig({ titlePrompt: '' });
            this.display(); // Reload to show empty/placeholder
            new Notice('已重置提示词');
        });


        // --- Cover Generation Settings ---
        container.createEl('h3', { text: 'AI 封面生成', cls: 'wdwxedit-section-header' });
        const coverSection = container.createDiv({ cls: 'wdwxedit-cover-settings' });

        new Setting(coverSection)
            .setName('启用封面生成')
            .setDesc('使用 AI 自动生成文章封面图')
            .addToggle(toggle => toggle
                .setValue(ai.enableCover)
                .onChange(async (value) => {
                    await this.settingsStore.updateAIConfig({ enableCover: value });
                    this.display();
                })
            );

        if (ai.enableCover) {
            new Setting(coverSection)
                .setName('生成方式')
                .addDropdown(dropdown => dropdown
                    .addOption('image', '直接生成图片 (DALL-E/Flux)')
                    // .addOption('html', 'HTML 渲染 (暂未通过)') // Hide if not supported or verified? 
                    // Types say 'image' | 'html'. Let's keep it if logic supports it.
                    // AIService supports logic.
                    // .addOption('html', 'HTML 模板截图') 
                    .setValue(ai.coverMethod)
                    .onChange(async (value) => {
                        await this.settingsStore.updateAIConfig({ coverMethod: value as any });
                    })
                );

            new Setting(coverSection)
                .setName('绘画模型')
                .setDesc('例如: dall-e-3, flux-schnell-free')
                .addText(text => text
                    .setValue(ai.coverModel)
                    .onChange(async (value) => {
                        await this.settingsStore.updateAIConfig({ coverModel: value });
                    })
                );
        }
    }
}
