import { sanitizeHTMLToDom } from 'obsidian';

export function clearChildren(el: HTMLElement): void {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

/**
 * Sanitize Markdown and AI-generated HTML before inserting it into the DOM.
 */
export function replaceChildrenWithHtml(container: HTMLElement, html: string): void {
    clearChildren(container);
    if (!html) return;

    const fragment = sanitizeHTMLToDom(html);
    // Obsidian permits sandboxed embeds for note rendering. Article previews
    // and AI covers have no need for embedded pages, forms, or style sheets.
    fragment.querySelectorAll('iframe,object,embed,script,style,link,meta,base,form')
        .forEach(element => element.remove());
    container.appendChild(fragment);
}

/**
 * WeChat strips CSS classes when pasting or publishing. Exported article
 * elements therefore need inline styles, including values computed at copy
 * time. UI styles belong in styles.css instead.
 */
export function setExportStyles(element: HTMLElement, styles: Record<string, string>): void {
    for (const [property, value] of Object.entries(styles)) {
        element.style.setProperty(property, value);
    }
}
