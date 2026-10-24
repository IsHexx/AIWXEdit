# Community directory listing

Prepared on 2026-10-24. This is submission content, not evidence of acceptance.

- Repository: https://github.com/IsHexx/AIWXEdit
- Identifier: `aiwxedit` (keep unchanged).
- Name: AIWXEdit
- Version: 1.0.6
- Minimum Obsidian version: 1.7.2
- Payment type: **Optional payment**. The plugin is free; optional AI providers may charge separately. This follows the directory's payment classification for third-party services.
- Language: primarily Chinese.
- Desktop screenshot: `docs/screenshots/desktop-preview.png` (1200 × 800; real Obsidian, synthetic test content).
- Mobile screenshots: none; no physical mobile device validation has been completed.
- Categories: choose the available publishing/export and AI categories in the current form.
- Original code contributor to credit: sunbooshi (note-to-mp; see README attribution and THIRD_PARTY_NOTICES.md).

## Short description

Format Markdown notes and send them to WeChat Official Account drafts, with code highlighting, themes, image uploads, and optional AI tools.

## Long description

AIWXEdit helps you prepare Markdown notes for WeChat Official Accounts (微信公众号). Preview article formatting in a sidebar, adjust the theme, fonts and colors, and send the result to the account's draft box for review in WeChat.

Features include code highlighting, tables and callouts, local image uploads, multiple account profiles, cover selection, rich-text copying, and optional AI title suggestions and cover generation. The interface is primarily in Chinese. LaTeX rendering is not implemented.

Publishing requires a WeChat Official Account with the relevant API permissions and your own AppID/AppSecret. AI features use an API provider and key you configure; providers may charge usage fees. Notes and images are sent to WeChat when you publish, and article content is sent to your chosen AI provider when you use AI features. Copying with an account configured also attempts to upload local article images to WeChat. Remote images in notes can load from their original hosts. Optional theme downloads use GitHub/jsDelivr or a URL you supply. Credentials are stored unencrypted in the vault's plugin data.json. There is no client-side telemetry.

Publishing creates or updates a draft; it does not send an article to subscribers. Review the draft and publish it from WeChat. Desktop preview and lifecycle checks have been completed; mobile behavior and live WeChat/AI operations still require validation with the appropriate devices and accounts.

## Official references

- https://docs.obsidian.md/plugins/releasing/submit-plugin
- https://docs.obsidian.md/community-directory/set-up-and-claim
- https://docs.obsidian.md/community-directory/manage-entry
- https://docs.obsidian.md/community-directory/faq
- https://docs.obsidian.md/community-directory/developer-policies
