# slack-utils-user-status 仕様書

## 1. 概要

**slack-utils-user-status** は Slack ユーザーステータス管理のためのワークフローアプリケーションです。

### 1.1 プロジェクト目的

- ユーザーステータスの効率的な管理と自動化
- プリセットステータスによる素早い切り替え
- スケジュールベースの自動ステータス変更
- チーム全体のステータス可視化

### 1.2 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript (Deno v2互換) |
| SDK | Slack Deno SDK v2.15.1+ |
| デプロイ | Slack CLI |
| バリデーション | Zod |
| 多言語対応 | カスタムi18nライブラリ |
| テスト | Deno標準テストランナー |

---

## 2. 機能一覧

### 2.1 コア機能

| 機能ID | 機能名 | 説明 | 優先度 |
|--------|--------|------|--------|
| F-001 | ステータス設定 | カスタム絵文字とテキストでステータスを設定 | 高 |
| F-002 | ステータスクリア | 現在のステータスをクリア | 高 |
| F-003 | プリセット管理 | よく使うステータスをプリセットとして保存・利用 | 高 |
| F-004 | クイック切替 | プリセットからワンクリックでステータス変更 | 高 |
| F-005 | 有効期限設定 | ステータスの自動クリア時刻を設定 | 中 |
| F-006 | チームステータス | チームメンバーのステータス一覧表示 | 中 |
| F-007 | スケジュール設定 | 定期的なステータス変更をスケジュール | 低 |
| F-008 | ステータス履歴 | 過去のステータス変更履歴を表示 | 低 |

### 2.2 管理機能

| 機能ID | 機能名 | 説明 | 優先度 |
|--------|--------|------|--------|
| A-001 | 組織プリセット | 組織全体で共有するプリセットの管理 | 中 |
| A-002 | 一括変更 | 複数ユーザーのステータスを一括変更（管理者向け） | 低 |

---

## 3. データモデル

### 3.1 Datastore定義

#### StatusPreset（ステータスプリセット）

```typescript
const StatusPresetDatastore = DefineDatastore({
  name: "status_presets",
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string },           // UUID
    user_id: { type: Schema.types.string },      // Slack User ID
    name: { type: Schema.types.string },         // プリセット名
    status_text: { type: Schema.types.string },  // ステータステキスト
    status_emoji: { type: Schema.types.string }, // ステータス絵文字
    duration_minutes: { type: Schema.types.integer }, // デフォルト有効期限（分）
    is_shared: { type: Schema.types.boolean },   // 組織共有フラグ
    sort_order: { type: Schema.types.integer },  // 表示順
    created_at: { type: Schema.types.string },   // ISO 8601
    updated_at: { type: Schema.types.string },   // ISO 8601
  },
});
```

#### StatusSchedule（ステータススケジュール）

```typescript
const StatusScheduleDatastore = DefineDatastore({
  name: "status_schedules",
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string },           // UUID
    user_id: { type: Schema.types.string },      // Slack User ID
    preset_id: { type: Schema.types.string },    // 適用するプリセットID
    cron_expression: { type: Schema.types.string }, // Cron式
    timezone: { type: Schema.types.string },     // タイムゾーン
    is_active: { type: Schema.types.boolean },   // 有効フラグ
    next_run_at: { type: Schema.types.string },  // 次回実行時刻
    created_at: { type: Schema.types.string },
    updated_at: { type: Schema.types.string },
  },
});
```

#### StatusHistory（ステータス履歴）

```typescript
const StatusHistoryDatastore = DefineDatastore({
  name: "status_history",
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string },
    user_id: { type: Schema.types.string },
    status_text: { type: Schema.types.string },
    status_emoji: { type: Schema.types.string },
    expiration: { type: Schema.types.integer },  // Unix timestamp
    changed_at: { type: Schema.types.string },   // ISO 8601
    source: { type: Schema.types.string },       // 変更元: "manual", "preset", "schedule"
  },
});
```

### 3.2 TypeScript型定義

```typescript
// lib/types/status.ts

export interface StatusPreset {
  id: string;
  user_id: string;
  name: string;
  status_text: string;
  status_emoji: string;
  duration_minutes: number | null;
  is_shared: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserStatus {
  status_text: string;
  status_emoji: string;
  status_expiration: number;  // Unix timestamp, 0 = no expiration
}

export interface StatusUpdateResult {
  success: boolean;
  previous_status: UserStatus | null;
  new_status: UserStatus;
  error?: string;
}
```

---

## 4. API設計

### 4.1 使用するSlack API

| API | 用途 | スコープ |
|-----|------|----------|
| `users.profile.get` | ステータス取得 | `users.profile:read` |
| `users.profile.set` | ステータス設定 | `users.profile:write` |
| `users.list` | ユーザー一覧取得 | `users:read` |
| `emoji.list` | カスタム絵文字一覧 | `emoji:read` |

