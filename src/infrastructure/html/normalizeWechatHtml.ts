/**
 * Normalize HTML for more consistent WeChat editor rendering.
 * Keep this minimal: remove empty list items and invisible characters.
 */
export function normalizeWechatHtml(html: string): string {
    if (typeof document === 'undefined') return html;

    const doc = document.implementation.createHTMLDocument('wdwxedit-normalize');
    const container = doc.createElement('div');
    container.innerHTML = html;
    doc.body.appendChild(container);

    // Remove empty list items (often produced by markdown edge-cases).
    const listItems = container.querySelectorAll('li');
    listItems.forEach(li => {
        const el = li as HTMLElement;
        const text = (el.textContent || '').replace(/\u200B/g, '').trim();
        const hasMedia = !!el.querySelector('img,svg,video,code,pre,a');
        const onlyBreak = !!el.querySelector('br') && text.length === 0;
        if ((!text && !hasMedia) || onlyBreak) {
            el.remove();
        }
    });

    return container.innerHTML;
}

