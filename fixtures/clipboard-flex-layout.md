# Clipboard flex layout repro

This fixture is for manually verifying WeChat paste behavior for flex-based layouts.

1. Open this file in Obsidian.
2. Use AIWXEdit to preview and “Copy to clipboard”.
3. Paste into WeChat Official Account editor.

Expected: the two cards stay side-by-side (flex layout preserved).

<div style="display:flex; gap:12px; background:#f5f5f5; padding:12px; border-radius:8px;">
  <div style="flex:1; padding:12px; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px;">
    <div style="font-weight:600; margin-bottom:6px;">Card A</div>
    <div>Line 1</div>
    <div>Line 2</div>
  </div>
  <div style="flex:1; padding:12px; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px;">
    <div style="font-weight:600; margin-bottom:6px;">Card B</div>
    <div>Line 1</div>
    <div>Line 2</div>
  </div>
</div>

