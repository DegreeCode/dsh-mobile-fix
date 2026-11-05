# DeepSeek Harness 移动布局优化

[한국어](README.md) · [English](README.en.md) · **中文** · [日本語](README.ja.md)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 改善移动输入与顶部操作按钮。要求 **Harness 0.2.2-rc.1 或更新版本**，验证基线为 `dsh-v0.2.2-rc.1`（`66491b05e3`）。

侧栏抽屉、打开按钮、遮罩、Esc 关闭、全屏设置和横向标签由本体提供。1.2.0 删除了这些功能的重复实现，以及旧版设置、触摸行和外观卡片 CSS。旧版 Harness 请使用插件 1.1.1。

## 附加功能

- 在宽度不超过 767px 时，将团队、子智能体和后台任务显示为 40px 图标，带状态和数量标记。文字模式会按需换行。
- 从左边缘向右滑动可打开本体抽屉，在抽屉或遮罩上向左滑动可关闭。其他活动模态窗口会阻止手势。
- 选择会话或新建会话后关闭抽屉。页面导航和 Esc 由本体处理。
- 添加 viewport 元信息、safe-area 留白及 visual viewport 高度跟随，以适配刘海、主页指示条和软键盘。
- 移动输入框使用 16px 字号，减少 iOS 聚焦缩放；较长的设置说明与控件可分行显示。

布局规则仅作用于宽度不超过 767px 的 Web 页面，不作用于 macOS、Windows 桌面应用。设置项也会出现在较宽的 Web 窗口中。

## 安装

```bash
dsh plugin --profile <profile> add github:DegreeCode/dsh-mobile-fix
# 或使用本地目录 / 发布包
dsh plugin --profile <profile> add ./dsh-mobile-fix
dsh plugin --profile <profile> add ./dsh-mobile-fix-1.2.0.tgz
```

也可从**设置 → 插件 → 安装**添加。卸载命令为 `dsh plugin --profile <profile> remove dsh-mobile-fix`。停用后会撤销插件的样式、属性、viewport 修改及事件处理。

## 顶部操作

通过**设置 → 通用 → 将顶部操作显示为图标**切换，默认为开启，选择会保存在本体用户设置中。关闭时保留本体文字标签并按需换行。

短按打开，再次按同一按钮关闭。长按显示说明，松手后仍保留，点击外部、滚动或按 Esc 可关闭。鼠标悬停和键盘聚焦也能查看说明。图标保持一行，仅在极窄屏幕中横向滚动。

## 开发和验证

```bash
npm ci
npm run build
npm run check
npm test
node scripts/check-upstream.mjs <Harness-checkout>
```

修改 `src/mobile.css`、`src/runtime.js`、`src/header.js`、`src/settings.js` 后重新生成 `client.js`。插件读取本体抽屉标记，通过 `ctx.layout.toggleSidebar()` 开关侧栏。

运行时测试使用含本体 dialog、按钮和遮罩的 jsdom fixture，覆盖重复 UI、手势、模态阻断、延迟挂载、清理、图标和设置保存。结构检查核对类名、属性提供位置及 768px 抽屉边界。实际手机键盘仍需单独验证。

CI 强制检查包和 `0.2.2-rc.1` 结构，并通过最新 `master` 检查报告变化。推送与版本一致的 `v<version>` 标签后会创建 GitHub Release 和 `.tgz`；配置 `NPM_TOKEN` 时也会发布到 npm。

## 许可证

MIT。布局选择器遵循 DeepSeek Harness（MIT, Copyright (c) 2026 DeepSeek）的结构。
