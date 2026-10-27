// Development smoke test. Only the disposable AIWXEdit-QA vault is permitted.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const targets = await (await fetch('http://127.0.0.1:19223/json/list')).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith('app://obsidian.md'));
assert.ok(target, 'Start the isolated Obsidian QA profile first');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id); clearTimeout(item.timer);
    if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => reject(Error(method + ' timed out')), 30000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async fn => {
    const response = await request('Runtime.evaluate', { expression: `(${fn.toString()})()`, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
};
const output = process.env.AIWXEDIT_QA_OUTPUT;
const capture = async name => {
    if (!output) return;
    const shot = await request('Page.captureScreenshot', { format: 'png' });
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
};

try {
    await request('Runtime.enable');
    await request('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1000, deviceScaleFactor: 1, mobile: false });
    const result = await evaluate(async () => {
        if (app.vault.getName() !== 'AIWXEdit-QA') throw Error('Refusing non-QA vault');
        const check = (condition, message) => { if (!condition) throw Error(message); };
        const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const until = async condition => {
            const end = Date.now() + 6000;
            while (!condition()) { if (Date.now() > end) throw Error('Timed out waiting for preview'); await frames(); }
        };
        document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark');
        const plugin = app.plugins.getPlugin('aiwxedit');
        const store = plugin.getSettingsStore();
        await store.update({ preview: { width: 'mobile', syncScroll: true, focusMode: false } });
        const markdown = '# 让写作与发布，留在同一个现场\n\n' + Array.from({ length: 12 }, (_, i) =>
            `## ${i + 1}. 检查文章的阅读效果\n\n` + ('在 Obsidian 写好一篇文章，调整主题、字体与配色，然后检查阅读效果。让每一次修改都能直接看见，把时间留给内容。\n\n').repeat(4) +
            (i === 0 ? '> 好的工具，让重复工作更少。\n\n| 项目 | 结果 |\n| --- | --- |\n| 阅读预览 | 居中纸面 |\n| 发布内容 | 外层零边距 |\n\n~~~js\nconst article = { title: "Preview", ready: true };\nconsole.log(article);\n~~~\n\n' : '')).join('\n');
        let file = app.vault.getAbstractFileByPath('paper-preview.md');
        if (file) await app.vault.modify(file, markdown); else file = await app.vault.create('paper-preview.md', markdown);
        const leaf = app.workspace.getLeavesOfType('markdown')[0] ?? app.workspace.getLeaf(false);
        await leaf.openFile(file); await plugin.activateView();
        const view = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0].view;
        await until(() => view.previewEl && view.previewService.getState().file?.path === file.path && !view.previewService.getState().isLoading);
        const content = view.previewEl;
        const stage = view.stageEl;
        // A previous run may have left the narrow-window controls expanded.
        if (!view.styleEditorContainer.hidden) view.contentEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const paragraphSize = getComputedStyle(content.querySelector('p')).fontSize;
        const hostRule = document.createElement('style');
        hostRule.textContent = '.workspace p { font-size:53px!important; color:magenta!important; }';
        document.head.appendChild(hostRule);
        check(getComputedStyle(content.querySelector('p')).fontSize === paragraphSize, 'Host theme changed article typography');
        hostRule.remove();
        check(content.getRootNode() instanceof ShadowRoot, 'Preview is not isolated');
        check(!document.querySelector('.wdwxedit-preview .wx-article'), 'Article leaked into the host document');
        check(view.styleEditorContainer.hidden, 'Style controls should start collapsed');
        check(Math.abs(view.paperEl.getBoundingClientRect().width - 390) < 1, 'Phone paper width incorrect');
        view.contentEl.querySelector('[aria-label="切换预览宽度"]').click();
        await until(() => [...document.querySelectorAll('.menu-item-title')].some(el => el.textContent === '桌面 · 768px'));
        [...document.querySelectorAll('.menu-item-title')].find(el => el.textContent === '桌面 · 768px').closest('.menu-item').click();
        await until(() => store.getAll().preview.width === 'desktop');
        await store.update({ preview: { width: 'mobile', syncScroll: true, focusMode: false } });
        view.contentEl.querySelector('[aria-label="调整文章排版"]').click();
        check(!view.styleEditorContainer.hidden, 'Typography toggle not wired');
        view.contentEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        check(view.styleEditorContainer.hidden, 'Escape did not close controls');
        view.contentEl.querySelector('[aria-label="搜索文章主题"]').click();
        await until(() => document.querySelector('.prompt-input'));
        const search = document.querySelector('.prompt-input');
        search.value = '翠绿'; search.dispatchEvent(new Event('input', { bubbles: true }));
        await until(() => [...document.querySelectorAll('.suggestion-item')].some(el => el.textContent.includes('翠绿')));
        [...document.querySelectorAll('.suggestion-item')].find(el => el.textContent.includes('翠绿')).click();
        await until(() => store.getStyleConfig().theme === 'green' && view.themeButton.textContent.includes('翠绿') && !view.previewService.getState().isLoading && getComputedStyle(content.querySelector('h2')).color === 'rgb(16, 185, 129)');
        check(view.themeButton.textContent.includes('翠绿'), 'Toolbar theme label stale');
        check(getComputedStyle(content.querySelector('h2')).color === 'rgb(16, 185, 129)', 'Theme not rendered');
        const source = leaf.view;
        const scroller = source.containerEl.querySelector('.cm-scroller') ?? source.containerEl.querySelector('.markdown-preview-view');
        check(scroller, 'Markdown scroller missing');
        scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * .4;
        scroller.dispatchEvent(new Event('scroll', { bubbles: true })); await frames(); await frames();
        let a = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight);
        let b = stage.scrollTop / (stage.scrollHeight - stage.clientHeight);
        check(Math.abs(a - b) < .06, `Source-to-preview scroll mismatch ${a} / ${b}`);
        stage.scrollTop = (stage.scrollHeight - stage.clientHeight) * .7;
        stage.dispatchEvent(new Event('scroll')); await frames(); await frames();
        a = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight);
        b = stage.scrollTop / (stage.scrollHeight - stage.clientHeight);
        check(Math.abs(a - b) < .06, `Preview-to-source scroll mismatch ${a} / ${b}`);
        await store.update({ preview: { width: 'mobile', syncScroll: false, focusMode: false } });
        await frames(); const unchanged = scroller.scrollTop;
        stage.scrollTop = 0; stage.dispatchEvent(new Event('scroll')); await frames();
        check(Math.abs(scroller.scrollTop - unchanged) < 2, 'Disabled sync moved the editor');
        source.editor.setValue(markdown + '\n这是编辑中的实时预览验证。\n');
        app.workspace.trigger('editor-change', source.editor, source);
        await until(() => content.textContent.includes('编辑中的实时预览验证') && !view.previewService.getState().isLoading);
        check(view.statusEl.textContent.includes('分钟'), 'Reading statistics missing');
        const html = await view.previewService.wrapWechatBackgroundForClipboard(view.previewService.getStyledHTML());
        const root = new DOMParser().parseFromString(html, 'text/html').querySelector('.wx-article');
        check(root.style.padding === '0px' && root.style.margin === '0px', 'Preview spacing leaked into export');
        const exportPath = await view.previewService.exportHTML();
        const saved = await app.vault.read(app.vault.getAbstractFileByPath(exportPath));
        check(saved.startsWith('<!doctype html>') && saved.includes('编辑中的实时预览验证'), 'Standalone HTML export failed');
        if (!app.vault.getAbstractFileByPath('preview-proof.png')) {
            const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), char => char.charCodeAt(0));
            await app.vault.createBinary('preview-proof.png', bytes.buffer);
        }
        const imageArticle = view.previewService.getState().article;
        const imageOriginal = imageArticle.styledHtmlContent;
        imageArticle.styledHtmlContent = '<section class="wx-article"><img src="preview-proof.png" data-vault-path="preview-proof.png"></section>';
        try {
            const imagePath = await view.previewService.exportHTML();
            const imageHtml = await app.vault.read(app.vault.getAbstractFileByPath(imagePath));
            check(imageHtml.includes('data:image/png;base64,') && !imageHtml.includes('data-vault-path'), 'Local image not embedded in HTML');
        } finally { imageArticle.styledHtmlContent = imageOriginal; }
        if (!app.vault.getAbstractFileByPath('preview-proof.svg')) await app.vault.create('preview-proof.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="green"/></svg>');
        imageArticle.styledHtmlContent = '<section class="wx-article"><img src="preview-proof.svg"></section>';
        try {
            const svgPath = await view.previewService.exportHTML();
            const svgHtml = await app.vault.read(app.vault.getAbstractFileByPath(svgPath));
            check(svgHtml.includes('data:image/svg+xml;base64,'), 'SVG image MIME type incorrect');
        } finally { imageArticle.styledHtmlContent = imageOriginal; }
        check(await view.previewService.exportHTML() !== exportPath, 'Export overwrote an earlier file');
        const article = view.previewService.getState().article;
        const original = article.styledHtmlContent;
        article.styledHtmlContent = '<section class="wx-article"><img src="missing-image.png"></section>';
        let failed = false;
        try { await view.previewService.exportHTML(); } catch (error) { failed = String(error).includes('找不到导出图片'); }
        finally { article.styledHtmlContent = original; }
        check(failed, 'Missing image silently exported');
        await store.update({ preview: { width: 'mobile', syncScroll: false, focusMode: true } });
        check(getComputedStyle(view.toolbarEl.parentElement).display === 'none', 'Focus mode not applied');
        view.contentEl.querySelector('.wdwxedit-reveal-toolbar').click();
        await until(() => !store.getAll().preview.focusMode);
        const beforeExport = app.vault.getFiles().filter(item => item.path.startsWith('AIWXEdit Exports/')).length;
        view.contentEl.querySelector('[aria-label="更多预览操作"]').click();
        await until(() => [...document.querySelectorAll('.menu-item-title')].some(el => el.textContent === '导出 HTML 文件'));
        [...document.querySelectorAll('.menu-item-title')].find(el => el.textContent === '导出 HTML 文件').closest('.menu-item').click();
        await until(() => app.vault.getFiles().filter(item => item.path.startsWith('AIWXEdit Exports/')).length > beforeExport && !view.exportBusy);
        view.contentEl.querySelector('[aria-label="发布到公众号"]').click();
        await until(() => document.querySelector('.wdwxedit-publish-modal'));
        const dialog = document.querySelector('.wdwxedit-publish-modal');
        check(dialog.textContent.includes('请先在设置中配置公众号账号'), 'Publish toolbar did not open the draft dialog');
        dialog.closest('.modal-container').querySelector('.modal-close-button, .modal-header-button').click();
        await until(() => !dialog.isConnected);
        stage.scrollTop = 0; scroller.scrollTop = 0;
        app.workspace.leftSplit.collapse(); app.workspace.rightSplit.setSize(760);
        return { checks: ['shadow isolation', 'host theme isolation', '390px paper', 'width menu interaction', 'typography toggle and Escape', 'searchable theme picker', 'two-way scrolling', 'sync toggle', 'live editor preview', 'reading statistics', 'zero-margin export', 'standalone HTML file', 'embedded local image', 'unique export names', 'missing-image error', 'focus mode exit', 'export toolbar action', 'publish toolbar action'], exportPath };
    });
    await capture('paper-desktop-dark');
    await evaluate(async () => {
        document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await capture('paper-desktop-light');
    const widths = await evaluate(async () => {
        const view = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0].view;
        const store = app.plugins.getPlugin('aiwxedit').getSettingsStore();
        app.workspace.rightSplit.setSize(1000);
        const result = [];
        for (const width of ['mobile', 'desktop', 'fluid']) {
            await store.update({ preview: { width, syncScroll: false, focusMode: false } });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            result.push({ mode: width, paper: view.paperEl.getBoundingClientRect().width, stage: view.stageEl.clientWidth });
        }
        return result;
    });
    assert.ok(Math.abs(widths.find(item => item.mode === 'mobile').paper - 390) < 1, JSON.stringify(widths));
    assert.ok(Math.abs(widths.find(item => item.mode === 'desktop').paper - 768) < 1, JSON.stringify(widths));
    assert.ok(widths.find(item => item.mode === 'fluid').paper > 768, JSON.stringify(widths));
    await request('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    const narrow = await evaluate(async () => {
        const view = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0].view;
        const parent = view.contentEl.parentElement;
        const host = document.createElement('div');
        host.className = 'workspace-leaf-content';
        host.style.cssText = 'position:fixed;inset:0;z-index:9999;width:390px;height:844px';
        document.body.appendChild(host); host.appendChild(view.contentEl);
        window.__aiwxeditNarrowQA = { view, parent, host };
        await app.plugins.getPlugin('aiwxedit').getSettingsStore().update({ preview: { width: 'mobile', syncScroll: false, focusMode: false } });
        view.stageEl.scrollTop = 0;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { width: view.contentEl.clientWidth, overflow: view.contentEl.scrollWidth - view.contentEl.clientWidth, paper: view.paperEl.getBoundingClientRect().width, toolbarOverflow: view.toolbarEl.scrollWidth - view.toolbarEl.clientWidth };
    });
    assert.equal(narrow.overflow, 0, JSON.stringify(narrow));
    assert.equal(narrow.toolbarOverflow, 0, JSON.stringify(narrow));
    assert.ok(narrow.paper <= 370, JSON.stringify(narrow));
    await capture('paper-mobile');
    const narrowControls = await evaluate(async () => {
        const { view } = window.__aiwxeditNarrowQA;
        view.contentEl.querySelector('[aria-label="调整文章排版"]').click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { overflow: view.contentEl.scrollWidth - view.contentEl.clientWidth, expanded: !view.styleEditorContainer.hidden };
    });
    assert.ok(narrowControls.expanded && narrowControls.overflow === 0, JSON.stringify(narrowControls));
    await capture('paper-mobile-typography');
    await evaluate(async () => {
        const { view, parent, host } = window.__aiwxeditNarrowQA;
        view.contentEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        parent.appendChild(view.contentEl); host.remove(); delete window.__aiwxeditNarrowQA;
    });
    assert.equal(errors.length, 0, errors.join('\n'));
    const report = { ...result, widths, narrow, narrowControls, errors };
    console.log(JSON.stringify(report, null, 2));
    if (output) writeFileSync(join(output, 'paper-preview-results.json'), JSON.stringify(report, null, 2));
} finally { socket.close(); }
