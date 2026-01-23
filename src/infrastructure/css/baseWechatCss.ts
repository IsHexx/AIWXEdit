/**
 * Base CSS for WeChat-compatible HTML output.
 *
 * This CSS is always included before user theme/highlight/custom CSS, then inlined via PostCSS.
 * Keep it conservative and scoped to `.wx-article` to avoid leaking into Obsidian UI.
 */
export const BASE_WECHAT_CSS = `
.wx-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  padding: 20px;
}

.wx-article p {
  margin: 1em 0;
}

.wx-article strong { font-weight: 600; }
.wx-article em { font-style: italic; }
.wx-article del { text-decoration: line-through; color: #57606a; }

.wx-article a { color: #1a73e8; text-decoration: none; }

.wx-article ul,
.wx-article ol {
  margin: 1em 0;
  padding-left: 2em;
}

.wx-article li {
  margin: 0.35em 0;
  line-height: 1.6;
}

.wx-article li p {
  margin: 0;
}

.wx-article blockquote {
  margin: 1em 0;
  padding: 10px 20px;
  border-left: 4px solid #1a73e8;
  background-color: #f8f9fa;
  color: #57606a;
}

.wx-article img {
  max-width: 100%;
  height: auto;
  margin: 1em 0;
  display: block;
}

.wx-article table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.wx-article th,
.wx-article td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.wx-article th {
  background-color: #f6f8fa;
  font-weight: 600;
}

.wx-article hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 2em 0;
}

/* Inline code */
.wx-article code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 2em;

  background-color: #f5f5f5;
  border-radius: 3px;
}

/* Code block (note-to-mp compatible structure) */
.wx-article .code-section {
  display: flex;
  border: 1px solid #e6e6e6;
  line-height: 26px;
  font-size: 14px;
  font-family: Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace;
  box-sizing: border-box;
  max-width: 100%;
  border-radius: 0;
  background: #fff;
  background-color: #fff;
  margin: 0.8em 0;
  padding: 0.875em;
}

.wx-article .code-section ul {
  width: fit-content;
  margin-block-start: 0;
  margin-block-end: 0;
  flex-shrink: 0;
  height: 100%;
  padding: 0;
  line-height: 26px;
  font-family: inherit;
  list-style-type: none;
  background: transparent;
  background-color: transparent;
}

.wx-article .code-section ul > li {
  text-align: right;
  color: #8c959f;
  margin: 0;
  padding: 0px 20px;
  line-height: 26px;
  height: 26px;
  font-family: inherit;
  
}

.wx-article .code-section pre {
  margin-block-start: 0;
  margin-block-end: 0;
  overflow: auto;
  padding: 0 0 0 0.875em;
  white-space: normal;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-width: 0;
  background: transparent;
  background-color: transparent;
  line-height: inherit;
  font-size: inherit;
}

.wx-article .code-section pre code {
  background: transparent;
  background-color: transparent;
  padding: 0;
  line-height: inherit;
  font-size: inherit;
  display: block;
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
  font-family: inherit;
  line-height: inherit;
  max-width: 100%;
}

.wx-article .code-section pre code span[leaf] {
  white-space: nowrap;
}
`.trim();
