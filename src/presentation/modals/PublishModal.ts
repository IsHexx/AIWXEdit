import { App, Modal, Notice, TFile, requestUrl } from 'obsidian';
import type { ParsedArticle } from '../../types/article.types';
import { getPublishService, getAIService } from '../../application';
import { getPublishDefaults, readPublishMetadata, validatePublishFields } from '../../application/publishOptions';
import { getSettingsStore } from '../../infrastructure/storage';
import { getWechatClient } from '../../infrastructure/wechat';
import { CoverPickerModal } from './CoverPickerModal';

export interface PublishModalOptions {
    article?: ParsedArticle;
    onPublished?: () => void;
    coverOverride?: CoverSource;
}

type CoverSource =
    | { type: 'none' }
    | { type: 'path'; path: string }
    | { type: 'media'; mediaId: string; previewUrl?: string }
    | { type: 'blob'; blob: Blob; filename: string };

export class PublishModal extends Modal {
    private coverSource: CoverSource = { type: 'none' };
    private objectUrl?: string;
    private generation = 0;
    private busy = false;

    constructor(modalApp: App, private file: TFile, private options: PublishModalOptions = {}) {
        super(modalApp);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('wdwxedit-modal', 'wdwxedit-publish-modal');
        this.modalEl.addClass('wdwxedit-publish-dialog');
        const header = contentEl.createDiv({ cls: 'wdwxedit-publish-header' });
        header.createEl('h2', { text: '保存到公众号草稿箱' });
        header.createEl('p', { text: this.file.basename, cls: 'wdwxedit-publish-subtitle' });
        const store = getSettingsStore();
        const settings = store.getAll();
        const accounts = settings.accounts;
        if (!accounts.length) {
            contentEl.createEl('p', { text: '请先在设置中配置公众号账号。' });
            return;
        }
        const metadata = { title: this.file.basename, ...this.options.article?.metadata,
            ...readPublishMetadata(this.app.metadataCache.getFileCache(this.file)?.frontmatter ?? {}) };
        let account = accounts[settings.defaultAccountIndex] ?? accounts[0];
        const defaults = getPublishDefaults(metadata, account);
        const extractDigest = () => {
            const doc = new DOMParser().parseFromString(this.options.article?.htmlContent ?? '', 'text/html');
            doc.querySelectorAll('script,style,pre,table,code,.code-section,.code-block-wrapper,h1,h2,h3,h4,h5,h6').forEach(el => el.remove());
            const paragraphs = Array.from(doc.body.querySelectorAll('p')).map(el => el.textContent?.trim()).filter(Boolean);
            return Array.from((paragraphs.join(' ') || doc.body.textContent || '').replace(/\s+/g, ' ').trim()).slice(0, 120).join('');
        };
        const state = { appId: account.appId, title: metadata.title, author: defaults.author,
            digest: metadata.digest ?? extractDigest(), contentSourceUrl: defaults.contentSourceUrl,
            needOpenComment: defaults.needOpenComment, onlyFansCanComment: defaults.onlyFansCanComment,
            remember: false, update: false, draftId: '', draftIndex: 0 };
        let authorEdited = false;
        let commentsEdited = false;
        let refreshCover = () => {};
        const layout = contentEl.createDiv({ cls: 'wdwxedit-publish-layout' });
        const form = layout.createDiv({ cls: 'wdwxedit-publish-form' });
        const aside = layout.createDiv({ cls: 'wdwxedit-publish-aside' });
        const section = (parent: HTMLElement, title: string) => {
            const el = parent.createDiv({ cls: 'wdwxedit-publish-section' });
            el.createEl('h3', { text: title });
            return el;
        };
        const basic = section(form, '文章信息');
        const field = (parent: HTMLElement, name: string, value: string, change: (value: string) => void, multiline = false, limit?: number) => {
            const label = parent.createEl('label', { cls: 'wdwxedit-publish-field' });
            const line = label.createDiv({ cls: 'wdwxedit-publish-field-label' });
            line.createSpan({ text: name });
            const counter = line.createSpan({ cls: 'wdwxedit-publish-counter' });
            const input = multiline ? label.createEl('textarea') : label.createEl('input', { type: 'text' });
            input.value = value;
            input.setAttribute('aria-label', name);
            if (multiline) (input as HTMLTextAreaElement).rows = 3;
            const refresh = () => {
                const count = Array.from(input.value).length;
                counter.textContent = limit ? `${count} / ${limit}` : '';
                counter.toggleClass('is-over-limit', !!limit && count > limit);
            };
            refresh();
            input.addEventListener('input', () => { change(input.value); refresh(); updateCard(); });
            return { input, refresh };
        };
        const accountLabel = basic.createEl('label', { cls: 'wdwxedit-publish-field' });
        accountLabel.createSpan({ text: '公众号' });
        const accountSelect = accountLabel.createEl('select', { attr: { 'aria-label': '公众号' } });
        accounts.forEach(acc => accountSelect.createEl('option', { text: acc.name || acc.appId, value: acc.appId }));
        accountSelect.value = state.appId;
        field(basic, '标题', state.title, value => { state.title = value; }, false, 32);
        const author = field(basic, '作者', state.author, value => { state.author = value; authorEdited = true; }, false, 16);
        const digest = field(basic, '摘要', state.digest, value => { state.digest = value; }, true, 120);
        const digestTools = basic.createDiv({ cls: 'wdwxedit-publish-tools' });
        digestTools.createSpan({ text: metadata.digest ? '已从笔记属性预填' : '已从正文提取，可直接修改；留空由微信生成', cls: 'wdwxedit-publish-hint' });
        const extract = digestTools.createEl('button', { text: '从正文提取' });
        extract.addEventListener('click', () => {
            state.digest = extractDigest();
            digest.input.value = state.digest;
            digest.refresh();
            updateCard();
        });
        const cover = section(form, '封面');
        const coverStatus = cover.createDiv({ cls: 'wdwxedit-publish-cover-status' });
        const coverActions = cover.createDiv({ cls: 'wdwxedit-publish-tools' });
        const pick = coverActions.createEl('button', { text: '选择 / 上传封面' });
        pick.addEventListener('click', () => {
            const selectedAppId = state.appId;
            new CoverPickerModal(this.app, { appId: account.appId, appSecret: account.appSecret,
                onPicked: picked => {
                    if (state.appId !== selectedAppId || !contentEl.isConnected) return;
                    this.coverSource = { type: 'media', mediaId: picked.mediaId, previewUrl: picked.previewUrl };
                    coverPath.input.value = '';
                    mediaId.input.value = picked.mediaId;
                    updateCard();
                } }).open();
        });
        const resetCover = coverActions.createEl('button', { text: '使用默认封面' });
        const coverDetails = cover.createEl('details');
        coverDetails.createEl('summary', { text: '库内图片与素材编号' });
        const coverPath = field(coverDetails, '封面路径', '', value => {
            this.coverSource = value.trim() ? { type: 'path', path: value.trim() } : { type: 'none' };
            mediaId.input.value = '';
        });
        coverPath.input.placeholder = '库内图片路径，相对于当前笔记';
        const mediaId = field(coverDetails, '封面素材编号', '', value => {
            this.coverSource = value.trim() ? { type: 'media', mediaId: value.trim() } : { type: 'none' };
            coverPath.input.value = '';
        });
        const applyCoverDefault = () => {
            this.coverSource = metadata.cover ? { type: 'path', path: metadata.cover }
                : account.defaultCoverMediaId ? { type: 'media', mediaId: account.defaultCoverMediaId }
                : account.defaultCoverPath ? { type: 'path', path: `/${account.defaultCoverPath.replace(/^\//, '')}` }
                : { type: 'none' };
            coverPath.input.value = this.coverSource.type === 'path' ? this.coverSource.path : '';
            mediaId.input.value = this.coverSource.type === 'media' ? this.coverSource.mediaId : '';
        };
        resetCover.addEventListener('click', () => { applyCoverDefault(); updateCard(); });
        applyCoverDefault();
        if (this.options.coverOverride && this.options.coverOverride.type !== 'none') {
            this.coverSource = this.options.coverOverride;
            coverPath.input.value = this.coverSource.type === 'path' ? this.coverSource.path : '';
            mediaId.input.value = this.coverSource.type === 'media' ? this.coverSource.mediaId : '';
        }
        if (getAIService().isAvailable()) {
            const ai = coverActions.createEl('button', { text: 'AI 生成封面' });
            ai.addEventListener('click', () => { void (async () => {
                const appId = state.appId;
                ai.disabled = true;
                ai.textContent = '生成中…';
                try {
                    const result = await getAIService().generateCoverImage(state.title, state.digest || this.options.article?.markdownContent.slice(0, 200) || '');
                    if (!result.success) throw new Error(result.error || 'AI 生成失败');
                    const blob = await this.createCoverBlob(result.imageUrl, result.base64Data);
                    if (!blob) throw new Error('无法处理 AI 生成图片');
                    if (appId !== state.appId || !contentEl.isConnected || this.busy) return;
                    this.coverSource = { type: 'blob', blob, filename: `cover-${Date.now()}.png` };
                    coverPath.input.value = ''; mediaId.input.value = '';
                    updateCard();
                } catch (error) { new Notice(error instanceof Error ? error.message : '生成失败'); }
                finally { ai.disabled = this.busy; ai.textContent = 'AI 生成封面'; }
            })(); });
        }
        const extras = section(form, '链接与留言');
        field(extras, '阅读原文链接', state.contentSourceUrl, value => { state.contentSourceUrl = value; }).input.placeholder = '填写完整网页地址（可选）';
        const toggle = (parent: HTMLElement, name: string, value: boolean, change: (value: boolean) => void) => {
            const label = parent.createEl('label', { cls: 'wdwxedit-publish-toggle' });
            const input = label.createEl('input', { type: 'checkbox' });
            input.checked = value;
            label.createSpan({ text: name });
            input.addEventListener('change', () => { change(input.checked); updateCard(); });
            return input;
        };
        const comments = toggle(extras, '开启留言', state.needOpenComment, value => {
            state.needOpenComment = value; commentsEdited = true;
            fans.disabled = !value;
            if (!value) { fans.checked = false; state.onlyFansCanComment = false; }
        });
        const fans = toggle(extras, '仅关注者可留言', state.onlyFansCanComment, value => { state.onlyFansCanComment = value; commentsEdited = true; });
        fans.disabled = !state.needOpenComment;
        toggle(extras, '将作者与留言设置记为此账号默认值', false, value => { state.remember = value; });
        const advanced = form.createEl('details', { cls: 'wdwxedit-publish-section' });
        advanced.createEl('summary', { text: '更新已有草稿' });
        toggle(advanced, '替换选中的草稿文章', false, value => { state.update = value; draftControls.hidden = !value; });
        const draftControls = advanced.createDiv();
        draftControls.hidden = true;
        const draftSelect = draftControls.createEl('select', { attr: { 'aria-label': '选择已有草稿文章' } });
        draftSelect.createEl('option', { text: '请先加载草稿列表', value: '' });
        const draftChoices = new Map<string, { id: string; index: number }>();
        draftSelect.addEventListener('change', () => {
            const choice = draftChoices.get(draftSelect.value);
            state.draftId = choice?.id ?? ''; state.draftIndex = choice?.index ?? 0;
            updateCard();
        });
        const load = draftControls.createEl('button', { text: '加载最近草稿' });
        load.addEventListener('click', () => { void (async () => {
            const generation = ++this.generation;
            const appId = state.appId;
            load.disabled = true; load.textContent = '加载中…';
            try {
                const result = await getWechatClient(account.appId, account.appSecret).batchGetDrafts(0, 20, true);
                if (generation !== this.generation || appId !== state.appId || !contentEl.isConnected || this.busy) return;
                if (!result.success) throw new Error(result.error || '草稿列表加载失败');
                draftChoices.clear(); draftSelect.empty(); state.draftId = '';
                draftSelect.createEl('option', { text: '请选择要替换的文章', value: '' });
                for (const item of result.items ?? []) {
                    item.content?.news_item.forEach((news, index) => {
                        const key = `${item.media_id}:${index}`;
                        draftChoices.set(key, { id: item.media_id, index });
                        draftSelect.createEl('option', { text: news.title || '未命名文章', value: key });
                    });
                }
                if (!draftChoices.size) draftSelect.options[0].textContent = '暂无可更新的草稿';
            } catch (error) { new Notice(error instanceof Error ? error.message : '加载失败'); }
            finally { load.disabled = this.busy; load.textContent = '刷新最近草稿'; }
        })(); });
        advanced.createEl('p', { text: '默认新建草稿。仅替换选中的文章，同名文章不会自动覆盖。', cls: 'wdwxedit-publish-hint' });
        const card = section(aside, '分享信息预览');
        const coverPreview = card.createDiv({ cls: 'wdwxedit-publish-cover-preview' });
        const cardTitle = card.createEl('h4');
        const cardAuthor = card.createDiv({ cls: 'wdwxedit-publish-hint' });
        const cardDigest = card.createEl('p', { cls: 'wdwxedit-publish-card-digest' });
        const status = card.createDiv({ cls: 'wdwxedit-publish-status' });
        const manual = section(aside, '微信后台确认');
        manual.createEl('strong', { text: '原创声明' });
        manual.createEl('p', { text: '公开草稿接口没有原创声明参数。保存后，请在微信后台完成原创声明与转载权限设置。', cls: 'wdwxedit-publish-hint' });
        manual.createEl('p', { text: '赞赏、付费、群发与定时发送也需在微信后台确认。', cls: 'wdwxedit-publish-hint' });
        manual.createEl('a', { text: '微信官方草稿接口说明 ↗', href: 'https://developers.weixin.qq.com/doc/service/api/draftbox/draftmanage/api_draft_add.html', attr: { target: '_blank', rel: 'noopener noreferrer' } });
        const feedback = contentEl.createDiv({ cls: 'wdwxedit-publish-feedback', attr: { role: 'status', 'aria-live': 'polite' } });
        const footer = contentEl.createDiv({ cls: 'wdwxedit-modal-footer wdwxedit-publish-footer' });
        footer.createSpan({ text: '保存为草稿后，可在微信后台继续编辑。', cls: 'wdwxedit-publish-hint' });
        const cancel = footer.createEl('button', { text: '取消' });
        cancel.addEventListener('click', () => this.close());
        const save = footer.createEl('button', { text: '保存到草稿箱', cls: 'mod-cta' });
        function updateCard() {
            cardTitle.textContent = state.title || '文章标题';
            cardAuthor.textContent = state.author || '未填写作者';
            cardDigest.textContent = state.digest || '摘要由微信从正文自动提取';
            status.textContent = `${state.update ? '更新选中草稿' : '新建草稿'} · ${state.needOpenComment ? state.onlyFansCanComment ? '仅关注者留言' : '所有人可留言' : '留言关闭'}`;
            refreshCover();
        }
        const updateCover = () => {
            if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = undefined; }
            coverPreview.empty();
            let src = '';
            if (this.coverSource.type === 'media' && /^https?:\/\//.test(this.coverSource.previewUrl ?? '')) src = this.coverSource.previewUrl!;
            if (this.coverSource.type === 'blob') { this.objectUrl = URL.createObjectURL(this.coverSource.blob); src = this.objectUrl; }
            if (this.coverSource.type === 'path') {
                const path = this.coverSource.path.replace(/^\//, '');
                const file = this.app.metadataCache.getFirstLinkpathDest(path, this.file.path);
                if (file) src = this.app.vault.getResourcePath(file);
            }
            if (src) coverPreview.createEl('img', { attr: { src, alt: '当前封面' } });
            else coverPreview.createSpan({ text: this.coverSource.type === 'media' ? '已选择公众号封面素材' : '请选择封面' });
            coverStatus.textContent = this.coverSource.type === 'path' ? `库内图片 · ${this.coverSource.path}`
                : this.coverSource.type === 'media' ? '已选择此公众号的永久图片素材'
                : this.coverSource.type === 'blob' ? 'AI 封面已就绪，保存时上传' : '需要选择一张封面后保存';
        };
        // The card reflects local form state; opening the dialog makes no network requests.
        refreshCover = updateCover;
        accountSelect.addEventListener('change', () => {
            this.generation++;
            state.appId = accountSelect.value;
            account = accounts.find(acc => acc.appId === state.appId)!;
            const next = getPublishDefaults(metadata, account);
            if (!authorEdited) { state.author = next.author; author.input.value = next.author; author.refresh(); }
            if (!commentsEdited) {
                state.needOpenComment = next.needOpenComment; state.onlyFansCanComment = next.onlyFansCanComment;
                comments.checked = next.needOpenComment; fans.checked = next.onlyFansCanComment; fans.disabled = !next.needOpenComment;
            }
            state.draftId = ''; state.draftIndex = 0; draftChoices.clear(); draftSelect.empty();
            draftSelect.createEl('option', { text: '请重新加载此账号草稿', value: '' });
            applyCoverDefault(); updateCard(); updateCover();
        });
        save.addEventListener('click', () => { void (async () => {
            if (this.busy) return;
            const fields = { title: state.title.trim(), author: state.author.trim(), digest: state.digest.trim(), contentSourceUrl: state.contentSourceUrl.trim() };
            const error = validatePublishFields(fields)
                ?? (state.update && !state.draftId ? '请选择需要更新的草稿文章' : undefined)
                ?? (this.coverSource.type === 'none' ? '请选择封面图片' : undefined);
            feedback.textContent = error ?? '';
            feedback.toggleClass('is-error', !!error);
            if (error) return;
            this.busy = true; save.disabled = true; cancel.disabled = true;
            form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach(el => { el.disabled = true; });
            const snapshot = { ...state };
            save.textContent = '正在保存…';
            try {
                let thumbMediaId = this.coverSource.type === 'media' ? this.coverSource.mediaId : undefined;
                const coverPath = this.coverSource.type === 'path' ? this.coverSource.path : undefined;
                if (this.coverSource.type === 'blob') {
                    feedback.textContent = '正在上传封面…';
                    const uploaded = await getWechatClient(account.appId, account.appSecret).uploadImage(this.coverSource.blob, this.coverSource.filename, 'image');
                    if (!uploaded.success || !uploaded.mediaId) throw new Error(uploaded.error || '封面上传失败');
                    thumbMediaId = uploaded.mediaId;
                    // Retain the uploaded material if the later draft request needs a retry.
                    this.coverSource = { type: 'media', mediaId: thumbMediaId };
                }
                feedback.textContent = '正在上传正文图片并保存草稿…';
                const result = await getPublishService().publish(this.file, { appId: snapshot.appId, ...fields, thumbMediaId, coverPath,
                    needOpenComment: snapshot.needOpenComment, onlyFansCanComment: snapshot.onlyFansCanComment,
                    existingDraftId: snapshot.update ? snapshot.draftId : undefined,
                    existingDraftIndex: snapshot.update ? snapshot.draftIndex : undefined });
                if (!result.success) throw new Error(result.error || '保存失败');
                let preferenceWarning = '';
                if (snapshot.remember) {
                    try { await store.updateAccount(snapshot.appId, { author: fields.author, publishDefaults: { needOpenComment: snapshot.needOpenComment, onlyFansCanComment: snapshot.onlyFansCanComment } }); }
                    catch { preferenceWarning = '（账号偏好未能保存）'; }
                }
                try { this.options.onPublished?.(); }
                catch { new Notice('草稿已保存，预览刷新失败，请手动刷新'); }
                layout.hidden = true; footer.empty(); feedback.empty();
                feedback.createEl('h3', { text: '已保存到公众号草稿箱' });
                feedback.createEl('p', { text: `正文图片上传 ${result.uploadedImages ?? 0} 张。请到微信后台确认原创声明，再预览发送。${preferenceWarning}` });
                const backend = footer.createEl('a', { text: '打开微信公众平台 ↗', cls: 'wdwxedit-publish-backend', href: 'https://mp.weixin.qq.com/', attr: { target: '_blank', rel: 'noopener noreferrer' } });
                backend.setAttribute('aria-label', '打开微信公众平台草稿箱');
                if (result.mediaId) {
                    const copy = footer.createEl('button', { text: '复制草稿编号' });
                    copy.addEventListener('click', () => { void navigator.clipboard.writeText(result.mediaId!).then(() => new Notice('草稿编号已复制')).catch(() => new Notice('复制失败')); });
                }
                footer.createEl('button', { text: '完成', cls: 'mod-cta' }).addEventListener('click', () => this.close());
            } catch (error) {
                feedback.textContent = error instanceof Error ? error.message : '保存失败，请重试';
                feedback.addClass('is-error');
                form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach(el => { el.disabled = false; });
                fans.disabled = !state.needOpenComment;
            } finally {
                this.busy = false; save.disabled = false; cancel.disabled = false; save.textContent = '保存到草稿箱';
            }
        })(); });
        updateCard(); updateCover();
    }

    onClose(): void {
        this.generation++;
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.contentEl.empty();
    }

    private async createCoverBlob(imageUrl?: string, base64Data?: string): Promise<Blob | null> {
        if (base64Data) {
            const binary = atob(base64Data);
            return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: 'image/png' });
        }
        if (imageUrl) {
            const response = await requestUrl({ url: imageUrl, method: 'GET' });
            return new Blob([response.arrayBuffer], { type: 'image/png' });
        }
        return null;
    }
}
