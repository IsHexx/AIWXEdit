import assert from 'node:assert/strict';
import { build } from 'esbuild';
const requests = [];
globalThis.__publishTest = { requests, response: { media_id: 'created-draft' } };
const account = { name: 'Test', appId: 'test', appSecret: 'not-a-real-secret', author: '账号作者', publishDefaults: { needOpenComment: true, onlyFansCanComment: true } };
const metadata = { title: '笔记标题', author: '笔记作者', digest: '笔记摘要', contentSourceUrl: 'https://example.com/note' };
globalThis.__publishTest.settings = { accounts: [account], defaultAccountIndex: 0 };
globalThis.__publishTest.article = { metadata, styledHtmlContent: '<p>正文</p>', sourceFile: null };
const { outputFiles } = await build({
    stdin: { contents: `export * from './src/application/publishOptions'; export { PublishService } from './src/application/PublishService'; export { DraftPublisher } from './src/infrastructure/wechat/DraftPublisher';`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'isolated-publish-dependencies', setup(b) {
        b.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
        b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export class App {} export class TFile {} export const sanitizeHTMLToDom = () => {}; export async function requestUrl(request) { globalThis.__publishTest.requests.push(request); return { json: globalThis.__publishTest.response }; }` }));
        b.onResolve({ filter: /^\.\.\/domain\/article$/ }, () => ({ path: 'article', namespace: 'fixture' }));
        b.onResolve({ filter: /^\.\.\/infrastructure\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
        b.onResolve({ filter: /^\.\.\/infrastructure\/wechat$/ }, () => ({ path: 'wechat', namespace: 'fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: path === 'article'
            ? `export const getArticleTransformer = () => ({ transformFile: async () => globalThis.__publishTest.article });`
            : path === 'storage' ? `export const getSettingsStore = () => ({ getAll: () => globalThis.__publishTest.settings });`
            : `export class WechatClient {} export const getWechatClient = () => globalThis.__publishTest.client;` }));
    } }],
});
const { getPublishDefaults, readPublishMetadata, validatePublishFields, PublishService, DraftPublisher } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
assert.deepEqual(readPublishMetadata({ summary: '摘要', content_source_url: ' https://example.com ', need_open_comment: false, only_fans_can_comment: 1 }), { digest: '摘要', contentSourceUrl: 'https://example.com', needOpenComment: false, onlyFansCanComment: true });
assert.deepEqual(readPublishMetadata({}), {});
assert.equal(getPublishDefaults({ title: 'x', author: '', needOpenComment: false }, account).author, '');
assert.equal(getPublishDefaults({ title: 'x', needOpenComment: false }, account).onlyFansCanComment, false);
assert.equal(getPublishDefaults({ title: 'x' }, account).author, '账号作者');
assert.equal(validatePublishFields({ title: '标题', contentSourceUrl: 'https://example.com' }), undefined);
for (const fields of [{ title: '' }, { title: '字'.repeat(33) }, { title: 'x', author: '字'.repeat(17) }, { title: 'x', digest: '字'.repeat(121) }, { title: 'x', contentSourceUrl: 'javascript:alert(1)' }, { title: 'x', contentSourceUrl: 'https://example.com/' + 'a'.repeat(1024) }, { title: 'x', existingDraftIndex: -1 }]) assert.ok(validatePublishFields(fields));
assert.equal(validatePublishFields({ title: '😀'.repeat(32) }), undefined);
const publisher = new DraftPublisher('fixture-token');
globalThis.__publishTest.client = { createDraft: article => publisher.createDraft(article), updateDraft: (id, article, index) => publisher.updateDraft(id, article, index), findDraftByTitle: () => { throw Error('Must not implicitly overwrite a same-title draft'); } };
const service = PublishService.getInstance();
let result = await service.publish({}, { thumbMediaId: 'permanent-cover', title: '新标题', author: '', digest: '', contentSourceUrl: '', needOpenComment: false, onlyFansCanComment: true });
assert.equal(result.success, true);
let body = JSON.parse(requests.at(-1).body);
assert.deepEqual(body.articles[0], { title: '新标题', author: '', digest: '', content: '<p>正文</p>', content_source_url: '', thumb_media_id: 'permanent-cover', need_open_comment: 0, only_fans_can_comment: 0 });
result = await service.publish({}, { thumbMediaId: 'cover', existingDraftId: 'chosen', existingDraftIndex: 2, contentSourceUrl: 'https://example.com/read' });
assert.equal(result.success, true);
body = JSON.parse(requests.at(-1).body);
assert.equal(body.media_id, 'chosen'); assert.equal(body.index, 2);
assert.equal(body.articles.author, '笔记作者');
assert.equal(body.articles.digest, '笔记摘要');
assert.equal(body.articles.content_source_url, 'https://example.com/read');
assert.equal(body.articles.need_open_comment, 1); assert.equal(body.articles.only_fans_can_comment, 1);
const count = requests.length;
result = await service.publish({}, { title: '', thumbMediaId: 'cover' });
assert.equal(result.success, false); assert.equal(requests.length, count);
globalThis.__publishTest.response = { errcode: 40007, errmsg: 'invalid media_id' };
result = await service.publish({}, { thumbMediaId: 'cover' });
assert.equal(result.success, false); assert.match(result.error, /40007/);
console.log('Publish metadata, validation, create/update payloads and error checks passed. No live API calls made.');
