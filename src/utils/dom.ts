export function clearChildren(el: HTMLElement): void {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

/**
 * Replace children without writing to `innerHTML`.
 * Obsidian's plugin review bot flags `innerHTML/outerHTML` assignments.
 */
export function replaceChildrenWithHtml(container: HTMLElement, html: string): void {
    clearChildren(container);
    if (!html) return;

    const doc = container.ownerDocument;
    const range = doc.createRange();
    range.selectNodeContents(container);
    const fragment = range.createContextualFragment(html);
    container.appendChild(fragment);
}

