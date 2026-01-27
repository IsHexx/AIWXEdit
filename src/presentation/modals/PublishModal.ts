/**
 * Publish Modal
 *
 * Collect publish options and create a WeChat draft.
 */

import { App, Modal, Notice, Setting, TFile, requestUrl } from 'obsidian';
import type { ParsedArticle } from '../../types/article.types';
import { getPublishService } from '../../application';
import { getSettingsStore } from '../../infrastructure/storage';
import { getWechatClient } from '../../infrastructure/wechat';
import { getAIService } from '../../application';
import { CoverPickerModal } from './CoverPickerModal';
import type { WechatAccountConfig } from '../../types/settings.types';

export interface PublishModalOptions {
    article?: ParsedArticle;
    onPublished?: () => void;
    coverOverride?: CoverSource;
}

type CoverSource =
    | { type: 'none' }
    | { type: 'path'; path: string }
    | { type: 'media'; mediaId: string }
    | { type: 'blob'; blob: Blob; filename: string };

export class PublishModal extends Modal {
    private file: TFile;
    private article?: ParsedArticle;
    private onPublished?: () => void;
    private initialCoverOverride?: CoverSource;

    private coverSource: CoverSource = { type: 'none' };
    private coverManuallySet: boolean = false;

    constructor(modalApp: App, file: TFile, options: PublishModalOptions = {}) {
        super(modalApp);
        this.file = file;
        this.article = options.article;
        this.onPublished = options.onPublished;
        this.initialCoverOverride = options.coverOverride;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('wdwxedit-modal');

        contentEl.createEl('h2', { text: '发布到公众号草稿' });

        const settings = getSettingsStore().getAll();
        const accounts = settings.accounts;
        const defaultAccount = settings.accounts[settings.defaultAccountIndex];

        if (accounts.length === 0) {
            contentEl.createEl('p', { text: '请先在设置中配置公众号账号。' });
            return;
        }

        const state = {
            appId: defaultAccount?.appId || accounts[0].appId,
            title: this.article?.metadata.title || this.file.basename,
            digest: this.article?.metadata.digest || '',
            author: this.article?.metadata.author || defaultAccount?.author || '',
            coverPath: this.article?.metadata.cover || '',
            coverMediaId: '',
            useExistingDraft: false,
            existingDraftId: '',
        };

        if (this.initialCoverOverride) {
            this.coverSource = this.initialCoverOverride;
            this.coverManuallySet = true;
            if (this.initialCoverOverride.type === 'path') {
                state.coverPath = this.initialCoverOverride.path;
            } else if (this.initialCoverOverride.type === 'media') {
                state.coverMediaId = this.initialCoverOverride.mediaId;
            }
        } else {
            this.coverSource = state.coverPath ? { type: 'path', path: state.coverPath } : { type: 'none' };
        }

        // Account selector
        let onAccountChanged: (() => void) | null = null;
        new Setting(contentEl)
            .setName('公众号账号')
            .addDropdown(dropdown => {
                accounts.forEach(acc => {
                    dropdown.addOption(acc.appId, acc.name || acc.appId);
                });
                dropdown.setValue(state.appId);
                dropdown.onChange(value => {
                    state.appId = value;
                    onAccountChanged?.();
                });
            });

        new Setting(contentEl)
            .setName('标题')
            .addText(text => text
                .setValue(state.title)
                .onChange(value => { state.title = value.trim(); })
            );

        new Setting(contentEl)
            .setName('摘要')
            .addTextArea(text => text
                .setValue(state.digest)
                .onChange(value => { state.digest = value.trim(); })
            );

        new Setting(contentEl)
            .setName('作者')
            .setDesc('留空则使用账号默认作者')
            .addText(text => text
                .setValue(state.author)
                .onChange(value => { state.author = value.trim(); })
            );

        const coverSetting = new Setting(contentEl)
            .setName('封面图片路径')
            .setDesc('支持库内路径（留空则使用账号默认封面）');

        coverSetting.addText(text => text
            .setPlaceholder('封面图片路径')
            .setValue(state.coverPath)
            .onChange(value => {
                state.coverPath = value.trim();
                this.coverManuallySet = true;
                this.coverSource = state.coverPath ? { type: 'path', path: state.coverPath } : { type: 'none' };
            })
        );

        if (this.article?.metadata.cover) {
            coverSetting.addButton(btn => btn
                .setButtonText('使用文档元信息')
                .onClick(() => {
                    this.coverManuallySet = true;
                    state.coverPath = this.article?.metadata.cover || '';
                    this.coverSource = state.coverPath ? { type: 'path', path: state.coverPath } : { type: 'none' };
                    const inputEl = coverSetting.controlEl.querySelector('input') as HTMLInputElement | null;
                    if (inputEl) inputEl.value = state.coverPath;
                })
            );
        }

        // Cover media id
        const coverMediaSetting = new Setting(contentEl)
            .setName('封面素材编号')
            .setDesc('已上传素材可直接填写素材编号（留空则使用账号默认封面）')
            .addText(text => text
                .setPlaceholder('可选')
                .setValue(state.coverMediaId)
                .onChange(value => {
                    state.coverMediaId = value.trim();
                    this.coverManuallySet = true;
                    if (state.coverMediaId) {
                        this.coverSource = { type: 'media', mediaId: state.coverMediaId };
                    } else if (state.coverPath) {
                        this.coverSource = { type: 'path', path: state.coverPath };
                    } else {
                        this.coverSource = { type: 'none' };
                    }
                })
            );
        coverMediaSetting.settingEl.addClass('wdwxedit-cover-media-row');

        const coverMediaInput = coverMediaSetting.controlEl.querySelector('input') as HTMLInputElement | null;

        coverMediaSetting.addButton(btn => btn
            .setButtonText('上传封面')
            .onClick(() => {
                const account = accounts.find(acc => acc.appId === state.appId);
                if (!account) {
                    new Notice('未找到公众号账号');
                    return;
                }

                new CoverPickerModal(this.app, {
                    appId: account.appId,
                    appSecret: account.appSecret,
                    onPicked: (picked) => {
                        this.coverManuallySet = true;
                        state.coverMediaId = picked.mediaId;
                        this.coverSource = { type: 'media', mediaId: picked.mediaId };
                        state.coverPath = '';
                        if (coverMediaInput) coverMediaInput.value = picked.mediaId;
                        const coverPathInput = coverSetting.controlEl.querySelector('input') as HTMLInputElement | null;
                        if (coverPathInput) coverPathInput.value = '';
                    },
                }).open();
            })
        );

        onAccountChanged = () => {
            void this.tryUseLatestMaterialCover(accounts, state, coverSetting, coverMediaSetting);
        };
        void this.tryUseLatestMaterialCover(accounts, state, coverSetting, coverMediaSetting);

        // AI cover generation (image only)
        if (getAIService().isAvailable()) {
            new Setting(contentEl)
                .setName('智能生成封面')
                .setDesc('使用智能生成封面图片（图片模式）')
                .addButton(btn => btn
                    .setButtonText('生成封面')
                    .onClick(() => {
                        void (async () => {
                            btn.setButtonText('生成中...');
                            btn.setDisabled(true);
                            try {
                                const result = await getAIService().generateCoverImage(
                                    state.title,
                                    state.digest || this.article?.markdownContent?.slice(0, 200) || ''
                                );
                                if (!result.success) {
                                    new Notice(result.error || 'AI 生成失败');
                                    return;
                                }

                                const blob = await this.createCoverBlob(result.imageUrl, result.base64Data);
                                if (!blob) {
                                    new Notice('无法处理 AI 生成图片');
                                    return;
                                }
                                this.coverManuallySet = true;
                                this.coverSource = { type: 'blob', blob, filename: `cover-${Date.now()}.png` };
                                new Notice('AI 封面已生成');
                            } finally {
                                btn.setButtonText('生成封面');
                                btn.setDisabled(false);
                            }
                        })();
                    })
                );
        }

        // Existing draft
        new Setting(contentEl)
            .setName('更新已有草稿')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(value => {
                    state.useExistingDraft = value;
                })
            );