### 4.2 ステータス設定API詳細

```typescript
// users.profile.set のペイロード
interface ProfileSetPayload {
  profile: {
    status_text: string;      // 最大100文字
    status_emoji: string;     // :emoji: 形式
    status_expiration: number; // Unix timestamp, 0 で無期限
  };
  user?: string;  // 管理者が他ユーザーを変更する場合
}

// レスポンス
interface ProfileSetResponse {
  ok: boolean;
  profile?: {
    status_text: string;
    status_emoji: string;
    status_expiration: number;
  };
  error?: string;
}
```

---

## 5. Functions設計

### 5.1 Function一覧

| Function ID | 名前 | 説明 |
|-------------|------|------|
| `set_status` | ステータス設定 | ステータスを設定（絵文字、テキスト、有効期限） |
| `clear_status` | ステータスクリア | 現在のステータスをクリア |
| `get_status` | ステータス取得 | ユーザーの現在のステータスを取得 |
| `list_presets` | プリセット一覧 | ユーザーのプリセット一覧を取得 |
| `create_preset` | プリセット作成 | 新しいプリセットを作成 |
| `delete_preset` | プリセット削除 | プリセットを削除 |
| `apply_preset` | プリセット適用 | プリセットをステータスとして適用 |
| `show_status_form` | フォーム表示 | ステータス設定モーダルを表示 |
| `show_preset_selector` | プリセット選択 | プリセット選択モーダルを表示 |
| `get_team_status` | チームステータス | チームメンバーのステータス一覧を取得 |

### 5.2 Function詳細設計

#### set_status

```typescript
const SetStatusDefinition = DefineFunction({
  callback_id: "set_status",
  title: "Set User Status",
  description: "Set user status with emoji, text, and optional expiration",
  source_file: "functions/set_status/mod.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "Target user ID",
      },
      status_text: {
        type: Schema.types.string,
        description: "Status text (max 100 chars)",
      },
      status_emoji: {
        type: Schema.types.string,
        description: "Status emoji in :emoji: format",
      },
      expiration_minutes: {
        type: Schema.types.integer,
        description: "Minutes until expiration (0 = no expiration)",
      },
    },
    required: ["user_id", "status_text", "status_emoji"],
  },
  output_parameters: {
    properties: {
      success: { type: Schema.types.boolean },
      previous_status_text: { type: Schema.types.string },
      previous_status_emoji: { type: Schema.types.string },
      error: { type: Schema.types.string },
    },
    required: ["success"],
  },
});
```

#### show_status_form

```typescript
const ShowStatusFormDefinition = DefineFunction({
  callback_id: "show_status_form",
  title: "Show Status Form",
  description: "Display modal for status configuration",
  source_file: "functions/show_status_form/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      user_id: {
        type: Schema.slack.types.user_id,
      },
    },
    required: ["interactivity", "user_id"],
  },
  output_parameters: {
    properties: {
      status_text: { type: Schema.types.string },
      status_emoji: { type: Schema.types.string },
      expiration_minutes: { type: Schema.types.integer },
      preset_name: { type: Schema.types.string },
      save_as_preset: { type: Schema.types.boolean },
    },
    required: [],
  },
});
```

---

## 6. Workflows設計

### 6.1 Workflow一覧

| Workflow ID | 名前 | トリガー |
|-------------|------|----------|
| `SetStatusWorkflow` | ステータス設定 | Link trigger / Shortcut |
| `QuickStatusWorkflow` | クイックステータス | Shortcut |
| `TeamStatusWorkflow` | チームステータス | Link trigger |
| `ManagePresetsWorkflow` | プリセット管理 | Link trigger |

### 6.2 SetStatusWorkflow

```typescript
const SetStatusWorkflow = DefineWorkflow({
  callback_id: "set_status_workflow",
  title: "Set Status",
  description: "Set your Slack status with custom emoji and text",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      user_id: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity", "user_id"],
  },
});

// Step 1: フォーム表示
const formStep = SetStatusWorkflow.addStep(ShowStatusFormDefinition, {
  interactivity: SetStatusWorkflow.inputs.interactivity,
  user_id: SetStatusWorkflow.inputs.user_id,
});

// Step 2: ステータス設定
SetStatusWorkflow.addStep(SetStatusDefinition, {
  user_id: SetStatusWorkflow.inputs.user_id,
  status_text: formStep.outputs.status_text,
  status_emoji: formStep.outputs.status_emoji,
  expiration_minutes: formStep.outputs.expiration_minutes,
});
```

### 6.3 QuickStatusWorkflow

