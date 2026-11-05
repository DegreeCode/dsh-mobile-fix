# Mobile layout fixes for DeepSeek Harness

[한국어](README.md) · **English** · [中文](README.zh.md) · [日本語](README.ja.md)

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

Mobile input and header action improvements for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI. Requires **Harness 0.2.2-rc.1 or later**; the pinned verification baseline is `dsh-v0.2.2-rc.1` (`66491b05e3`).

The native Harness owns the sidebar drawer, opener, backdrop, Escape dismissal, fullscreen Settings and horizontal tabs. Version 1.2.0 removes the duplicate implementations and obsolete Settings, touch-row and Appearance CSS. Use plugin 1.1.1 with older Harness versions.

## Features

- At widths up to 767px, show agent teams, subagents and background jobs as 40px icons with activity/count badges. Text mode wraps actions when needed.
- Swipe right from the left edge to open the native drawer, or left on the drawer or backdrop to close it. Other active modals block gestures.
- Close the drawer after choosing a session or starting a new one. Harness handles page navigation and Escape.
- Add viewport metadata, safe-area padding and visual viewport height tracking for cutouts, home indicators and software keyboards.
- Use 16px mobile input text to reduce iOS focus zoom and let long Settings descriptions wrap apart from controls.

Layout rules apply to web widths up to 767px. macOS and Windows desktop shells are excluded. The preference row is also available in wider web windows.

## Installation

```bash
dsh plugin --profile <profile> add github:DegreeCode/dsh-mobile-fix
# Or use a local folder / release package:
dsh plugin --profile <profile> add ./dsh-mobile-fix
dsh plugin --profile <profile> add ./dsh-mobile-fix-1.2.0.tgz
```

You can also use **Settings → Plugins → Install**. Remove it with `dsh plugin --profile <profile> remove dsh-mobile-fix`. Disabling it reverts its styles, attributes, viewport changes and event handlers.

## Header actions

Use **Settings → General → Show header actions as icons**, enabled by default. The preference is saved in the native user settings. Turn it off to retain host text labels and allow wrapping.

Tap to open an action; tap again to close it. Long press shows an explanation that stays after release until an outside press, scrolling or Escape. Mouse hover and keyboard focus also explain actions. Icons stay in one row with horizontal scrolling on very narrow screens.

## Development and validation

```bash
npm ci
npm run build
npm run check
npm test
node scripts/check-upstream.mjs <Harness-checkout>
```

Edit `src/mobile.css`, `src/runtime.js`, `src/header.js` and `src/settings.js`, then regenerate `client.js`. The plugin reads native drawer markers and calls `ctx.layout.toggleSidebar()`.

Runtime tests use a jsdom fixture with the native dialog, opener and backdrop. They cover duplicate UI prevention, gestures, modal blocking, delayed mounting, cleanup, actions and saved settings. The upstream check verifies selectors, marker ownership and the 768px native drawer breakpoint. Physical phone keyboard testing remains separate.

CI requires package checks and the pinned `0.2.2-rc.1` structure check. The latest `master` check reports drift. Pushing a matching `v<version>` tag creates a GitHub Release with a `.tgz`; npm publication runs when `NPM_TOKEN` is configured.

## License

MIT. Layout selectors follow DeepSeek Harness (MIT, Copyright (c) 2026 DeepSeek).
