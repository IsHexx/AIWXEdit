import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Marked } from 'marked';

const { outputFiles } = await build({
    stdin: {
        contents: `export { LinkPlugin } from './src/infrastructure/markdown/plugins/LinkPlugin';
            export { SettingsStore } from './src/infrastructure/storage/SettingsStore';
            export { DEFAULT_SETTINGS } from './src/types/settings.types';`,
        resolveDir: process.cwd(),
        loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
});
const { LinkPlugin, SettingsStore, DEFAULT_SETTINGS } = await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);
const plugin = new LinkPlugin();
const marked = new Marked({ gfm: true });
marked.use(plugin.getExtension());
const parse = markdown => {
    plugin.reset();
    return marked.parse(markdown);
};

assert.equal(DEFAULT_SETTINGS.linkStyle, 'original');
assert.match(parse('[原文链接](https://example.com/docs)'), /<a href="https:\/\/example.com\/docs">原文链接<\/a>/);
assert.match(parse('[**加粗名称**](https://example.com)'), /<a[^>]*><strong>加粗名称<\/strong><\/a>/);
assert.match(parse('<https://example.com>'), /<a[^>]*>https:\/\/example.com<\/a>/);
assert.match(parse('https://example.com/plain'), /<a[^>]*>https:\/\/example.com\/plain<\/a>/);
assert.match(parse('[名称](https://example.com/?a=1&b=2 "A & B")'), /href="https:\/\/example.com\/\?a=1&amp;b=2" title="A &amp; B"/);
assert.match(parse('[跳到标题](#heading)'), /href="#heading">跳到标题<\/a>/);

const html = parse(readFileSync('fixtures/original-links.md', 'utf8'));
for (const label of ['Real API Pricing：模型 API 价格对比', '阿里云百炼模型定价', '火山引擎']) {
    assert.ok(html.includes(`>${label}</a>`), `Missing original link label: ${label}`);
}
assert.equal((html.match(/<li>/g) || []).length, 4);
assert.doesNotMatch(html, /<sup|class="footnotes"|>参考链接<|\[1\]/);
assert.equal(plugin.renderFootnotesSection(), '');
assert.deepEqual(plugin.getFootnotes(), []);
assert.match(html, /<code>\[代码里的名称\]：https:\/\/example.com\/code<\/code>/);
assert.match(parse('~~~text\n[名称]：https://example.com\n~~~'), /<code[^>]*>\[名称\]：https:\/\/example.com/);
assert.match(parse('[名称]: https://example.com\n\n[名称]'), /<a[^>]*>名称<\/a>/);

// Saved footnote settings migrate once, without changing accounts or article styles.
const store = SettingsStore.getInstance();
const original = structuredClone(DEFAULT_SETTINGS);
original.linkStyle = 'footnote';
original.accounts = [{ name: 'Test account', appId: 'test-app', appSecret: 'test-secret' }];
original.style.theme = 'maple';
let saved;
let saves = 0;
store.initialize({
    loadData: async () => saved ?? original,
    saveData: async data => { saved = structuredClone(data); saves++; },
});
await store.load();
assert.equal(store.getAll().linkStyle, 'original');
assert.equal(saved.linkStyle, 'original');
assert.deepEqual(saved.accounts, original.accounts);
assert.deepEqual(saved.style, original.style);
await store.load();
assert.equal(saves, 1);
console.log('Link rendering and saved-setting migration checks passed.');
