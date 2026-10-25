# DeepSeek Harness モバイルレイアウト改善

[한국어](README.md) · [English](README.en.md) · [中文](README.zh.md) · **日本語**

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) の Web UI をスマートフォンで使いやすくするプラグインです。本体のコードは変更せず、クライアントモジュール（`dsh.client`）ひとつでスタイルシートといくつかの動作を追加します。

画面幅が 767px 以下のときだけ動作します。それより広い画面と、macOS・Windows のデスクトップアプリには何も変更を加えません。

## 変更点

| 問題（0.2.1-rc.3 時点） | 新しい動作 |
|---|---|
| 折りたたんだサイドバーのレールが、390px の画面で常に 56px（約 1/7）を占める | レールをなくし、左上にメニューボタンだけを置きます。本文は画面幅いっぱいに表示されます。 |
| サイドバーを開くと本文が横に押しやられ、文字が 1 文字ずつ縦に折り返される | 本文の上に重なるドロワーとして開き、背後に半透明の背景を敷きます。 |
| サイドバーでセッションを選んでも開いたままになる | セッションの選択、新規セッション、プラグイン・自動化タスクなどのページへの移動で自動的に閉じます。背景のタップ、Esc、左スワイプでも閉じます。画面の左端から右へスワイプすると開きます。 |
| 設定が 800px のカードと 188px の縦メニューで、各項目に 120px ほどしか残らず、文字が 1 文字ずつ折り返される | 全画面のシートとして開き、セクションメニューは上部の横スクロールタブになります。幅が足りないときは、説明文と選択ボタンを別の行に配置します。 |
| 外観（ライト・ダーク・システム）の 3 枚のカードが縦に積まれ、1 画面を占める | 1 行 3 列に並べます。 |
| タッチデバイスでは、セッション行のピン留め・アーカイブ・メニューボタンがマウスのホバー時にしか表示されず、タップできない | 選択中のセッションとワークスペース行には常に表示し、16px アイコンのタッチ領域を 32px に広げます。 |
| 入力欄の文字が 14px のため、iOS でフォーカスすると画面が拡大される | スマートフォンでは入力欄の文字を 16px にします。 |
| ノッチやホームインジケーターに画面が隠れ、キーボードが入力欄を覆う | `viewport-fit=cover` と `interactive-widget=resizes-content` を追加し、セーフエリアの余白を確保します。 |

## インストール

`dsh` CLI でプロファイルにインストールします。

```bash
# Git リポジトリから（client.js がコミット済みなのでビルド不要）
dsh plugin --profile <プロファイル> add github:DegreeCode/dsh-mobile-fix

# ローカルフォルダから
dsh plugin --profile <プロファイル> add ./dsh-mobile-fix

# リリースのアーカイブから（GitHub Releases の .tgz）
dsh plugin --profile <プロファイル> add ./dsh-mobile-fix-1.0.0.tgz
```

アプリ内では **設定 → プラグイン → インストール** からもインストールできます。削除は `dsh plugin --profile <プロファイル> remove dsh-mobile-fix` です。削除または無効化すると、追加したスタイル、ボタン、属性、viewport 設定はすべて元に戻ります。

## 仕組み

- Harness のスタイルは CSS モジュールのため、クラス名は `<ハッシュ>_<名前>` の形になります。ハッシュはビルドごとに変わる可能性があるので、`[class*="_sidebarCol"]` のように名前の部分だけで要素を探し、`:has(> [data-shell-bottom])` などの構造条件で範囲を絞ります。
- サイドバーの開閉は DOM のボタンをクリックするのではなく、本体のレイアウトサービス（`ctx.layout.toggleSidebar()`）を呼び出します。開閉状態は `AppFrame` が出力する `data-sidebar-collapsed` 属性から読み取ります。
- すべてのルールは `html[data-dmf]` の下にあるため、プラグインを無効にするとスタイルシートが残っていても適用されません。
- 上流の `master` には、設定パネルの狭い画面向けレイアウトが一部すでに入っています（未リリース）。このプラグインの設定ルールも同じ配置（タイトルと閉じる / 横タブ / 内容）を目指していますが、画面の確認はリリース `0.2.1-rc.3` でのみ行っています。新しいリリースが出たら、CI の `Upstream master` の結果と実際の画面を改めて確認してください。

## 構成

| パス | 役割 |
|---|---|
| `src/mobile.css` | スタイルの原本 |
| `src/runtime.js` | メニューボタン、背景、ドロワーの自動クローズ、スワイプ、viewport 設定 |
| `client.js` | ブラウザモジュール。`npm run build` が `src/` から生成します。 |
| `index.js`、`cordis.patch.yml` | ホスト側の空プラグインとバンドルパッチ |
| `locale/*.json`、`icon.svg` | プラグイン一覧に表示される名前、説明、アイコン |
| `scripts/check-upstream.mjs` | Harness のチェックアウトに、このプラグインが依存するクラス、属性、レイアウトサービスが残っているかを確認 |
| `tests/runtime.test.mjs` | AppFrame と同じ形の DOM（jsdom）で `client.js` の動作を確認 |

## 開発

```bash
npm install
npm run build     # src/ → client.js
npm run check     # client.js が src/ と一致するか
npm test          # ランタイムテスト
node scripts/check-upstream.mjs <dsh チェックアウト>   # 上流の構造と照合
```

`src/` を変更したら、`npm run build` で `client.js` を再生成して一緒にコミットしてください。

## CI/CD

- **CI**（`.github/workflows/ci.yml`）：push、PR、週 1 回（月曜 09:00 JST）に実行します。
  - `Package`：`client.js` と `src/` の一致、モジュールの構文、メタデータ、ランタイムテスト、パッケージのファイル一覧を確認します。
  - `Upstream base`：基準リリース `dsh-v0.2.1-rc.3`（`1f81c047fc`）の Harness で `check-upstream.mjs` を実行します。失敗すると CI も失敗します。
  - `Upstream master`：同じ検査を上流の最新 `master` で実行します。本体の構造変化を早めに知らせるためのもので、失敗しても CI は止まりません。
- **CD**（`.github/workflows/release.yml`）：`package.json` のバージョンと同じ `v<バージョン>` タグをプッシュすると、検査のあと `.tgz` を作成して GitHub Release に添付します。リポジトリのシークレットに `NPM_TOKEN` があれば npm にも公開します。

```bash
npm version patch   # package.json のバージョンを上げてタグを作成
git push --follow-tags
```

## ライセンス

MIT。セレクターとレイアウトの値は DeepSeek Harness（MIT、Copyright (c) 2026 DeepSeek）の構造に基づいています。
