# AIWXEdit

Format Markdown notes for WeChat Official Accounts (微信公众号), preview the result in a sidebar, and send articles to the account's **draft box**. Publishing a draft does not send an article to subscribers; review and publish it from WeChat yourself.

## Features

- Markdown headings, lists, tables, blockquotes, callouts, and code highlighting.
- Built-in article themes, font and color controls, custom CSS, and optional theme downloads.
- Local image uploads and rich-text copying for the WeChat editor.
- Multiple WeChat accounts, cover selection, and draft creation or updates.
- Optional AI title suggestions and cover generation through your own API provider.

The interface is primarily in Chinese. LaTeX formula rendering is not currently implemented.

Requires Obsidian 1.7.2 or later. Desktop clipboard copying uses Electron when available; mobile uses browser clipboard APIs. Mobile devices have not yet been verified in this release candidate.

![AIWXEdit running in an isolated Obsidian test vault](docs/screenshots/desktop-preview.png)

## Installation

Community directory submission is in preparation. Until it is accepted, use manual installation. A GitHub release alone does not mean the plugin is listed in Obsidian.

1. Download `main.js`, `manifest.json`, and `styles.css` from a [public release](https://github.com/IsHexx/AIWXEdit/releases).
2. Create `<vault>/<config-folder>/plugins/aiwxedit/` (the default config folder is `.obsidian`).
3. Put the three files in that directory, restart Obsidian, and enable **AIWXEdit** under **Settings → Community plugins**.

Only these three files are required. Default article styling and code highlighting work without a separate `assets` folder. Downloaded styles and custom CSS are stored under the plugin's `assets` folder.

Once accepted into the community directory, install it through **Settings → Community plugins → Browse** by searching for **AIWXEdit**.

## Setup and use

1. Open **Settings → AIWXEdit** and add a WeChat Official Account's `AppID` and `AppSecret`. Your account needs access to the relevant WeChat draft and material APIs. Obtain credentials and configure any required IP allowlist in the [WeChat Official Accounts Platform](https://mp.weixin.qq.com/).
2. Open a Markdown note. Use the ribbon button or the command **AIWXEdit: 打开发布视图** to open the preview.
3. Choose the account and article style. Select a cover, or choose one in the publishing dialog.
4. Click the send button, review the title, cover, author, and summary, and confirm to create or update a WeChat draft.
5. Review the draft in WeChat before publishing it to subscribers.

The copy button writes formatted HTML and plain text to your clipboard. **When an account is configured, copying also attempts to upload local article images to WeChat**, so pasted images can be displayed there. Without an account, local images are embedded where supported. Clipboard capabilities vary between desktop and mobile; plain-text copying is the final fallback.

Optional AI tools require enabling AI in settings and providing your own API key. Provider/model support and image generation availability depend on your selected service. Previewing and styling notes do not require AI or an API key.

## Network, accounts, and privacy

The plugin has no client-side analytics or telemetry. Network requests are made for the following features:

| Feature | Remote service and data |
| --- | --- |
| Account connection test and draft operations | `api.weixin.qq.com`: account credentials to obtain an access token; tokens, article HTML, metadata, covers, and images for the requested operation. |
| Image previews | Images referenced by the note, selected WeChat materials, or generated covers can load from their original hosts, including WeChat image hosts such as `mmbiz.qpic.cn` and `mmbiz.qlogo.cn`. |
| Optional AI | Your configured OpenAI-compatible endpoint. Presets include OpenAI, OpenRouter, DeepSeek, Kimi/Moonshot, and Zhipu. Title generation sends article text and prompts; cover generation sends the title, summary, and prompt. Connection testing also contacts the selected provider. |
| Optional theme/highlight downloads | `cdn.jsdelivr.net` and `raw.githubusercontent.com`, or a CSS URL you add yourself. Requests fetch CSS when you choose to download a style; CSS can reference remote images or fonts. |

WeChat publishing requires a WeChat Official Account with the necessary API permissions. AI services may charge usage fees independently of this free, MIT-licensed plugin; you supply and manage those accounts. Data sent to an external service is subject to that service's policies.

Settings, WeChat `AppSecret` values, and AI API keys are saved **unencrypted** in the plugin's `data.json` inside your vault's configuration folder. Protect that folder and consider whether your vault sync, backups, or Git repository include it. Access tokens are cached in memory. The plugin does not read files outside your vault or automatically publish to subscribers.

## Development

Use Node.js 22 and npm:

```bash
npm ci
npm run check
npm run dev
```

`npm run build` produces the root `main.js`. Release validation and submission instructions are in [docs/RELEASING.md](docs/RELEASING.md).

## License and attribution

MIT; see [LICENSE](LICENSE). Code block rendering and WeChat HTML compatibility include code derived from [sunbooshi/note-to-mp](https://github.com/sunbooshi/note-to-mp), copyright 2024 sunbooshi, under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [LICENSES](LICENSES/) for all notices and license texts.
