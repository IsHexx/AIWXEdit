# Publish background shorthand repro

Some WeChat publish flows drop `style=\"background: ...\"` but keep `background-color`.
This fixture includes a block using `background` shorthand so we can verify publish keeps the background.

1. Open this file in Obsidian.
2. Use “发布” to create a draft.
3. Check in the WeChat draft editor that the block has a light gray background.

<section style="background: #f6f8fa; padding: 12px; border-radius: 8px;">
  <div style="font-weight:600; margin-bottom: 6px;">Background shorthand block</div>
  <div>If this turns white after publish, background shorthand was stripped.</div>
</section>

