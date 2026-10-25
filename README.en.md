# Mobile layout fixes for DeepSeek Harness

[한국어](README.md) · **English** · [中文](README.zh.md) · [日本語](README.ja.md)

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

A plugin that makes the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI comfortable to use on a phone. It does not patch the Harness itself: a single client module (`dsh.client`) adds a stylesheet and a few behaviours.

It only takes effect at viewport widths of 767px or less. Wider screens and the macOS and Windows desktop apps are left untouched.

## What changes

| Problem (as of 0.2.1-rc.3) | New behaviour |
|---|---|
| The collapsed sidebar rail always takes 56px (about 1/7) of a 390px screen | The rail is removed and only a menu button sits in the top-left corner. Content uses the full width. |
| Expanding the sidebar pushes the content aside until text wraps one character per line | The sidebar opens as a drawer above the content, over a dimmed backdrop. |
| Picking a session in the sidebar leaves the sidebar open | The drawer closes after choosing a session, starting a new one, or opening a page such as Plugins or Automation. Tapping the backdrop, pressing Esc or swiping left also closes it. Swiping right from the left edge opens it. |
| Settings is an 800px card with a 188px vertical menu, leaving ~120px per row, so text wraps one character per line | Settings opens as a full-screen sheet with the section menu as a horizontally scrolling tab strip. A row's description and its control wrap onto separate lines when space runs out. |
| The three Appearance cards (light, dark, system) stack vertically and fill a whole screen | They sit in one row of three. |
| On touch devices the pin, archive and menu buttons on session rows only appear on mouse hover and cannot be tapped | They stay visible on the selected session and on workspace rows, and the 16px icons get a 32px touch target. |
| Input text is 14px, so iOS zooms the page when a field is focused | Input fields use 16px text on phones. |
| The notch and home indicator cover content, and the keyboard covers the composer | Adds `viewport-fit=cover` and `interactive-widget=resizes-content` and pads for safe-area insets. |

## Installation

Install into a profile with the `dsh` CLI.

```bash
# From the Git repository (client.js is committed, so no build step is needed)
dsh plugin --profile <profile> add github:DegreeCode/dsh-mobile-fix

# From a local folder
dsh plugin --profile <profile> add ./dsh-mobile-fix

# From a release tarball (the .tgz from GitHub Releases)
dsh plugin --profile <profile> add ./dsh-mobile-fix-1.0.0.tgz
```

Inside the app you can also install it from **Settings → Plugins → Install**. To remove it, run `dsh plugin --profile <profile> remove dsh-mobile-fix`. Removing or disabling the plugin reverts the styles, buttons, attributes and viewport settings it added.

## How it works

- Harness styles are CSS modules, so class names look like `<hash>_<name>`. The hash can change between builds, so elements are matched by the name part only (for example `[class*="_sidebarCol"]`), narrowed by structural conditions such as `:has(> [data-shell-bottom])`.
- The sidebar is opened and closed through the Harness layout service (`ctx.layout.toggleSidebar()`) rather than by clicking DOM buttons. Its open state is read from the `data-sidebar-collapsed` attribute that `AppFrame` publishes.
- Every rule sits under `html[data-dmf]`, so nothing applies once the plugin is turned off, even if the stylesheet is still present.
- Upstream `master` already contains part of a narrow-screen layout for the Settings panel (not yet released). This plugin's Settings rules aim for the same arrangement (title and close / horizontal tabs / content), but the screens were only checked on the `0.2.1-rc.3` release. When a new release comes out, check the `Upstream master` CI result and the actual screens again.

## Layout

| Path | Role |
|---|---|
| `src/mobile.css` | Stylesheet source |
| `src/runtime.js` | Menu button, backdrop, drawer auto-close, swipe, viewport settings |
| `client.js` | Browser module, generated from `src/` by `npm run build` |
| `index.js`, `cordis.patch.yml` | Empty host-side plugin and bundle patch |
| `locale/*.json`, `icon.svg` | Name, description and icon shown in the plugin list |
| `scripts/check-upstream.mjs` | Checks that the classes, attributes and layout service this plugin relies on still exist in a Harness checkout |
| `tests/runtime.test.mjs` | Runs `client.js` against a DOM shaped like AppFrame (jsdom) |

## Development

```bash
npm install
npm run build     # src/ → client.js
npm run check     # client.js matches src/
npm test          # runtime tests
node scripts/check-upstream.mjs <dsh checkout>   # compare with upstream structure
```

After editing `src/`, regenerate `client.js` with `npm run build` and commit it together.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs on push, on PRs and weekly (Mondays 00:00 UTC).
  - `Package`: checks that `client.js` matches `src/`, module syntax, metadata, runtime tests and the packed file list.
  - `Upstream base`: runs `check-upstream.mjs` against the pinned release `dsh-v0.2.1-rc.3` (`1f81c047fc`). A failure fails CI.
  - `Upstream master`: runs the same check against the latest upstream `master`. It exists to warn early about structural changes in the Harness, so a failure does not block CI.
- **CD** (`.github/workflows/release.yml`): pushing a `v<version>` tag that matches the version in `package.json` runs the checks, builds a `.tgz` and attaches it to a GitHub Release. If the repository has an `NPM_TOKEN` secret, it is also published to npm.

```bash
npm version patch   # bump package.json and create the tag
git push --follow-tags
```

## License

MIT. Selectors and layout values follow the structure of DeepSeek Harness (MIT, Copyright (c) 2026 DeepSeek).
