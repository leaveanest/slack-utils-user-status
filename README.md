# slack-utils-user-status

Slackのステータスを効率的に管理するアプリ

## 概要

- slack-utils シリーズのステータス管理用アプリケーションです。
- ユーザーステータスの設定、プリセット管理、チームメンバーのステータス一覧表示などの機能を提供します。
- Slack Deno SDK v2.x
  を利用し、関数・ワークフロー・トリガーを一貫して管理します。

## 主な機能

- **ステータス設定** - モーダルUIで絵文字、テキスト、有効期限を設定
- **プリセット管理** - よく使うステータスをプリセットとして保存・適用
- **チームステータス** - チームメンバーのステータスを一覧表示
- **クイック設定** - 保存したプリセットから素早くステータスを変更

## 前提条件

- **Deno 2.x** がインストールされていること
- **Slack CLI** が利用可能で、ワークスペースにログイン済みであること
- **Slack App** を作成できる権限を持っていること
- **Git** がインストールされていること（Git Hooks使用時）
- **User OAuth Token**（xoxp-）が必要（ステータス設定機能に必須）

詳細は [開発環境のセットアップ](#開発環境のセットアップ) を参照してください。

## セットアップ

```bash
# リポジトリを取得
git clone https://github.com/leaveanest/slack-utils-user-status.git
cd slack-utils-user-status

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して、アプリ名やトークンを設定

# 依存設定と初期化
slack login
slack env add local

# Git hooks をセットアップ（推奨）
# macOS/Linux: bash scripts/setup-git-hooks.sh
# Windows: Git Bash または WSL で実行
```

### 環境変数の設定

`.env` ファイルで以下の変数を設定します：

```bash
# Slack App Configuration
SLACK_APP_NAME=ステータスマネージャー
SLACK_APP_DESCRIPTION=Slackのステータスを効率的に管理するアプリ
SLACK_CATEGORY=Status

# Admin User Token（ステータス設定に必須）
# 従来型 Slack App から取得した User OAuth Token（xoxp-で始まる）
# 必要なスコープ: users.profile:write
SLACK_ADMIN_USER_TOKEN=xoxp-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx
```

### User OAuth Token の取得方法

ステータス設定機能を使用するには、User OAuth Token が必要です：

1. [https://api.slack.com/apps](https://api.slack.com/apps) にアクセス
2. 従来型 Slack App を作成（または既存を使用）
3. OAuth & Permissions で `users.profile:write` スコープを追加
4. Install App でワークスペースにインストール
5. User OAuth Token をコピーして `.env` に設定

> **注意**:
> トークンを発行したユーザーより高い権限のユーザーのプロフィールは変更できません。

### slack.json 設定

`slack.json` には以下の設定が含まれています：

#### 環境変数の管理

```json
"environments": {
  "local": {
    "env_file": ".env"
  }
}
```

- **`environments.local`**: `slack run`実行時に`.env`ファイルを自動読み込み

#### 本番デプロイ設定（オプション）

本番環境へデプロイする場合は、`deployments`セクションを追加してください：

```json
"deployments": {
  "production": {
    "workspace": "your-workspace-name",
    "token_alias": "production"
  }
}
```

その後、`slack deploy --env production`でデプロイできます。

## 使い方

```bash
# フォーマット・Lint・テスト
deno task fmt
deno task lint
deno task check
deno task test

# カバレッジ付きテスト
deno test --allow-all --coverage=cov
deno coverage cov --html

# ローカル実行
slack run
```

### ワークフローの実行

ローカル開発環境でワークフローを実行するには：

1. `slack run` でアプリを起動
2. トリガーを作成してワークフローを登録
3. Slackのショートカットからワークフローを起動

## Functions一覧

| 関数名                 | 説明                                                 |
| ---------------------- | ---------------------------------------------------- |
| `set_status`           | 絵文字、テキスト、有効期限を指定してステータスを設定 |
| `get_status`           | ユーザーの現在のステータスを取得                     |
| `clear_status`         | 現在のユーザーステータスをクリア                     |
| `create_preset`        | 新しいステータスプリセットを作成                     |
| `apply_preset`         | 保存済みプリセットをユーザーステータスに適用         |
| `list_presets`         | ステータスプリセットと共有プリセットの一覧を取得     |
| `delete_preset`        | ステータスプリセットを削除                           |
| `show_status_form`     | ステータス設定モーダルを表示                         |
| `show_preset_selector` | プリセット選択モーダルを表示                         |
| `get_team_status`      | チームメンバーのステータスを取得                     |
| `show_team_status`     | チームメンバーのステータス一覧をモーダルで表示       |

## Workflows一覧

| ワークフロー名          | 説明                                             |
| ----------------------- | ------------------------------------------------ |
| `set_status_workflow`   | ステータス設定モーダルを表示してステータスを設定 |
| `quick_status_workflow` | プリセット選択モーダルから素早くステータスを設定 |
| `team_status_workflow`  | チームメンバーのステータス一覧をモーダルで表示   |

## Datastores一覧

| Datastore名        | 説明                                         |
| ------------------ | -------------------------------------------- |
| `status_presets`   | ユーザーのカスタムステータスプリセットを保存 |
| `status_history`   | ユーザーのステータス変更履歴を記録           |
| `status_schedules` | スケジュールベースのステータス設定を管理     |

## テスト

### テストの実行

```bash
# 全テストを実行
deno task test

# カバレッジを測定
deno test --allow-all --coverage=cov
deno coverage cov --html  # HTML形式で確認
```

### 新規関数作成時の要件

新しい関数を作成する際は、以下を必ず実施してください：

1. **JSDocコメント**: 関数の説明、パラメータ、戻り値、エラーを記載
2. **テストファイル**: 正常系と異常系のテストを作成
3. **テストカバレッジ**: 主要な処理パスをカバー

詳細は [`docs/testing-guide.md`](docs/testing-guide.md) を参照してください。

### テストの例

```typescript
/**
 * ユーザーのステータスを取得します
 *
 * @param client - Slack APIクライアント
 * @param userId - 取得対象のユーザーID
 * @returns ステータス情報
 * @throws {Error} ステータス取得に失敗した場合
 */
export async function getUserStatus(
  client: SlackAPIClient,
  userId: string,
): Promise<UserStatus> {
  // 実装
}
```

参考実装: [`functions/get_status/`](functions/get_status/)

## 多言語対応（I18n）

このプロジェクトは、英語と日本語の多言語対応をサポートしています。

### サポート言語

- **English (en)** - ベース言語
- **日本語 (ja)**

### 言語の切り替え

環境変数で言語を指定できます：

```bash
# 英語で実行（デフォルト）
export LOCALE=en
deno run your_script.ts

# 日本語で実行
export LOCALE=ja
deno run your_script.ts
```

### コード内での使用

```typescript
import { t } from "../../lib/i18n/mod.ts";

// シンプルなメッセージ
const message = t("errors.unknown_error");

// プレースホルダー付きメッセージ
const error = t("errors.user_not_found", { userId: "U12345678" });
```

詳細は [`docs/i18n-guide.md`](docs/i18n-guide.md) を参照してください。

## 例外処理

このプロジェクトでは、統一的な例外処理パターンを採用しています。

### 基本ルール

1. **API通信**: 必ず`response.ok`をチェック
2. **バリデーション**: 入力値の型チェック・空文字チェック必須
3. **エラーメッセージ**: 必ず`t()`関数で多言語化
4. **Slack関数**: try-catchで全体をラップ

### コード例

```typescript
import { t } from "../../lib/i18n/mod.ts";

// API通信の例外処理
const response = await client.users.profile.get({ user: userId });
if (!response.ok) {
  throw new Error(t("errors.api_call_failed", { error: response.error }));
}

// バリデーション
if (typeof input !== "string") {
  throw new Error(t("errors.invalid_type", {
    expected: "string",
    actual: typeof input,
  }));
}

// Slack関数
export default SlackFunction(MyFunction, async ({ inputs, client }) => {
  try {
    // 処理
    return { outputs: { result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Function error:", message);
    return { error: message };
  }
});
```

詳細は [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)
を参照してください。

## バリデーション（Zod）

このプロジェクトでは、型安全なバリデーションのために**Zod**を使用しています。

### 利用可能なスキーマ

`lib/validation/schemas.ts` に以下の共通スキーマが定義されています：

- **`userIdSchema`**: SlackユーザーID（`U0812GLUZD2` または `W1234567890` 形式）
- **`statusTextSchema`**: ステータステキスト（最大100文字）
- **`statusEmojiSchema`**: ステータス絵文字（`:emoji:` 形式）
- **`presetNameSchema`**: プリセット名（最大50文字）
- **`nonEmptyStringSchema`**: 空でない文字列

### 使用例

```typescript
import {
  statusTextSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";

// パース（エラー時は例外をthrow）
const userId = userIdSchema.parse(inputs.user_id);

// 安全なパース（エラー時は結果オブジェクトを返す）
const result = statusTextSchema.safeParse(inputs.status_text);
if (!result.success) {
  console.error(result.error);
}
```

### エラーメッセージの多言語化

Zodのバリデーションエラーメッセージは**動的に多言語化**されます。
`.superRefine()`を使用しているため、バリデーション実行時に現在のロケールに応じたエラーメッセージが表示されます：

```typescript
import { userIdSchema } from "../../lib/validation/schemas.ts";
import { setLocale } from "../../lib/i18n/mod.ts";

// 英語でバリデーション実行
setLocale("en");
const result1 = userIdSchema.safeParse("invalid");
// エラー: "User ID must start with 'U' or 'W' followed by uppercase alphanumeric characters"

// 同じスキーマインスタンスで日本語に切り替え
setLocale("ja");
const result2 = userIdSchema.safeParse("invalid");
// エラー: "ユーザーIDは'U'または'W'で始まり、その後に大文字の英数字が続く必要があります"
```

詳細は [`CONTRIBUTING.md`](CONTRIBUTING.md)
の「バリデーション（Zod）」セクションを参照してください。

## 開発環境のセットアップ

### Deno のインストール

#### macOS / Linux

```bash
# インストールスクリプトを使用
curl -fsSL https://deno.land/install.sh | sh

# Homebrewを使用（macOS）
brew install deno
```

#### Windows

```powershell
# PowerShellでインストール
irm https://deno.land/install.ps1 | iex

# Chocolateyを使用
choco install deno

# Scoopを使用
scoop install deno
```

#### 動作確認

```bash
deno --version
```

### Slack CLI のインストール

#### macOS / Linux

```bash
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login
```

#### Windows

**方法1: インストーラーを使用（推奨）**

1. [Slack CLI リリースページ](https://api.slack.com/automation/cli/install)
   から最新のインストーラーをダウンロード
2. ダウンロードした `.msi` ファイルを実行
3. PowerShellまたはコマンドプロンプトで `slack login` を実行

**方法2: WSL (Windows Subsystem for Linux) を使用**

```bash
# WSL内で実行
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login
```

#### 動作確認

```bash
slack version
slack login
```

### Git のインストール

#### macOS

```bash
# Xcodeコマンドラインツールと一緒にインストール
xcode-select --install

# Homebrewを使用
brew install git
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# CentOS/RHEL
sudo yum install git

# Fedora
sudo dnf install git
```

#### Windows

1. [Git for Windows](https://git-scm.com/download/win)
   から公式インストーラーをダウンロード
2. インストール時に「Git Bash」を含めることを推奨（スクリプト実行に必要）
3. インストール完了後、Git Bashまたは PowerShellで動作確認

```bash
git --version
```

### 推奨エディタ

- **[Visual Studio Code](https://code.visualstudio.com/)** -
  公式Deno拡張機能が利用可能
- **[Cursor](https://cursor.sh/)** - AI統合エディタ

#### Deno拡張機能の設定（VSCode/Cursor）

このプロジェクトには `.vscode/`
ディレクトリが用意されており、以下の設定が自動的に適用されます：

**含まれる設定ファイル：**

- `settings.json` - Deno LSP、エディタ、フォーマッター設定
- `extensions.json` - 推奨拡張機能のリスト
- `tasks.json` - Denoタスクのショートカット
- `launch.json` - デバッグ設定

**推奨拡張機能（自動でインストール推奨されます）：**

- `denoland.vscode-deno` - Deno公式拡張（必須）
- `github.copilot` - AI支援コーディング
- `eamodio.gitlens` - Git履歴可視化
- `usernamehw.errorlens` - エラー行内表示

初回起動時に「推奨拡張機能をインストールしますか？」と表示されたら、「すべてインストール」を選択してください。

## GitHub Secrets の設定

GitHub Actionsを使用するため、以下のシークレットを設定してください：

```
Settings → Secrets and variables → Actions
```

必須のシークレット：

- `SLACK_WEBHOOK` - Slack通知用のIncoming Webhook URL
- `ANTHROPIC_API_KEY` - Claude Code
  Action用のAPIキー（Issue自動実装・PRレビュー）

オプションのシークレット：

- `CODECOV_TOKEN` - コードカバレッジレポート用（プライベートリポジトリの場合）

## Claude Code Action（GitHub自動化）

このプロジェクトには、Claude Code を使ったGitHub自動化が組み込まれています。

### 機能一覧

| 機能                  | トリガー              | 説明                                            |
| --------------------- | --------------------- | ----------------------------------------------- |
| Issue → PR 自動実装   | `claude-ready` ラベル | Issueの内容を分析し、コードを実装してPRを作成   |
| @claude メンション    | コメントで `@claude`  | 質問への回答、コード実装、レビュー依頼など      |
| PR 自動コードレビュー | PR作成・更新時        | CLAUDE.md準拠、型安全性、i18n対応などをチェック |

### 使い方

#### Issue から自動でPRを作成

1. Issueを作成（実装してほしい内容を詳しく記述）
2. `claude-ready` ラベルを付与
3. Claudeが自動でブランチを作成し、実装してPRを提出

#### コメントでClaudeに依頼

IssueやPRのコメントで `@claude` とメンションすると、Claudeが応答します：

```
@claude このエラーの原因を調べてください
@claude テストを追加してください
@claude コードレビューをお願いします
```

### セットアップ

1. [Anthropic Console](https://console.anthropic.com/) でAPIキーを取得
2. リポジトリの Settings → Secrets → Actions に `ANTHROPIC_API_KEY` を追加
3. ワークフローは既に設定済み（追加設定不要）

詳細:
[anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)

## デプロイ手順

### ローカル開発

```bash
# ローカルで実行（開発環境）
slack run

# .envファイルは自動的に読み込まれます
```

### 本番環境へのデプロイ

本番環境へデプロイする場合は、以下の手順を実行してください：

```bash
# 1. slack.jsonにdeploymentsセクションを追加
# slack.jsonに以下を追加：
# "deployments": {
#   "production": {
#     "workspace": "your-workspace-name",
#     "token_alias": "production"
#   }
# }

# 2. テストと型チェックを完了させる
deno task test
deno task check

# 3. Slack CLI でデプロイ
slack deploy --env production

# 4. トリガーを作成
slack triggers create --trigger-file triggers/set_status_trigger.ts
```

**注意:**

- `deployments`セクションはデフォルトでは含まれていません（開発専用テンプレートのため）
- 本番デプロイ時に必要に応じて追加してください

## プロジェクト構成

```
slack-utils-user-status/
├── functions/         # Slack Functions（各関数にtest.tsを配置）
│   ├── set_status/        # ステータス設定
│   ├── get_status/        # ステータス取得
│   ├── clear_status/      # ステータスクリア
│   ├── create_preset/     # プリセット作成
│   ├── apply_preset/      # プリセット適用
│   ├── list_presets/      # プリセット一覧
│   ├── delete_preset/     # プリセット削除
│   ├── show_status_form/  # ステータス設定モーダル
│   ├── show_preset_selector/  # プリセット選択モーダル
│   ├── get_team_status/   # チームステータス取得
│   └── show_team_status/  # チームステータス表示
├── workflows/         # Slack Workflows
│   ├── set_status_workflow.ts     # ステータス設定
│   ├── quick_status_workflow.ts   # クイックステータス
│   └── team_status_workflow.ts    # チームステータス
├── triggers/          # Slack Triggers
├── datastores/        # Slack Datastores
│   ├── status_presets.ts      # プリセット保存
│   ├── status_history.ts      # 変更履歴
│   └── status_schedules.ts    # スケジュール設定
├── lib/               # 共通ライブラリ
│   ├── i18n/              # 多言語対応
│   ├── validation/        # Zodバリデーション
│   ├── types/             # TypeScript型定義
│   └── status/            # ステータス関連ユーティリティ
├── locales/           # 翻訳ファイル
│   ├── en.json            # 英語
│   └── ja.json            # 日本語
├── docs/              # ドキュメント
├── assets/            # アイコンなどの静的アセット
├── .github/           # CI/CD と Issue テンプレート
├── manifest.ts        # Slackアプリマニフェスト
├── deno.jsonc         # Deno設定
└── import_map.json    # インポートマップ
```

## 開発時の注意事項

### 改行コード

- **全ファイルでLF（Unix形式）に統一されています**
- `.gitattributes` で自動的に設定されます
- Windows環境では Git が自動変換するため、特別な設定は不要です

### エディタ設定

- **Deno**: `deno.jsonc` で設定を管理（フォーマッター、リンターなど）
- **VSCode/Cursor**: Deno拡張機能を有効化してください

### 自動生成ファイル

- **CHANGELOG.md**: release-please
  が自動生成するため、フォーマットチェックから除外されています
- 手動で編集しないでください（自動更新されます）

### OS固有の注意点

#### Windows

- **Git Bash の使用**: スクリプト実行時は Git Bash または WSL を使用
- **改行コード**: `.gitattributes` が自動的にLFに変換します
- **パス区切り**: スラッシュ（`/`）を使用（バックスラッシュ不要）

#### macOS

- **Xcode Command Line Tools**: Gitインストールに必要
- **Homebrew**: 各種ツールのインストールに推奨

#### Linux

- **権限**: スクリプト実行時に `chmod +x` が必要な場合があります
- **パッケージマネージャー**: ディストリビューションに応じて選択

## Git Hooks による品質チェック（推奨）

Git hooksを設定すると、commit/push時に自動的に品質チェックが実行されます。

### セットアップ

#### macOS / Linux

```bash
bash scripts/setup-git-hooks.sh
```

#### Windows

**PowerShellを使用:**

```powershell
# Git Bashがインストールされている場合
bash scripts/setup-git-hooks.sh

# または、WSL内で実行
wsl bash scripts/setup-git-hooks.sh
```

**Git Bashを使用:**

```bash
bash scripts/setup-git-hooks.sh
```

### 自動実行される内容

**pre-commit（コミット前）:**

- フォーマットチェック
- リントチェック

**pre-push（プッシュ前）:**

- フォーマットチェック
- リントチェック
- テスト実行

### メリット

- CI/CDのエラーを事前に防止
- ローカルで即座にフィードバック
- 品質の自動保証

### 緊急時のスキップ（非推奨）

```bash
git commit --no-verify  # pre-commitをスキップ
git push --no-verify    # pre-pushをスキップ
```

詳細は `docs/git-hooks-setup.md` を参照してください。

## Contributing

貢献を歓迎します！詳細は [`CONTRIBUTING.md`](CONTRIBUTING.md)
を参照してください。

## ライセンス

本プロジェクトは MIT ライセンスで提供されています。詳細は [`LICENSE`](LICENSE)
を参照してください。
