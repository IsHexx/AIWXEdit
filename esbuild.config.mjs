import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
AIWXEdit - WeChat Publishing for Obsidian

This bundle includes code derived from:
- note-to-mp: https://github.com/sunbooshi/note-to-mp

Copyright (c) 2024 sunbooshi
Copyright (c) 2025 IsHexx

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
    banner: {
        js: banner,
    },
    entryPoints: ["src/plugin.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins
    ],
    format: "cjs",
    target: "es2020",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
});

if (prod) {
    await context.rebuild();
    await context.dispose();
    process.exit(0);
} else {
    await context.watch();
}
