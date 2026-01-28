Third-Party Notices
===================

This project includes code derived from the following third-party project(s).

1) note-to-mp
   - Repository: https://github.com/sunbooshi/note-to-mp
   - License: MIT
   - Copyright: (c) 2024 sunbooshi
   - License text: LICENSES/note-to-mp-MIT.txt
   - Scope of derivation (high-level):
     - Code block rendering structure (line numbers + per-line code layout) and WeChat editor compatibility handling.
     - Current implementation lives in `src/infrastructure/markdown/plugins/CodeBlockPlugin.ts` and related HTML post-processing in `src/infrastructure/html/normalizeWechatHtml.ts`.

2) MWeb themes (reference / external styles)
   - Repository: https://github.com/imageslr/mweb-themes
   - License: No license file found in the upstream repository at the time of writing.
   - How it is used here:
     - Theme metadata and compatibility handling for theme CSS (including legacy `.wdwxedit` selector rewriting).
     - This repository may include local backup copies under `assets_backup/` for development/reference.
     - Obsidian release artifacts for this plugin only ship `main.js`, `manifest.json`, and `styles.css` (no theme packs).
   - Note:
     - If you plan to redistribute any CSS originating from that repository (directly or via a CDN), you should obtain an explicit license/permission from the upstream author first.

3) doocs/md
   - Repository: https://github.com/doocs/md
   - License: WTFPL
   - License text: LICENSES/doocs-md-WTFPL.txt
