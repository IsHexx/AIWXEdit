/**
 * Account Modal
 *
 * Add or edit WeChat account configuration.
 */

import { App, Modal, Setting, Notice } from 'obsidian';
import type { WechatAccountConfig } from '../../types/settings.types';
import { getSettingsStore } from '../../infrastructure/storage';

export interface AccountModalOptions {
    account?: WechatAccountConfig;
    onSaved?: () => void;
}

export class AccountModal extends Modal {
    private account?: WechatAccountConfig;
    private onSaved?: () => void;
    private isDefault = false;

    constructor(modalApp: App, options: AccountModalOptions = {}) {
        super(modalApp);
        this.account = options.account;
        this.onSaved = options.onSaved;
        this.isDefault = false;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('wdwxedit-modal');

        contentEl.createEl('h2', { text: this.account ? '编辑公众号账号' : '添加公众号账号' });

        const settingsStore = getSettingsStore();
        const defaultAccount = settingsStore.getDefaultAccount();
        this.isDefault = !!(this.account && defaultAccount && defaultAccount.appId === this.account.appId);

        const state = {
            name: this.account?.name || '',
            appId: this.account?.appId || '',
            appSecret: this.account?.appSecret || '',
            author: this.account?.author || '',
        };

        new Setting(contentEl)
            .setName('账号名称')
            .setDesc('用于区分多个公众号')
            .addText(text => text
                .setPlaceholder('例如：我的公众号')
                .setValue(state.name)
                .onChange(value => { state.name = value.trim(); })
            );

        new Setting(contentEl)
            .setName('AppID')
            .setDesc('在公众号后台获取')
            .addText(text => text
                .setPlaceholder('wx123...')
                .setValue(state.appId)
                .onChange(value => { state.appId = value.trim(); })
            );

        // Obsidian TextComponent doesn't support type=password; use input element directly
        const secretSetting = new Setting(contentEl)
            .setName('AppSecret')
            .setDesc('在公众号后台获取');
        const secretInput = secretSetting.controlEl.createEl('input', {
            type: 'password',
            cls: 'setting-item-control',
        });
        secretInput.value = state.appSecret;
        secretInput.addEventListener('input', () => {
            state.appSecret = secretInput.value.trim();
        });

        new Setting(contentEl)
            .setName('默认作者')
            .setDesc('用于发布时默认作者')
            .addText(text => text
                .setPlaceholder('可选')
                .setValue(state.author)
                .onChange(value => { state.author = value.trim(); })
            );

        const defaultSetting = new Setting(contentEl)
            .setName('设为默认账号')
            .setDesc('用于发布时默认选择');

        defaultSetting.addToggle(toggle => toggle
            .setValue(this.isDefault)
            .onChange(value => { this.isDefault = value; })
        );

        const footer = contentEl.createDiv({ cls: 'wdwxedit-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            if (!state.appId || !state.appSecret) {
                new Notice('请填写 AppID 和 AppSecret');
                return;
            }

            const store = settingsStore;
            const originalAppId = this.account?.appId;
            const newAccount: WechatAccountConfig = {
                name: state.name || state.appId,
                appId: state.appId,
                appSecret: state.appSecret,
                author: state.author || undefined,
            };

            if (originalAppId && originalAppId !== state.appId) {
                await store.removeAccount(originalAppId);
                await store.addAccount(newAccount);
            } else if (originalAppId) {
                await store.updateAccount(originalAppId, newAccount);
            } else {
                await store.addAccount(newAccount);
            }

            if (this.isDefault) {
                const accounts = store.getAccounts();
                const index = accounts.findIndex(acc => acc.appId === newAccount.appId);
                if (index >= 0) {
                    await store.setDefaultAccount(index);
                }
            }

            new Notice('账号已保存');
            this.onSaved?.();
            this.close();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
