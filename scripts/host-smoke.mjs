// Run only against the disposable AIWXEdit-QA vault. The app must be started
// with an isolated user-data directory and --remote-debugging-port=19223.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const port = process.env.AIWXEDIT_QA_PORT || '19223';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith('app://obsidian.md'));
assert.ok(target, 'No isolated Obsidian window found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
    }
    const handler = pending.get(message.id);
    if (handler) {
        pending.delete(message.id);
        clearTimeout(handler.timer);
        if (message.error) handler.reject(new Error(message.error.message));
        else handler.resolve(message.result);
    }
};
const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 30_000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
});
try {
    await request('Runtime.enable');
    errors.length = 0;
    const result = await request('Runtime.evaluate', {
        expression: `(${async function () {
            const check = (condition, message) => { if (!condition) throw new Error(message); };
            const until = async (condition) => {
                const deadline = Date.now() + 10_000;
                while (!condition()) {
                    if (Date.now() > deadline) throw new Error('Timed out waiting for Obsidian state');
                    await new Promise(resolve => window.setTimeout(resolve, 10));
                }
            };
            check(app.vault.getName() === 'AIWXEdit-QA', 'Refusing to modify a non-QA vault');
            const file = app.vault.getAbstractFileByPath('Welcome.md');
            check(file, 'QA fixture missing');
            const plugin = app.plugins.getPlugin('aiwxedit');
            check(plugin, 'Plugin did not load');
            check(plugin.getAssetStore().getThemes().length === 6, 'Built-in themes unavailable without assets');
            await app.workspace.getLeaf(false).openFile(file);
            await plugin.activateView();
            let leaf = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0];
            await until(() => leaf.view.previewEl && !leaf.view.previewService.getState().isLoading);
            let service = leaf.view.previewService;
            await service.setFile(file);
            await until(() => !service.getState().isLoading && service.getState().article);
            const preview = leaf.view.previewEl;
            check(preview.textContent.includes('AIWXEdit 发布验收'), 'Chinese preview missing');
            check(preview.querySelector('.wx-article[style]'), 'Article inline styling removed');
            check(preview.querySelector('table'), 'Markdown table missing');
            check(preview.querySelector('.code-section'), 'Highlighted code block missing');
            const clipboardHtml = await service.wrapWechatBackgroundForClipboard(service.getStyledHTML());
            check(clipboardHtml.includes('code-section') && clipboardHtml.includes('style='), 'Clipboard preparation lost formatted code');
            const baselineListeners = service.listeners.size;
            check(baselineListeners === 1, 'Unexpected preview subscriptions');

            const unsafe = service.renderMarkdown('# 安全测试\n\n<img src="data:image/png;base64,invalid" onerror="window.__aiwxeditUnsafeExecuted=true"><a href="javascript:window.__aiwxeditUnsafeExecuted=true">unsafe</a><script>window.__aiwxeditUnsafeExecuted=true</script><iframe srcdoc="unsafe"></iframe>');
            leaf.view.updatePreview(unsafe.styledHtmlContent);
            check(!preview.querySelector('script,iframe,[onerror],[onclick],[href^="javascript:"]'), 'Unsafe HTML survived sanitization');
            check(!window.__aiwxeditUnsafeExecuted, 'Untrusted HTML executed');

            const transformer = service.transformer;
            const originalTransform = transformer.transformFile;
            const waiting = new Map();
            transformer.transformFile = targetFile => new Promise(resolve => waiting.set(targetFile.path, resolve));
            const secondFile = app.vault.getAbstractFileByPath('code-highlight.md');
            check(secondFile, 'Second fixture missing');
            try {
                const first = service.setFile(file);
                const second = service.setFile(secondFile);
                waiting.get(secondFile.path)({ styledHtmlContent: '<p>newer</p>' });
                await second;
                waiting.get(file.path)({ styledHtmlContent: '<p>older</p>' });
                await first;
                check(service.getState().article.styledHtmlContent.includes('newer'), 'Stale render overwrote the newer note');
            } finally { transformer.transformFile = originalTransform; }
            await service.setFile(file);

            leaf.detach();
            check(service.listeners.size === 0, 'Closing the view leaked a listener');
            await plugin.activateView();
            leaf = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0];
            await until(() => leaf.view.previewEl && !leaf.view.previewService.getState().isLoading);
            check(service.listeners.size === baselineListeners, 'Reopening duplicated subscriptions');
            await plugin.publishCurrentNote();
            await until(() => activeDocument.querySelector('.wdwxedit-modal'));
            const dialog = activeDocument.querySelector('.wdwxedit-modal');
            check(dialog.textContent.includes('请先在设置中配置公众号账号'), 'Missing-account error state not shown');
            dialog.closest('.modal-container')?.querySelector('.modal-close-button, .modal-header-button')?.click();
            await until(() => !dialog.isConnected);

            const oldService = service;
            await app.plugins.disablePlugin('aiwxedit');
            check(oldService.listeners.size === 0 && oldService.getState().file === null, 'Unload did not release preview state');
            await app.plugins.enablePlugin('aiwxedit');
            await until(() => app.plugins.getPlugin('aiwxedit')?.isInitialized);
            const reloaded = app.plugins.getPlugin('aiwxedit');
            await reloaded.activateView();
            const newLeaf = app.workspace.getLeavesOfType('aiwxedit-publish-view')[0];
            await until(() => newLeaf.view.previewEl && !newLeaf.view.previewService.getState().isLoading);
            service = newLeaf.view.previewService;
            await service.setFile(file);
            await until(() => !service.getState().isLoading && service.getState().article);
            check(service.listeners.size === 1, 'Reload duplicated preview subscriptions');
            check(Object.keys(app.commands.commands).filter(id => id.startsWith('aiwxedit:')).length === 2, 'Reload duplicated or lost commands');
            app.workspace.leftSplit.collapse();
            if (typeof app.workspace.rightSplit.setSize === 'function') app.workspace.rightSplit.setSize(500);
            return {
                vault: app.vault.getName(), version: reloaded.manifest.version,
                checks: ['three-file installation', 'six offline themes', 'Chinese preview', 'inline styles', 'Markdown table', 'code highlighting', 'clipboard HTML preparation', 'HTML sanitization', 'out-of-order renders', 'view close/reopen cleanup', 'missing-account state', 'plugin reload'],
                previewListeners: service.listeners.size,
                themes: reloaded.getAssetStore().getThemes().map(theme => theme.id),
            };
        }.toString()})()`,
        awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    assert.equal(errors.length, 0, `Host errors: ${errors.join('\n')}`);
    console.log(JSON.stringify({ ...result.result.value, hostErrors: errors }, null, 2));
    if (process.env.AIWXEDIT_QA_SCREENSHOT) {
        await request('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
        const screenshot = await request('Page.captureScreenshot', { format: 'png' });
        mkdirSync(dirname(process.env.AIWXEDIT_QA_SCREENSHOT), { recursive: true });
        writeFileSync(process.env.AIWXEDIT_QA_SCREENSHOT, Buffer.from(screenshot.data, 'base64'));
    }
} finally { socket.close(); }
