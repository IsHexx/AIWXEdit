# WDWXEdit (WeChat Article Editor)

**WDWXEdit** is an Obsidian plugin that allows you to publish your notes directly to WeChat Official Accounts (微信公众号) with perfect formatting.

## Features

- **Perfect Formatting**: Preserves your Markdown styling, including headers, list, bold, italic, and more.
- **Code Highlighting**: Supports syntax highlighting for code blocks.
- **Local Image Upload**: Automatically uploads local images from your vault to WeChat servers.
- **Math Formula Support**: Renders LaTeX math formulas correctly.
- **Theme Support**: Choose from built-in themes or customize your own CSS.
- **Multi-Account Support**: Manage multiple WeChat Official Accounts.
- **AI Integration**: Auto-generate titles and covers using AI.

## Installation

### From Community Plugins
1. Open Obsidian settings.
2. Go to **Community Plugins** and turn off **Safe Mode**.
3. Click **Browse** and search for "WDWXEdit".
4. Click **Install** and then **Enable**.

### Manual Installation
1. Download the `main.js`, `manifest.json`, and `styles.css` from the [Latest Release](https://github.com/IsHexx/WDWXEdit/releases).
2. Create a folder named `wdwxedit-v5` in your vault's `.obsidian/plugins/` directory.
3. Put the downloaded files into that folder.
4. Reload Obsidian and enable the plugin.

## Setup

1. Go to **Settings** > **WDWXEdit**.
2. Add your WeChat Official Account credentials (`AppID` and `AppSecret`).
   - You can get these from the [WeChat Official Accounts Platform](https://mp.weixin.qq.com/) under **Development** > **Basic Settings**.
3. (Optional) Configure AI features if you want auto-generated content.

## Usage

1. Open a Markdown note.
2. Click the ribbon icon or use the command palette (`Ctrl/Cmd + P`) and search for "WDWXEdit: Open Publish View".
3. In the right sidebar view:
   - Preview your article.
   - Select the target account.
   - Choose a cover image (Default, Upload, or AI generated).
4. Click **Publish** to send it as a draft to your WeChat Official Account.

## Development

```bash
npm install
npm run dev
```

## License

MIT
