/**
 * Theme Catalog Data
 * 
 * Static definition of available themes in the remote marketplace.
 * In a future version, this could be fetched from a JSON endpoint.
 */

import { ThemeCatalogItem, HighlightCatalogItem } from '../themes/themeCatalog';

const REPO_BASE = 'https://cdn.jsdelivr.net/gh/IsHexx/wdwx-themes@main';
const HIGHLIGHT_REPO_BASE = `${REPO_BASE}/highlights`;

// ... (Theme Catalog omitted for brevity in instruction, assuming I target specific block or entire file. 
// Actually I should just target the HIGHLIGHT_MARKET_CATALOG block.
// But I need to add HIGHLIGHT_REPO_BASE constant near top.)

// I will do it in two chunks or one if I can context match.
// Let's try to do it in one if I can.
// But the imports are at top.

// Let's do imports and CONST first.


/**
 * Full catalog of available themes
 */
export const THEME_MARKET_CATALOG: ThemeCatalogItem[] = [
    // --- Markdown Nice Themes ---
    {
        id: 'mdnice-orange-heart',
        name: 'MDNice 橙心',
        cssUrl: `${REPO_BASE}/mdnice-orange-heart.css`,
        author: 'Markdown Nice',
        desc: '清新活力的橙色风格，适合生活、活力类文章',
        tags: ['orange', 'vibrant', 'mdnice']
    },
    {
        id: 'mdnice-pie',
        name: 'MDNice 派',
        cssUrl: `${REPO_BASE}/mdnice-pie.css`,
        author: 'Markdown Nice',
        desc: '黑白极简风格，类似《派》杂志的设计感',
        tags: ['black-white', 'minimal', 'mdnice']
    },
    {
        id: 'mdnice-green-leaf',
        name: 'MDNice 嫩绿',
        cssUrl: `${REPO_BASE}/mdnice-green-leaf.css`,
        author: 'Markdown Nice',
        desc: '舒适的绿色护眼风格，适合自然、健康类',
        tags: ['green', 'nature', 'mdnice']
    },
    {
        id: 'mdnice-ink',
        name: 'MDNice 水墨',
        cssUrl: `${REPO_BASE}/mdnice-ink.css`,
        author: 'Markdown Nice',
        desc: '中国风水墨黑白设计，适合文学、传统文化',
        tags: ['chinese', 'ink', 'mdnice']
    },
    {
        id: 'mdnice-blue-mountain',
        name: 'MDNice 兰山',
        cssUrl: `${REPO_BASE}/mdnice-blue-mountain.css`,
        author: 'Markdown Nice',
        desc: '稳重的蓝色商务风格，适合科技、学术类',
        tags: ['blue', 'business', 'mdnice']
    },
    {
        id: 'mdnice-singularity',
        name: 'MDNice 奇点',
        cssUrl: `${REPO_BASE}/mdnice-singularity.css`,
        author: 'Markdown Nice',
        desc: '科幻极简风，标题带有圆点和连接线元素',
        tags: ['minimal', 'sci-fi', 'mdnice']
    },
    {
        id: 'mdnice-shadow',
        name: 'MDNice 重影',
        cssUrl: `${REPO_BASE}/mdnice-shadow.css`,
        author: 'Markdown Nice',
        desc: '标题带有错位阴影特效，现代感强',
        tags: ['effect', 'modern', 'mdnice']
    },
    {
        id: 'mdnice-cupid',
        name: 'MDNice 丘比特忙',
        cssUrl: `${REPO_BASE}/mdnice-cupid.css`,
        author: 'Markdown Nice',
        desc: '粉色浪漫风格，带有爱心装饰元素',
        tags: ['pink', 'romantic', 'mdnice']
    },

    // --- MWeb Legacy Themes ---
    {
        id: 'maple',
        name: 'Maple',
        cssUrl: `${REPO_BASE}/maple.css`,
        author: 'Sun Booshi',
        desc: '枫叶红配色，温暖舒适',
        tags: ['red', 'warm']
    },
    {
        id: 'mweb-default',
        name: 'MWeb Default',
        cssUrl: `${REPO_BASE}/mweb-default.css`,
        author: 'imageslr',
        desc: 'MWeb 默认经典风格',
        tags: ['classic', 'mweb']
    },
    {
        id: 'mweb-ayu',
        name: 'MWeb Ayu',
        cssUrl: `${REPO_BASE}/mweb-ayu.css`,
        author: 'imageslr',
        desc: 'Ayu 配色方案',
        tags: ['dark', 'ayu']
    },
    {
        id: 'mweb-ayu-mirage',
        name: 'MWeb Ayu Mirage',
        cssUrl: `${REPO_BASE}/mweb-ayu-mirage.css`,
        author: 'imageslr',
        desc: 'Ayu Mirage 配色',
        tags: ['dark', 'ayu']
    },
    {
        id: 'mweb-bear-default',
        name: 'MWeb Bear Default',
        cssUrl: `${REPO_BASE}/mweb-bear-default.css`,
        author: 'imageslr',
        desc: '仿 Bear 笔记默认风格',
        tags: ['bear', 'clean']
    },
    {
        id: 'mweb-charcoal',
        name: 'MWeb Charcoal',
        cssUrl: `${REPO_BASE}/mweb-charcoal.css`,
        author: 'imageslr',
        desc: 'Charcoal 深色炭黑风格',
        tags: ['dark', 'charcoal']
    },
    {
        id: 'mweb-cobalt',
        name: 'MWeb Cobalt',
        cssUrl: `${REPO_BASE}/mweb-cobalt.css`,
        author: 'imageslr',
        desc: 'Cobalt 蓝调风格',
        tags: ['blue', 'dark']
    },
    {
        id: 'mweb-contrast',
        name: 'MWeb Contrast',
        cssUrl: `${REPO_BASE}/mweb-contrast.css`,
        author: 'imageslr',
        desc: '高对比度风格',
        tags: ['contrast', 'accessibility']
    },
    {
        id: 'mweb-d-boring',
        name: 'MWeb D-Boring',
        cssUrl: `${REPO_BASE}/mweb-d-boring.css`,
        author: 'imageslr',
        desc: '简洁耐看风格',
        tags: ['simple', 'clean']
    },
    {
        id: 'mweb-dark-graphite',
        name: 'MWeb Dark Graphite',
        cssUrl: `${REPO_BASE}/mweb-dark-graphite.css`,
        author: 'imageslr',
        desc: '深色石墨风格',
        tags: ['dark', 'graphite']
    },
    {
        id: 'mweb-dieci',
        name: 'MWeb Dieci',
        cssUrl: `${REPO_BASE}/mweb-dieci.css`,
        author: 'imageslr',
        desc: 'Dieci 配色风格',
        tags: ['dark']
    },
    {
        id: 'mweb-dracula',
        name: 'MWeb Dracula',
        cssUrl: `${REPO_BASE}/mweb-dracula.css`,
        author: 'imageslr',
        desc: 'Dracula 吸血鬼主题',
        tags: ['dark', 'dracula']
    },
    {
        id: 'mweb-duotone-heat',
        name: 'MWeb Duotone Heat',
        cssUrl: `${REPO_BASE}/mweb-duotone-heat.css`,
        author: 'imageslr',
        desc: 'Duotone 暖色调',
        tags: ['warm', 'duotone']
    },
    {
        id: 'mweb-duotone-light',
        name: 'MWeb Duotone Light',
        cssUrl: `${REPO_BASE}/mweb-duotone-light.css`,
        author: 'imageslr',
        desc: 'Duotone 亮色调',
        tags: ['light', 'duotone']
    },
    {
        id: 'mweb-gandalf',
        name: 'MWeb Gandalf',
        cssUrl: `${REPO_BASE}/mweb-gandalf.css`,
        author: 'imageslr',
        desc: '甘道夫灰白风格',
        tags: ['light', 'grey']
    },
    {
        id: 'mweb-gotham',
        name: 'MWeb Gotham',
        cssUrl: `${REPO_BASE}/mweb-gotham.css`,
        author: 'imageslr',
        desc: 'Gotham 黑色系风格',
        tags: ['dark', 'gotham']
    },
    {
        id: 'mweb-indigo',
        name: 'MWeb Indigo',
        cssUrl: `${REPO_BASE}/mweb-indigo.css`,
        author: 'imageslr',
        desc: '靛蓝风格',
        tags: ['blue', 'indigo']
    },
    {
        id: 'mweb-jzman',
        name: 'MWeb Jzman',
        cssUrl: `${REPO_BASE}/mweb-jzman.css`,
        author: 'imageslr',
        desc: 'Jzman 风格',
        tags: ['simple']
    },
    {
        id: 'mweb-lark',
        name: 'MWeb Lark',
        cssUrl: `${REPO_BASE}/mweb-lark.css`,
        author: 'imageslr',
        desc: '仿飞书文档风格',
        tags: ['clean', 'lark']
    },
    {
        id: 'mweb-lark-bold-color',
        name: 'MWeb Lark Bold',
        cssUrl: `${REPO_BASE}/mweb-lark-bold-color.css`,
        author: 'imageslr',
        desc: '飞书文档加粗彩色版',
        tags: ['clean', 'lark', 'bold']
    },
    {
        id: 'mweb-lighthouse',
        name: 'MWeb Lighthouse',
        cssUrl: `${REPO_BASE}/mweb-lighthouse.css`,
        author: 'imageslr',
        desc: '灯塔风格',
        tags: ['light']
    },
    {
        id: 'mweb-nord',
        name: 'MWeb Nord',
        cssUrl: `${REPO_BASE}/mweb-nord.css`,
        author: 'imageslr',
        desc: 'Nord 冷淡极简风',
        tags: ['nord', 'cool']
    },
    {
        id: 'mweb-olive-dunk',
        name: 'MWeb Olive Dunk',
        cssUrl: `${REPO_BASE}/mweb-olive-dunk.css`,
        author: 'imageslr',
        desc: '橄榄深绿风格',
        tags: ['green', 'dark']
    },
    {
        id: 'mweb-panic',
        name: 'MWeb Panic',
        cssUrl: `${REPO_BASE}/mweb-panic.css`,
        author: 'imageslr',
        desc: 'Panic 风格',
        tags: ['dark']
    },
    {
        id: 'mweb-red-graphite',
        name: 'MWeb Red Graphite',
        cssUrl: `${REPO_BASE}/mweb-red-graphite.css`,
        author: 'imageslr',
        desc: '红石墨风格',
        tags: ['red', 'dark']
    },
    {
        id: 'mweb-smartblue',
        name: 'MWeb SmartBlue',
        cssUrl: `${REPO_BASE}/mweb-smartblue.css`,
        author: 'imageslr',
        desc: '智蓝风格，清爽干净',
        tags: ['blue', 'clean']
    },
    {
        id: 'mweb-solarized-dark',
        name: 'MWeb Solarized Dark',
        cssUrl: `${REPO_BASE}/mweb-solarized-dark.css`,
        author: 'imageslr',
        desc: 'Solarized 暗色',
        tags: ['dark', 'solarized']
    },
    {
        id: 'mweb-solarized-light',
        name: 'MWeb Solarized Light',
        cssUrl: `${REPO_BASE}/mweb-solarized-light.css`,
        author: 'imageslr',
        desc: 'Solarized 亮色',
        tags: ['light', 'solarized']
    },
    {
        id: 'mweb-toothpaste',
        name: 'MWeb Toothpaste',
        cssUrl: `${REPO_BASE}/mweb-toothpaste.css`,
        author: 'imageslr',
        desc: '牙膏白风格',
        tags: ['white', 'clean']
    },
    {
        id: 'mweb-typo',
        name: 'MWeb Typo',
        cssUrl: `${REPO_BASE}/mweb-typo.css`,
        author: 'imageslr',
        desc: '重排版风格',
        tags: ['typography']
    },
    {
        id: 'mweb-v-green',
        name: 'MWeb V-Green',
        cssUrl: `${REPO_BASE}/mweb-v-green.css`,
        author: 'imageslr',
        desc: 'V-Green 绿色系',
        tags: ['green']
    },
    {
        id: 'mweb-vue',
        name: 'MWeb Vue',
        cssUrl: `${REPO_BASE}/mweb-vue.css`,
        author: 'imageslr',
        desc: 'Vue 文档风格',
        tags: ['vue', 'green']
    }
];

