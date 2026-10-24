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
     - The separate Maple stylesheet in `assets/themes/maple.css` and its historical copy.

2) MWeb themes (historical, excluded from the release candidate)
   - Repository: https://github.com/imageslr/mweb-themes
   - License: No license file found in the upstream repository at the time of writing.
   - The 1.0.6 release candidate removes MWeb CSS from both `assets/themes/` and `assets_backup/themes/`, the bundled asset index, and the built-in download catalog. No redistribution permission was available.
   - Older Git history and existing user installations may still contain these files; this change does not remove users' installed styles. Historical source snapshots should not be treated as cleared for redistribution.

3) doocs/md
   - Repository: https://github.com/doocs/md
   - License: WTFPL
   - License text: LICENSES/doocs-md-WTFPL.txt

4) highlight.js
   - Repository: https://github.com/highlightjs/highlight.js
   - License: BSD-3-Clause
   - Copyright: (c) 2006 Ivan Sagalaev
   - License text: LICENSES/highlight.js-BSD-3-Clause.txt
   - Scope: Syntax highlighting dependency and installed highlight styles under `assets/highlights/`.

5) Markdown Nice
   - Repository: https://github.com/mdnice/markdown-nice
   - License: GPL-3.0 (upstream LICENSE)
   - License text: LICENSES/markdown-nice-GPL-3.0.txt
   - Scope: Separate `mdnice-*.css` article styles in `assets/themes/` and their historical copies in `assets_backup/themes/`. These styles retain their upstream license; the plugin's MIT license does not relicense them. They are not bundled into `main.js` or the three plugin installation assets.
