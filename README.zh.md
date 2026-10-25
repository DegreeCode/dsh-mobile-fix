# DeepSeek Harness 移动端布局优化

[한국어](README.md) · [English](README.en.md) · **中文** · [日本語](README.ja.md)

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 网页界面在手机上更好用的插件。它不修改 Harness 本体代码，只通过一个客户端模块（`dsh.client`）添加样式表和少量交互。

仅在视口宽度不超过 767px 时生效；更宽的屏幕以及 macOS、Windows 桌面应用保持不变。

## 改动内容

| 问题（基于 0.2.1-rc.3） | 新的行为 |
|---|---|
| 折叠后的侧边栏导轨在 390px 屏幕上始终占用 56px（约 1/7） | 去掉导轨，只在左上角保留一个菜单按钮，正文占满整个宽度。 |
| 展开侧边栏会把正文挤到一旁，文字被压成一行一个字 | 侧边栏以抽屉形式浮在正文之上打开，后面铺一层半透明遮罩。 |
| 在侧边栏中选择会话后，侧边栏仍然保持展开 | 选择会话、新建会话或进入插件、自动化任务等页面后会自动关闭。点按遮罩、按 Esc 或向左滑动也可关闭。从屏幕左边缘向右滑动即可打开。 |
| 设置是 800px 的卡片加 188px 的竖向菜单，每一项只剩约 120px，文字被压成一行一个字 | 设置以全屏面板打开，分区菜单变为顶部可横向滚动的标签栏。宽度不够时，说明文字与选择控件分行排列。 |
| 外观（浅色、深色、跟随系统）三张卡片竖向堆叠，占满一整屏 | 改为一行三列。 |
| 在触屏设备上，会话行的置顶、归档、菜单按钮只在鼠标悬停时出现，无法点按 | 在当前选中的会话和工作区行上始终显示这些按钮，并把 16px 图标的触控区域扩大到 32px。 |
| 输入框文字为 14px，iOS 聚焦时会放大页面 | 手机上输入框文字改为 16px。 |
| 刘海和主屏幕指示条遮挡内容，键盘遮住输入框 | 添加 `viewport-fit=cover` 和 `interactive-widget=resizes-content`，并为安全区域留出边距。 |

## 安装

使用 `dsh` CLI 安装到配置文件（profile）中：

```bash
# 从 Git 仓库安装（client.js 已提交，无需构建）
dsh plugin --profile <配置文件> add github:DegreeCode/dsh-mobile-fix

# 从本地文件夹安装
dsh plugin --profile <配置文件> add ./dsh-mobile-fix

# 从发布包安装（GitHub Releases 中的 .tgz）
dsh plugin --profile <配置文件> add ./dsh-mobile-fix-1.0.0.tgz
```

也可以在应用内通过 **设置 → 插件 → 安装** 进行安装。卸载命令为 `dsh plugin --profile <配置文件> remove dsh-mobile-fix`。卸载或停用后，插件添加的样式、按钮、属性和 viewport 设置都会被还原。

## 工作原理

- Harness 的样式使用 CSS 模块，类名形如 `<哈希>_<名称>`。哈希可能随构建变化，因此只按名称部分匹配（例如 `[class*="_sidebarCol"]`），再用 `:has(> [data-shell-bottom])` 等结构条件缩小范围。
- 侧边栏的打开与关闭调用 Harness 的布局服务（`ctx.layout.toggleSidebar()`），而不是模拟点击 DOM 按钮；展开状态通过 `AppFrame` 输出的 `data-sidebar-collapsed` 属性读取。
- 所有规则都位于 `html[data-dmf]` 之下，插件关闭后即使样式表仍在也不会生效。
- 上游 `master` 已经包含部分设置面板的窄屏适配（尚未发布）。本插件的设置规则以相同的布局（标题与关闭 / 横向标签 / 内容）为目标，但界面只在 `0.2.1-rc.3` 版本上验证过。新版本发布后，请再次查看 CI 中 `Upstream master` 的结果以及实际界面。

## 目录结构

| 路径 | 作用 |
|---|---|
| `src/mobile.css` | 样式源文件 |
| `src/runtime.js` | 菜单按钮、遮罩、抽屉自动关闭、滑动手势、viewport 设置 |
| `client.js` | 浏览器模块，由 `npm run build` 从 `src/` 生成 |
| `index.js`、`cordis.patch.yml` | 宿主端空插件与打包补丁 |
| `locale/*.json`、`icon.svg` | 插件列表中显示的名称、说明和图标 |
| `scripts/check-upstream.mjs` | 检查 Harness 代码中是否仍存在本插件依赖的类名、属性和布局服务 |
| `tests/runtime.test.mjs` | 在与 AppFrame 结构相同的 DOM（jsdom）上验证 `client.js` 的行为 |

## 开发

```bash
npm install
npm run build     # src/ → client.js
npm run check     # 检查 client.js 是否与 src/ 一致
npm test          # 运行时测试
node scripts/check-upstream.mjs <dsh 代码目录>   # 与上游结构比对
```

修改 `src/` 后，请用 `npm run build` 重新生成 `client.js` 并一同提交。

## CI/CD

- **CI**（`.github/workflows/ci.yml`）：在 push、PR 时以及每周一次（周一 00:00 UTC）运行。
  - `Package`：检查 `client.js` 与 `src/` 是否一致、模块语法、元数据、运行时测试以及打包文件列表。
  - `Upstream base`：在基准版本 `dsh-v0.2.1-rc.3`（`1f81c047fc`）的 Harness 上运行 `check-upstream.mjs`，失败则 CI 失败。
  - `Upstream master`：在上游最新 `master` 上运行同样的检查，用于提前发现本体结构变化，失败不会阻塞 CI。
- **CD**（`.github/workflows/release.yml`）：推送与 `package.json` 版本一致的 `v<版本>` 标签后，会先运行检查，再生成 `.tgz` 并附加到 GitHub Release。如果仓库配置了 `NPM_TOKEN` 密钥，也会发布到 npm。

```bash
npm version patch   # 提升 package.json 版本并创建标签
git push --follow-tags
```

## 许可证

MIT。选择器和布局数值沿用 DeepSeek Harness（MIT，Copyright (c) 2026 DeepSeek）的结构。