/**
 * Full catalog of available highlights
 */
export const HIGHLIGHT_MARKET_CATALOG: HighlightCatalogItem[] = [
    { id: '1c-light', name: '1c Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/1c-light.css` },
    { id: 'a11y-dark', name: 'A11y Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/a11y-dark.css` },
    { id: 'a11y-light', name: 'A11y Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/a11y-light.css` },
    { id: 'agate', name: 'Agate', cssUrl: `${HIGHLIGHT_REPO_BASE}/agate.css` },
    { id: 'an-old-hope', name: 'An Old Hope', cssUrl: `${HIGHLIGHT_REPO_BASE}/an-old-hope.css` },
    { id: 'androidstudio', name: 'Android Studio', cssUrl: `${HIGHLIGHT_REPO_BASE}/androidstudio.css` },
    { id: 'arduino-light', name: 'Arduino Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/arduino-light.css` },
    { id: 'arta', name: 'Arta', cssUrl: `${HIGHLIGHT_REPO_BASE}/arta.css` },
    { id: 'ascetic', name: 'Ascetic', cssUrl: `${HIGHLIGHT_REPO_BASE}/ascetic.css` },
    { id: 'atom-one-dark', name: 'Atom One Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/atom-one-dark.css` },
    { id: 'atom-one-dark-reasonable', name: 'Atom One Dark Reasonable', cssUrl: `${HIGHLIGHT_REPO_BASE}/atom-one-dark-reasonable.css` },
    { id: 'atom-one-light', name: 'Atom One Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/atom-one-light.css` },
    { id: 'brown-paper', name: 'Brown Paper', cssUrl: `${HIGHLIGHT_REPO_BASE}/brown-paper.css` },
    { id: 'codepen-embed', name: 'Codepen Embed', cssUrl: `${HIGHLIGHT_REPO_BASE}/codepen-embed.css` },
    { id: 'color-brewer', name: 'Color Brewer', cssUrl: `${HIGHLIGHT_REPO_BASE}/color-brewer.css` },
    { id: 'dark', name: 'Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/dark.css` },
    { id: 'default', name: 'Default', cssUrl: `${HIGHLIGHT_REPO_BASE}/default.css` },
    { id: 'devibeans', name: 'Devibeans', cssUrl: `${HIGHLIGHT_REPO_BASE}/devibeans.css` },
    { id: 'docco', name: 'Docco', cssUrl: `${HIGHLIGHT_REPO_BASE}/docco.css` },
    { id: 'far', name: 'Far', cssUrl: `${HIGHLIGHT_REPO_BASE}/far.css` },
    { id: 'felipec', name: 'Felipec', cssUrl: `${HIGHLIGHT_REPO_BASE}/felipec.css` },
    { id: 'foundation', name: 'Foundation', cssUrl: `${HIGHLIGHT_REPO_BASE}/foundation.css` },
    { id: 'github', name: 'GitHub', cssUrl: `${HIGHLIGHT_REPO_BASE}/github.css` },
    { id: 'github-dark', name: 'GitHub Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/github-dark.css` },
    { id: 'github-dark-dimmed', name: 'GitHub Dark Dimmed', cssUrl: `${HIGHLIGHT_REPO_BASE}/github-dark-dimmed.css` },
    { id: 'gml', name: 'GML', cssUrl: `${HIGHLIGHT_REPO_BASE}/gml.css` },
    { id: 'googlecode', name: 'Google Code', cssUrl: `${HIGHLIGHT_REPO_BASE}/googlecode.css` },
    { id: 'gradient-dark', name: 'Gradient Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/gradient-dark.css` },
    { id: 'gradient-light', name: 'Gradient Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/gradient-light.css` },
    { id: 'grayscale', name: 'Grayscale', cssUrl: `${HIGHLIGHT_REPO_BASE}/grayscale.css` },
    { id: 'hybrid', name: 'Hybrid', cssUrl: `${HIGHLIGHT_REPO_BASE}/hybrid.css` },
    { id: 'idea', name: 'IDEA', cssUrl: `${HIGHLIGHT_REPO_BASE}/idea.css` },
    { id: 'intellij-light', name: 'IntelliJ Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/intellij-light.css` },
    { id: 'ir-black', name: 'IR Black', cssUrl: `${HIGHLIGHT_REPO_BASE}/ir-black.css` },
    { id: 'isbl-editor-dark', name: 'ISBL Editor Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/isbl-editor-dark.css` },
    { id: 'isbl-editor-light', name: 'ISBL Editor Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/isbl-editor-light.css` },
    { id: 'kimbie-dark', name: 'Kimbie Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/kimbie-dark.css` },
    { id: 'kimbie-light', name: 'Kimbie Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/kimbie-light.css` },
    { id: 'lightfair', name: 'Lightfair', cssUrl: `${HIGHLIGHT_REPO_BASE}/lightfair.css` },
    { id: 'lioshi', name: 'Lioshi', cssUrl: `${HIGHLIGHT_REPO_BASE}/lioshi.css` },
    { id: 'magula', name: 'Magula', cssUrl: `${HIGHLIGHT_REPO_BASE}/magula.css` },
    { id: 'mono-blue', name: 'Mono Blue', cssUrl: `${HIGHLIGHT_REPO_BASE}/mono-blue.css` },
    { id: 'monokai', name: 'Monokai', cssUrl: `${HIGHLIGHT_REPO_BASE}/monokai.css` },
    { id: 'monokai-sublime', name: 'Monokai Sublime', cssUrl: `${HIGHLIGHT_REPO_BASE}/monokai-sublime.css` },
    { id: 'night-owl', name: 'Night Owl', cssUrl: `${HIGHLIGHT_REPO_BASE}/night-owl.css` },
    { id: 'nnfx-dark', name: 'NNFX Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/nnfx-dark.css` },
    { id: 'nnfx-light', name: 'NNFX Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/nnfx-light.css` },
    { id: 'nord', name: 'Nord', cssUrl: `${HIGHLIGHT_REPO_BASE}/nord.css` },
    { id: 'obsidian', name: 'Obsidian', cssUrl: `${HIGHLIGHT_REPO_BASE}/obsidian.css` },
    { id: 'panda-syntax-dark', name: 'Panda Syntax Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/panda-syntax-dark.css` },
    { id: 'panda-syntax-light', name: 'Panda Syntax Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/panda-syntax-light.css` },
    { id: 'paraiso-dark', name: 'Paraiso Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/paraiso-dark.css` },
    { id: 'paraiso-light', name: 'Paraiso Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/paraiso-light.css` },
    { id: 'pojoaque', name: 'Pojoaque', cssUrl: `${HIGHLIGHT_REPO_BASE}/pojoaque.css` },
    { id: 'purebasic', name: 'PureBASIC', cssUrl: `${HIGHLIGHT_REPO_BASE}/purebasic.css` },
    { id: 'qtcreator-dark', name: 'Qt Creator Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/qtcreator-dark.css` },
    { id: 'qtcreator-light', name: 'Qt Creator Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/qtcreator-light.css` },
    { id: 'rainbow', name: 'Rainbow', cssUrl: `${HIGHLIGHT_REPO_BASE}/rainbow.css` },
    { id: 'routeros', name: 'RouterOS', cssUrl: `${HIGHLIGHT_REPO_BASE}/routeros.css` },
    { id: 'school-book', name: 'School Book', cssUrl: `${HIGHLIGHT_REPO_BASE}/school-book.css` },
    { id: 'shades-of-purple', name: 'Shades of Purple', cssUrl: `${HIGHLIGHT_REPO_BASE}/shades-of-purple.css` },
    { id: 'srcery', name: 'Srcery', cssUrl: `${HIGHLIGHT_REPO_BASE}/srcery.css` },
    { id: 'stackoverflow-dark', name: 'StackOverflow Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/stackoverflow-dark.css` },
    { id: 'stackoverflow-light', name: 'StackOverflow Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/stackoverflow-light.css` },
    { id: 'sunburst', name: 'Sunburst', cssUrl: `${HIGHLIGHT_REPO_BASE}/sunburst.css` },
    { id: 'tokyo-night-dark', name: 'Tokyo Night Dark', cssUrl: `${HIGHLIGHT_REPO_BASE}/tokyo-night-dark.css` },
    { id: 'tokyo-night-light', name: 'Tokyo Night Light', cssUrl: `${HIGHLIGHT_REPO_BASE}/tokyo-night-light.css` },
    { id: 'tomorrow-night-blue', name: 'Tomorrow Night Blue', cssUrl: `${HIGHLIGHT_REPO_BASE}/tomorrow-night-blue.css` },
    { id: 'tomorrow-night-bright', name: 'Tomorrow Night Bright', cssUrl: `${HIGHLIGHT_REPO_BASE}/tomorrow-night-bright.css` },
    { id: 'vs', name: 'VS', cssUrl: `${HIGHLIGHT_REPO_BASE}/vs.css` },
    { id: 'vs2015', name: 'VS 2015', cssUrl: `${HIGHLIGHT_REPO_BASE}/vs2015.css` },
    { id: 'xcode', name: 'Xcode', cssUrl: `${HIGHLIGHT_REPO_BASE}/xcode.css` },
    { id: 'xt256', name: 'XT256', cssUrl: `${HIGHLIGHT_REPO_BASE}/xt256.css` },
];
