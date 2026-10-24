# Releasing AIWXEdit

Verified against the official documentation on 2026-10-24. Initial submission now uses https://community.obsidian.md, rather than a new pull request to the historical community-plugins.json list.

## Prepare a candidate

1. Work on a release branch. Keep the plugin ID `aiwxedit` and increment the version without a `v` prefix. Align package.json, both root lockfile versions, manifest.json, and the current versions.json entry.
2. Use Node.js 22, `npm ci`, and `npm run check`. Run `npm audit` and inspect all lint warnings. Rebuild from the same source twice and compare main.js byte for byte. The official scanner chooses the `build` script first, so it must remain the production build.
3. Install only main.js, manifest.json and styles.css in a disposable test vault. No credentials, personal notes, downloaded assets or existing data.json should be needed for basic preview. Record the exact app and installer version and the three asset hashes.
4. Test fresh loading, code/tables/callouts, dangerous HTML, out-of-order renders, clipboard HTML preparation, close/reopen cleanup and plugin reload. `scripts/host-smoke.mjs` runs those checks against a separately launched Obsidian profile on port 19223 and refuses any vault not named AIWXEdit-QA. It does not send real WeChat or AI requests or prove physical mobile compatibility.
5. Confirm license rights, README disclosures, minimum API version and the current store description. Do not re-add MWeb CSS or built-in download entries without verifiable redistribution permission. Preserve historical license notices.

The root main.js remains ignored, following the official sample plugin. Release builds must match the production output generated from the candidate source and lockfile. The official sample does not require committing main.js: https://github.com/obsidianmd/obsidian-sample-plugin/blob/master/.gitignore.

## Preview and GitHub release

Push the candidate branch and record its full commit SHA. Where the directory already provides an entry and **Review branch**, scan that exact SHA, wait for completion, and resolve errors before publication. First-time submission may require creating the entry before this control is available; follow the current form and do not claim a preview scan passed without its results.

Tag exactly `1.0.6` at the verified candidate commit. The release workflow runs checks and produces a **draft** containing only these independently downloadable files:

- main.js
- manifest.json
- styles.css

Do not move an existing tag, overwrite previously published assets, or reuse the release after a source change. Download the draft assets and compare them with the candidate using:

```bash
node scripts/validate-release.mjs --compare-dir /path/to/downloaded-assets
```

After validation, publish the release. Before exposing the new version in the default branch, anonymously download each exact URL under `https://github.com/IsHexx/AIWXEdit/releases/download/1.0.6/` and compare the bytes. Authenticated downloads of a draft do not prove that ordinary users can install it.

Merge the reviewed release branch only once all three anonymous URLs work. Confirm the release-related source and metadata in the default branch match the tag. Keep older releases intact.

## Official submission

Sign in to Obsidian Community, link the GitHub account that owns the repository, choose **Plugins → New plugin**, and enter `https://github.com/IsHexx/AIWXEdit`. Review the developer policies and maintenance commitment as the repository owner. Use the prepared text in MARKETPLACE.md; classify optional paid AI services as **Optional payment**.

Wait for the Manifest, Releases, Source code and Build verification results to complete. Fix errors in a new patch release; inspect warnings and recommendations individually. A draft, a queued scan, a successful local build or an uploaded GitHub release does not mean marketplace acceptance. Record the official listing URL and client installation result only when actually verified.

For updates to an existing entry, use **Check for new releases** or **Request review** as appropriate, and wait for a completed review. A failed new version can affect the listing; do not assume an older version will automatically remain searchable.

## Sources and reference lessons

- https://docs.obsidian.md/plugins/releasing/submit-plugin
- https://docs.obsidian.md/community-directory/manage-entry
- https://docs.obsidian.md/community-directory/faq
- https://docs.obsidian.md/community-directory/developer-policies
- https://docs.obsidian.md/community-directory/submission-requirements-for-plugins
- User-supplied reference: https://github.com/joeseesun/qiaomu-obsidian-dev, inspected at `288b2c038c7686cad6c9e7802547e63ae1fbbde3` (release, submission-failures and speed-playbook references). No executable code from that repository is included.
