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

function toHexByte(n: number): string {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
}

function normalizeColorToHex(color: string): string {
    const value = color.trim();
    if (!value) return '#000000';

    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const raw = hex[1];
        if (raw.length === 3) {
            return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
        }
        return `#${raw}`.toLowerCase();
    }

    const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
        const r = Number(rgb[1]);
        const g = Number(rgb[2]);
        const b = Number(rgb[3]);
        return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
    }

    // Fallback: return as-is (WeChat may accept named colors in <font color>).
    return value;
}

/**
 * Post-process already-inlined HTML to improve compatibility with the WeChat editor.
 *
 * Some WeChat paste flows strip `style="color: ..."` on inline elements (e.g. `<span>`),
 * causing highlighted code to collapse into the parent `pre` color. Wrapping tokens in
 * `<font color="...">` is more resilient.
 */
export function postProcessInlinedWechatHtml(html: string): string {
    if (typeof document === 'undefined') return html;

    const doc = document.implementation.createHTMLDocument('wdwxedit-post-inline');
    const container = doc.createElement('div');
    container.innerHTML = html;
    doc.body.appendChild(container);

    const codeScopes = container.querySelectorAll('.code-section');
    codeScopes.forEach(scope => {
        // Only wrap inline token spans inside code blocks. Wrapping block elements (e.g. <pre>/<li>)
        // breaks the flex layout and can cause overflow outside the border when pasted into WeChat.
        const colored = scope.querySelectorAll<HTMLElement>('pre span[style*="color"]');
        colored.forEach(el => {
            // Avoid wrapping if already inside a font tag with a color.
            if (el.tagName.toLowerCase() !== 'span') return;
            const parent = el.parentElement;
            if (parent && parent.tagName.toLowerCase() === 'font' && parent.getAttribute('color')) {
                return;
            }

            const style = el.getAttribute('style') || '';
            const match = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)\s*(?:;|$)/i);
            if (!match) return;

            const color = normalizeColorToHex(match[1]);

            const font = doc.createElement('font');
            font.setAttribute('color', color);
            el.parentNode?.insertBefore(font, el);
            font.appendChild(el);
        });
    });

    return container.innerHTML;
}
