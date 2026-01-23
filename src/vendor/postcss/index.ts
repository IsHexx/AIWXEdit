// Vendored PostCSS parser (from note-to-mp). We only rely on `parse()` and rule walking APIs.
// Keep this wrapper tiny so the rest of the codebase doesn't depend on PostCSS internals/types.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vendored JS module without TS types.
import * as postcss from './postcss.js';

export type PostcssRoot = any;

export function parse(css: string): PostcssRoot {
    return (postcss as any).parse(css);
}