```typescript
const QuickStatusWorkflow = DefineWorkflow({
  callback_id: "quick_status_workflow",
  title: "Quick Status",
  description: "Quickly set status from presets",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      user_id: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity", "user_id"],
  },
});

// Step 1: プリセット選択モーダル表示
const selectorStep = QuickStatusWorkflow.addStep(ShowPresetSelectorDefinition, {
  interactivity: QuickStatusWorkflow.inputs.interactivity,
  user_id: QuickStatusWorkflow.inputs.user_id,
});

// Step 2: 選択されたプリセットを適用
QuickStatusWorkflow.addStep(ApplyPresetDefinition, {
  user_id: QuickStatusWorkflow.inputs.user_id,
  preset_id: selectorStep.outputs.selected_preset_id,
});
```

---

## 7. UI/UX設計

### 7.1 モーダル: ステータス設定フォーム

```
┌─────────────────────────────────────────────────┐
│ Set Your Status                            [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Status Text                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ In a meeting                                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Status Emoji                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ :calendar:                              [▼] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Clear after                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ 1 hour                                  [▼] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ☐ Save as preset                               │
│                                                 │
│ Preset name (if saving)                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Meeting                                     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│                      [Cancel]  [Set Status]     │
└─────────────────────────────────────────────────┘
```

### 7.2 モーダル: プリセット選択

```
┌─────────────────────────────────────────────────┐
│ Quick Status                               [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Your Presets                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📅 Meeting        "In a meeting"      [Apply]│ │
│ │ 🏠 WFH            "Working from home" [Apply]│ │
│ │ 🍽️ Lunch          "At lunch"         [Apply]│ │
│ │ 🏃 BRB            "Be right back"    [Apply]│ │
│ │ ❌ Clear Status                      [Apply]│ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Shared Presets                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎉 Company Event  "At company event" [Apply]│ │
│ │ 🔧 Maintenance    "System maint..."  [Apply]│ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│           [Manage Presets]        [Cancel]      │
└─────────────────────────────────────────────────┘
```

### 7.3 有効期限オプション

```typescript
const EXPIRATION_OPTIONS = [
  { text: "Don't clear", value: "0" },
  { text: "30 minutes", value: "30" },
  { text: "1 hour", value: "60" },
  { text: "2 hours", value: "120" },
  { text: "4 hours", value: "240" },
  { text: "Today", value: "today" },
  { text: "This week", value: "week" },
  { text: "Custom...", value: "custom" },
];
```

---

## 8. 多言語対応（i18n）

### 8.1 対応言語

- 英語 (en) - デフォルト
- 日本語 (ja)

### 8.2 ローカライゼーションキー構造

```json
// locales/en.json
{
  "status": {
    "app": {
      "name": "Status Manager",
      "description": "Manage your Slack status efficiently"
    },
    "functions": {
      "set_status": {
        "title": "Set Status",
        "description": "Set your Slack status"
      }
    },
    "form": {
      "status_text": {
        "label": "Status Text",
        "placeholder": "What's your status?"
      },
      "status_emoji": {
        "label": "Status Emoji",
        "placeholder": "Select an emoji"
      },
      "expiration": {
        "label": "Clear after",
        "options": {
          "no_expiration": "Don't clear",
          "30_minutes": "30 minutes",
          "1_hour": "1 hour"
        }
      },
      "save_preset": {
        "label": "Save as preset",
        "name_label": "Preset name"
      }
    },
    "messages": {
      "status_updated": "Status updated successfully!",
      "status_cleared": "Status cleared.",
      "preset_saved": "Preset \"{name}\" saved.",
      "preset_deleted": "Preset deleted."
    },
    "errors": {
      "api_call_failed": "API call failed: {error}",
      "status_text_too_long": "Status text must be 100 characters or less",
      "invalid_emoji": "Invalid emoji format. Use :emoji: format",
      "preset_not_found": "Preset not found"
    }
  }
}
```

---

## 9. バリデーション（Zod）

### 9.1 スキーマ定義

```typescript
// lib/validation/schemas.ts に追加

// ステータステキスト
export const statusTextSchema = z.string()
  .max(100, "Status text must be 100 characters or less")
  .transform(text => text.trim());

// ステータス絵文字
export const statusEmojiSchema = z.string()
  .regex(/^:[a-z0-9_+-]+:$/, "Invalid emoji format. Use :emoji: format")
  .or(z.literal(""));

// 有効期限（分）
export const expirationMinutesSchema = z.number()
  .int()
  .min(0)
  .max(525600);  // 最大1年

// プリセット名
export const presetNameSchema = z.string()
  .min(1, "Preset name is required")
  .max(50, "Preset name must be 50 characters or less")
  .transform(name => name.trim());

// ステータス設定入力
export const setStatusInputSchema = z.object({
  user_id: userIdSchema,
  status_text: statusTextSchema,
  status_emoji: statusEmojiSchema,
  expiration_minutes: expirationMinutesSchema.optional().default(0),
});

// プリセット作成入力
export const createPresetInputSchema = z.object({
  user_id: userIdSchema,
  name: presetNameSchema,
  status_text: statusTextSchema,
  status_emoji: statusEmojiSchema,
  duration_minutes: expirationMinutesSchema.nullable().default(null),
  is_shared: z.boolean().default(false),
});
```

