/**
 * Cover Picker Modal
 *
 * Pick a cover from recent WeChat materials, or upload a local image.
 */

import { App, Modal, Notice } from 'obsidian';
import { getWechatClient } from '../../infrastructure/wechat';
import type { MaterialItem } from '../../types/wechat.types';

export interface CoverPickerModalOptions {
    appId: string;
    appSecret: string;
    onPicked: (picked: { type: 'media'; mediaId: string }) => void;
}

export class CoverPickerModal extends Modal {
    private options: CoverPickerModalOptions;
    private activeTab: 'wechat' | 'local' = 'wechat';
    private fileInput: HTMLInputElement | null = null;
    private wechatGrid: HTMLElement | null = null;

    constructor(app: App, options: CoverPickerModalOptions) {
        super(app);
        this.options = options;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('wdwxedit-modal');
        contentEl.addClass('wdwxedit-cover-picker');

        contentEl.createEl('h2', { text: '选择封面' });

        const tabs = contentEl.createDiv({ cls: 'wdwxedit-cover-tabs' });
        const wechatTabBtn = tabs.createEl('button', { text: '公众号素材', cls: 'wdwxedit-cover-tab is-active' });
        const localTabBtn = tabs.createEl('button', { text: '本地图片', cls: 'wdwxedit-cover-tab' });

        const panel = contentEl.createDiv({ cls: 'wdwxedit-cover-panel' });
        const wechatPanel = panel.createDiv({ cls: 'wdwxedit-cover-panel-wechat' });
        const localPanel = panel.createDiv({ cls: 'wdwxedit-cover-panel-local' });

        const switchTab = (tab: 'wechat' | 'local') => {
            this.activeTab = tab;
            wechatTabBtn.toggleClass('is-active', tab === 'wechat');
            localTabBtn.toggleClass('is-active', tab === 'local');
            wechatPanel.style.display = tab === 'wechat' ? 'block' : 'none';
            localPanel.style.display = tab === 'local' ? 'block' : 'none';
        };

        wechatTabBtn.addEventListener('click', () => switchTab('wechat'));
        localTabBtn.addEventListener('click', () => switchTab('local'));

        // WeChat materials panel
        const wechatActions = wechatPanel.createDiv({ cls: 'wdwxedit-cover-actions' });
        const refreshBtn = wechatActions.createEl('button', { text: '刷新最近 20 张' });
        const hint = wechatPanel.createDiv({ cls: 'wdwxedit-cover-hint' });
        hint.setText('点击图片即可选择（使用素材 media_id）。');

        const grid = wechatPanel.createDiv({ cls: 'wdwxedit-cover-grid' });
        this.wechatGrid = grid;

        refreshBtn.addEventListener('click', () => this.loadWechatMaterials());

        // Local panel
        const localHint = localPanel.createDiv({ cls: 'wdwxedit-cover-hint' });
        localHint.setText('从本地选择图片后会上传到公众号素材库。');

        const localActions = localPanel.createDiv({ cls: 'wdwxedit-cover-actions' });
        const pickLocalBtn = localActions.createEl('button', { text: '选择本地图片...' });

        this.fileInput = localPanel.createEl('input', { type: 'file', attr: { accept: 'image/*' } });
        this.fileInput.style.display = 'none';

        pickLocalBtn.addEventListener('click', () => this.fileInput?.click());
        this.fileInput.addEventListener('change', async () => {
            const file = this.fileInput?.files?.[0];
            if (!file) return;
            await this.uploadLocalCover(file);
        });

        // Default
        switchTab('wechat');
        void this.loadWechatMaterials();
    }

    private async loadWechatMaterials(): Promise<void> {
        if (!this.wechatGrid) return;
        this.wechatGrid.empty();
        this.wechatGrid.createDiv({ cls: 'wdwxedit-cover-loading', text: '加载中...' });

        const client = getWechatClient(this.options.appId, this.options.appSecret);
        const result = await client.listMaterials('image', 20, 0);
        this.wechatGrid.empty();

        if (!result.success) {
            this.wechatGrid.createDiv({ cls: 'wdwxedit-cover-error', text: result.error || '加载失败' });
            return;
        }

        const items = result.items || [];
        if (items.length === 0) {
            this.wechatGrid.createDiv({ cls: 'wdwxedit-cover-empty', text: '暂无素材' });
            return;
        }

        items.forEach(item => this.wechatGrid?.appendChild(this.buildMaterialCard(item)));
    }

    private buildMaterialCard(item: MaterialItem): HTMLElement {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'wdwxedit-cover-card';
        card.title = item.name || item.media_id;

        const img = document.createElement('img');
        img.className = 'wdwxedit-cover-thumb';
        img.alt = item.name || 'cover';
        if (item.url) img.src = item.url;

        const meta = document.createElement('div');
        meta.className = 'wdwxedit-cover-meta';
        meta.textContent = item.name || item.media_id.slice(0, 12) + '...';

        card.appendChild(img);
        card.appendChild(meta);

        card.addEventListener('click', () => {
            this.options.onPicked({ type: 'media', mediaId: item.media_id });
            this.close();
        });

        return card;
    }

    private async uploadLocalCover(file: File): Promise<void> {
        const client = getWechatClient(this.options.appId, this.options.appSecret);
        const upload = await client.uploadImage(file, file.name, 'image');
        if (!upload.success || !upload.mediaId) {
            new Notice(upload.error || '封面上传失败');
            return;
        }

        this.options.onPicked({ type: 'media', mediaId: upload.mediaId });
        new Notice('封面已上传');
        this.close();
    }
}