        const draftSetting = new Setting(contentEl)
            .setName('草稿编号')
            .setDesc('填写草稿编号以更新已有草稿');

        draftSetting.addText(text => text
            .setPlaceholder('可选')
            .setValue(state.existingDraftId)
            .onChange(value => { state.existingDraftId = value.trim(); })
        );

        const footer = contentEl.createDiv({ cls: 'wdwxedit-modal-footer' });
        const cancelBtn = footer.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => this.close());

        const publishBtn = footer.createEl('button', { text: '发布草稿', cls: 'mod-cta' });
        publishBtn.addEventListener('click', () => {
            void (async () => {
                publishBtn.disabled = true;
                publishBtn.textContent = '发布中...';
                try {
                    const account = accounts.find(acc => acc.appId === state.appId);
                    if (!account) {
                        new Notice('未找到公众号账号');
                        return;
                    }

                    let coverMediaId: string | undefined;
                    let coverPath: string | undefined;
                    if (this.coverSource.type === 'media') {
                        coverMediaId = this.coverSource.mediaId;
                    } else if (this.coverSource.type === 'blob') {
                        const upload = await getWechatClient(account.appId, account.appSecret)
                            .uploadImage(this.coverSource.blob, this.coverSource.filename, 'image');
                        if (!upload.success || !upload.mediaId) {
                            new Notice(upload.error || '封面上传失败');
                            return;
                        }
                        coverMediaId = upload.mediaId;
                    } else if (this.coverSource.type === 'path') {
                        coverPath = this.coverSource.path;
                    }

                    const result = await getPublishService().publish(this.file, {
                        appId: state.appId,
                        title: state.title,
                        digest: state.digest,
                        author: state.author,
                        thumbMediaId: coverMediaId,
                        coverPath,
                        existingDraftId: state.useExistingDraft ? state.existingDraftId : undefined,
                    });

                    if (result.success) {
                        new Notice(`发布成功，已上传图片 ${result.uploadedImages ?? 0} 张`);
                        this.onPublished?.();
                        this.close();
                    } else {
                        new Notice(result.error || '发布失败');
                    }
                } finally {
                    publishBtn.disabled = false;
                    publishBtn.textContent = '发布草稿';
                }
            })();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async createCoverBlob(imageUrl?: string, base64Data?: string): Promise<Blob | null> {
        if (base64Data) {
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new Blob([bytes], { type: 'image/png' });
        }

        if (imageUrl) {
            const response = await requestUrl({ url: imageUrl, method: 'GET' });
            const buffer = response.arrayBuffer;
            return new Blob([buffer], { type: 'image/png' });
        }

        return null;
    }

    private async tryUseLatestMaterialCover(
        accounts: WechatAccountConfig[],
        state: { appId: string; coverPath: string; coverMediaId: string },
        coverSetting: Setting,
        coverMediaSetting: Setting
    ): Promise<void> {
        if (this.coverManuallySet) return;
        if (state.coverMediaId || state.coverPath) return;
        if (this.coverSource.type !== 'none') return;

        const account = accounts.find(acc => acc.appId === state.appId);
        if (!account) return;

        const client = getWechatClient(account.appId, account.appSecret);
        const result = await client.listMaterials('image', 20, 0);
        if (!result.success) return;

        const items = result.items || [];
        if (items.length === 0) return;

        const latest = [...items].sort((a, b) => (b.update_time || 0) - (a.update_time || 0))[0];
        if (!latest?.media_id) return;

        // Only apply if still untouched.
        if (this.coverManuallySet) return;
        if (state.coverMediaId || state.coverPath) return;
        if (this.coverSource.type !== 'none') return;

        state.coverMediaId = latest.media_id;
        this.coverSource = { type: 'media', mediaId: latest.media_id };

        const coverMediaInput = coverMediaSetting.controlEl.querySelector('input') as HTMLInputElement | null;
        if (coverMediaInput) coverMediaInput.value = latest.media_id;

        const coverPathInput = coverSetting.controlEl.querySelector('input') as HTMLInputElement | null;
        if (coverPathInput) coverPathInput.value = '';
    }
}