---

## 10. エラーハンドリング

### 10.1 エラーカテゴリ

| カテゴリ | 説明 | 対処 |
|----------|------|------|
| ValidationError | 入力値の検証エラー | ユーザーにエラーメッセージを表示 |
| ApiError | Slack API呼び出しエラー | リトライまたはエラーメッセージ表示 |
| DatastoreError | Datastore操作エラー | ログ記録、エラーメッセージ表示 |
| PermissionError | 権限不足エラー | 権限要求のガイダンス表示 |

---

## 11. テスト戦略

### 11.1 テストカテゴリ

| カテゴリ | 対象 | カバレッジ目標 |
|----------|------|----------------|
| Unit Tests | 個別関数、ヘルパー | 80% |
| Integration Tests | Workflow全体の流れ | 主要パス |
| Validation Tests | Zodスキーマ | 正常系・異常系 |
| Mock Tests | Slack API呼び出し | 全API |

---

## 12. ディレクトリ構成

```
slack-utils-user-status/
├── datastores/
│   ├── status_presets.ts
│   ├── status_schedules.ts
│   └── status_history.ts
├── functions/
│   ├── set_status/
│   ├── clear_status/
│   ├── get_status/
│   ├── list_presets/
│   ├── create_preset/
│   ├── delete_preset/
│   ├── apply_preset/
│   ├── show_status_form/
│   ├── show_preset_selector/
│   └── get_team_status/
├── workflows/
│   ├── set_status_workflow.ts
│   ├── quick_status_workflow.ts
│   ├── team_status_workflow.ts
│   └── manage_presets_workflow.ts
├── triggers/
│   ├── set_status_trigger.ts
│   ├── quick_status_trigger.ts
│   └── team_status_trigger.ts
├── lib/
│   ├── types/
│   │   └── status.ts
│   └── validation/
│       └── status_schemas.ts
├── docs/
│   ├── user-status-spec.md
│   └── user-status-impl-plan.md
└── manifest.ts
```

---

## 13. manifest.ts への追加

```typescript
// Datastores
import { StatusPresetDatastore } from "./datastores/status_presets.ts";
import { StatusScheduleDatastore } from "./datastores/status_schedules.ts";
import { StatusHistoryDatastore } from "./datastores/status_history.ts";

// Functions
import { SetStatusDefinition } from "./functions/set_status/mod.ts";
import { ClearStatusDefinition } from "./functions/clear_status/mod.ts";
import { GetStatusDefinition } from "./functions/get_status/mod.ts";
import { ListPresetsDefinition } from "./functions/list_presets/mod.ts";
import { CreatePresetDefinition } from "./functions/create_preset/mod.ts";
import { DeletePresetDefinition } from "./functions/delete_preset/mod.ts";
import { ApplyPresetDefinition } from "./functions/apply_preset/mod.ts";
import { ShowStatusFormDefinition } from "./functions/show_status_form/mod.ts";
import { ShowPresetSelectorDefinition } from "./functions/show_preset_selector/mod.ts";
import { GetTeamStatusDefinition } from "./functions/get_team_status/mod.ts";

// Workflows
import { SetStatusWorkflow } from "./workflows/set_status_workflow.ts";
import { QuickStatusWorkflow } from "./workflows/quick_status_workflow.ts";
import { TeamStatusWorkflow } from "./workflows/team_status_workflow.ts";
import { ManagePresetsWorkflow } from "./workflows/manage_presets_workflow.ts";

// manifestに追加
datastores: [
  StatusPresetDatastore,
  StatusScheduleDatastore,
  StatusHistoryDatastore,
],
functions: [
  SetStatusDefinition,
  ClearStatusDefinition,
  GetStatusDefinition,
  ListPresetsDefinition,
  CreatePresetDefinition,
  DeletePresetDefinition,
  ApplyPresetDefinition,
  ShowStatusFormDefinition,
  ShowPresetSelectorDefinition,
  GetTeamStatusDefinition,
],
workflows: [
  SetStatusWorkflow,
  QuickStatusWorkflow,
  TeamStatusWorkflow,
  ManagePresetsWorkflow,
],
botScopes: [
  // 既存スコープに追加
  "users:read",
  "users.profile:read",
  "emoji:read",
],
userScopes: [
  "users.profile:write",
  "users.profile:read",
],
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0.0 | 2026-01-22 | 初版作成 |
