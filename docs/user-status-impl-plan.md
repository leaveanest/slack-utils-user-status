# slack-utils-user-status 実装計画

## 概要

このドキュメントは、Claude
Codeを使用してslack-utils-user-statusを段階的に実装するための計画書です。

---

## フェーズ構成

| フェーズ | 名称           | 主な成果物                                     | 見積もり |
| -------- | -------------- | ---------------------------------------------- | -------- |
| Phase 1  | 基盤構築       | Datastore、型定義、バリデーションスキーマ      | 1-2時間  |
| Phase 2  | コア機能       | set_status, clear_status, get_status Functions | 2-3時間  |
| Phase 3  | プリセット機能 | プリセットCRUD、適用機能                       | 2-3時間  |
| Phase 4  | ワークフロー   | Workflows、Triggers、モーダルUI                | 2-3時間  |
| Phase 5  | 追加機能       | チームステータス、履歴                         | 2-3時間  |

---

## Phase 1: 基盤構築

### 目標

Datastore、型定義、バリデーションスキーマを構築します。

### 作業内容

**ブランチ**: `feature/user-status-phase1-foundation`

#### 1.1 Datastore定義

```bash
# 作成するファイル
datastores/
├── status_presets.ts
├── status_schedules.ts
└── status_history.ts
```

#### 1.2 型定義

```bash
lib/types/
└── status.ts
```

#### 1.3 バリデーションスキーマ

```bash
lib/validation/
└── status_schemas.ts  # または既存のschemas.tsに追加
```

#### 1.4 i18nキー追加

`locales/en.json` と `locales/ja.json` に `status` セクションを追加

### 完了条件

- [ ] Datastore定義が完了
- [ ] 型定義が完了
- [ ] Zodスキーマが完了しテストがパス
- [ ] i18nキーが追加済み
- [ ] `deno task cursor-ci` が成功

### PRタイトル

```
feat: user-status Phase 1 - 基盤構築（Datastore、型、バリデーション）
```

---

## Phase 2: コア機能

### 目標

ステータスの設定、クリア、取得の基本機能を実装します。

### 作業内容

**ブランチ**: `feature/user-status-phase2-core`

#### 2.1 set_status Function

```bash
functions/set_status/
├── mod.ts
└── test.ts
```

#### 2.2 clear_status Function

```bash
functions/clear_status/
├── mod.ts
└── test.ts
```

#### 2.3 get_status Function

```bash
functions/get_status/
├── mod.ts
└── test.ts
```

### 完了条件

- [ ] 全てのFunctionにJSDocコメントがある
- [ ] 全てのFunctionにテストがある
- [ ] manifest.tsにFunctionが登録されている
- [ ] `deno task cursor-ci` が成功

### PRタイトル

```
feat: user-status Phase 2 - ステータス設定/クリア/取得機能
```

---

## Phase 3: プリセット機能

### 目標

ステータスプリセットのCRUD操作と適用機能を実装します。

### 作業内容

**ブランチ**: `feature/user-status-phase3-presets`

#### 3.1 list_presets Function

```bash
functions/list_presets/
├── mod.ts
└── test.ts
```

#### 3.2 create_preset Function

```bash
functions/create_preset/
├── mod.ts
└── test.ts
```

#### 3.3 delete_preset Function

```bash
functions/delete_preset/
├── mod.ts
└── test.ts
```

#### 3.4 apply_preset Function

```bash
functions/apply_preset/
├── mod.ts
└── test.ts
```

### 完了条件

- [ ] 全てのFunctionにJSDocコメントがある
- [ ] 全てのFunctionにテストがある
- [ ] Datastore操作が正しく動作する
- [ ] `deno task cursor-ci` が成功

### PRタイトル

```
feat: user-status Phase 3 - プリセットCRUD機能
```

---

## Phase 4: ワークフロー

### 目標

ユーザーインターフェース（モーダル）とワークフローを実装します。

### 作業内容

**ブランチ**: `feature/user-status-phase4-workflows`

#### 4.1 show_status_form Function

```bash
functions/show_status_form/
├── mod.ts
└── test.ts
```

#### 4.2 show_preset_selector Function

```bash
functions/show_preset_selector/
├── mod.ts
└── test.ts
```

#### 4.3 Workflows

```bash
workflows/
├── set_status_workflow.ts
├── quick_status_workflow.ts
└── manage_presets_workflow.ts
```

#### 4.4 Triggers

```bash
triggers/
├── set_status_trigger.ts
├── quick_status_trigger.ts
└── manage_presets_trigger.ts
```

### 完了条件

- [ ] モーダルが正しく表示される
- [ ] フォーム送信が正しく処理される
- [ ] ワークフローが正しく動作する
- [ ] `deno task cursor-ci` が成功

### PRタイトル

```
feat: user-status Phase 4 - ワークフローとモーダルUI
```

---

## Phase 5: 追加機能

### 目標

チームステータス表示と履歴機能を実装します。

### 作業内容

**ブランチ**: `feature/user-status-phase5-advanced`

#### 5.1 get_team_status Function

```bash
functions/get_team_status/
├── mod.ts
└── test.ts
```

#### 5.2 TeamStatusWorkflow

```bash
workflows/
└── team_status_workflow.ts

triggers/
└── team_status_trigger.ts
```

### 完了条件

- [ ] チームステータスが正しく表示される
- [ ] 履歴が記録される
- [ ] `deno task cursor-ci` が成功

### PRタイトル

```
feat: user-status Phase 5 - チームステータスと履歴機能
```

---

## Git運用ルール

### ブランチ命名規則

```
feature/user-status-phase{N}-{description}
例: feature/user-status-phase1-foundation
```

### コミットメッセージ形式

```
{type}: {description}

例:
feat: add set_status function with validation
fix: handle empty emoji in status form
test: add integration tests for preset workflow
```

---

## 変更履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2026-01-22 | 初版作成 |
