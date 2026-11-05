# DeepSeek Harness のモバイル表示改善

[한국어](README.md) · [English](README.en.md) · [中文](README.zh.md) · **日本語**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI の入力と上部アクションを改善します。**Harness 0.2.2-rc.1 以降**が対象です。検証基準は `dsh-v0.2.2-rc.1`（`66491b05e3`）です。

サイドバーのドロワー、開くボタン、背景、Esc、全画面の設定と横タブは本体に任せます。1.2.0 では重複実装と古い設定・タッチ行・外観カードの CSS を削除しました。古い Harness ではプラグイン 1.1.1 を使用してください。

## 追加機能

- 幅 767px 以下でチーム・サブエージェント・バックグラウンドジョブを 40px のアイコンと状態・件数バッジで表示します。文字表示では必要に応じて折り返します。
- 左端から右にスワイプして本体のドロワーを開き、ドロワーか背景を左にスワイプして閉じます。他のモーダルが開いている間は操作しません。
- セッションの選択や新規作成後にドロワーを閉じます。ページ移動と Esc は本体が処理します。
- viewport メタ情報、safe-area の余白、visual viewport の高さ追従でノッチ・ホームインジケーター・ソフトキーボードに対応します。
- 入力欄を 16px にして iOS のフォーカス拡大を抑え、長い設定説明と操作部を折り返します。

レイアウト変更は幅 767px 以下の Web 画面に適用されます。macOS・Windows デスクトップアプリは対象外です。設定項目は広い Web 画面にも表示されます。

## インストール

```bash
dsh plugin --profile <profile> add github:DegreeCode/dsh-mobile-fix
# ローカルフォルダーまたはリリースパッケージ
dsh plugin --profile <profile> add ./dsh-mobile-fix
dsh plugin --profile <profile> add ./dsh-mobile-fix-1.2.0.tgz
```

**設定 → プラグイン → インストール**からも追加できます。削除は `dsh plugin --profile <profile> remove dsh-mobile-fix` です。無効化するとスタイル・属性・viewport の変更・イベント処理を元に戻します。

## 上部アクション

**設定 → 一般 → 上部の操作をアイコンで表示**で切り替えます。初期値はオンで、本体のユーザー設定に保存します。オフでは本体の文字ラベルを使い、必要に応じて折り返します。

タップで開き、同じボタンの再タップで閉じます。長押しは説明を表示し、指を離した後も維持します。外側の操作・スクロール・Esc で説明を閉じます。マウスホバーやキーボードフォーカスでも確認できます。アイコンは一行を保ち、非常に狭い画面では横スクロールできます。

## 開発と検証

```bash
npm ci
npm run build
npm run check
npm test
node scripts/check-upstream.mjs <Harness-checkout>
```

`src/mobile.css`、`src/runtime.js`、`src/header.js`、`src/settings.js`を変更した後、`client.js`を再生成します。開閉には本体の `ctx.layout.toggleSidebar()` を使います。

テストは本体の dialog・ボタン・背景を含む jsdom fixture で、重複 UI、スワイプ、モーダル、遅延マウント、解除、アイコン、設定保存を確認します。構造検査ではクラス・属性の提供元と 768px の境界を確認します。実機のキーボード検証は別途必要です。

CI はパッケージと `0.2.2-rc.1` の構造検査を必須とし、最新 `master` の差分も通知します。バージョンと一致する `v<version>` タグで GitHub Release と `.tgz` を作成します。`NPM_TOKEN` が設定されていれば npm にも公開します。

## ライセンス

MIT。レイアウトのセレクターは DeepSeek Harness（MIT, Copyright (c) 2026 DeepSeek）の構造に従います。
