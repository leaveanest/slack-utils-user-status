# Claude Code 命令文集

フォルダー設置後、各フェーズで以下の命令をClaude Codeに渡してください。

---

## 共通の前提条件

Claude Codeを実行する前に、以下を確認してください：

1. `docs/user-status-spec.md` が配置されている
2. `docs/user-status-impl-plan.md` が配置されている
3. `CLAUDE.md` にuser-status固有ルールが追記されている

---

## Phase 1: 基盤構築

### 命令文

```
## タスク: user-status Phase 1 - 基盤構築

### 事前準備
以下のドキュメントを必ず読んでから作業を開始してください：
- `docs/user-status-spec.md` - 機能仕様書
- `docs/user-status-impl-plan.md` - 実装計画
- `CLAUDE.md` - コーディング規約

### ブランチ
`feature/user-status-phase1-foundation`

### 実装内容

#### 1. Datastore定義
以下のファイルを作成：
- `datastores/status_presets.ts`
- `datastores/status_schedules.ts`
- `datastores/status_history.ts`

仕様書の「3. データモデル」セクションを参照してください。

#### 2. 型定義
`lib/types/status.ts` を作成：
- StatusPreset
- UserStatus
- StatusUpdateResult

#### 3. バリデーションスキーマ
`lib/validation/schemas.ts` に以下を追加：
- statusTextSchema
- statusEmojiSchema
- expirationMinutesSchema
- presetNameSchema
- setStatusInputSchema
- createPresetInputSchema

テストファイル `lib/validation/schemas.test.ts` も更新してください。

#### 4. i18nキー追加
`locales/en.json` と `locales/ja.json` に `status` セクションを追加。
仕様書の「8. 多言語対応」を参照。

### 完了条件
- [ ] `deno task fmt` が成功
- [ ] `deno task lint` が成功
- [ ] `deno task check` が成功
- [ ] `deno task test` が成功

### コミットメッセージ
feat: user-status Phase 1 - Datastore、型、バリデーション追加
```

---

## Phase 2: コア機能

### 命令文

```
## タスク: user-status Phase 2 - コア機能

### 事前準備
以下のドキュメントを確認：
- `docs/user-status-spec.md` - 「5. Functions設計」セクション
- `CLAUDE.md` - コーディング規約

### ブランチ
`feature/user-status-phase2-core`

### 実装内容

#### 1. set_status Function
`functions/set_status/mod.ts` と `functions/set_status/test.ts` を作成。

入力:
- user_id: Slack User ID
- status_text: ステータステキスト（最大100文字）
- status_emoji: 絵文字（:emoji: 形式）
- expiration_minutes: 有効期限（分、0=無期限）

出力:
- success: boolean
- previous_status_text: string
- previous_status_emoji: string
- error?: string

#### 2. clear_status Function
`functions/clear_status/mod.ts` と `functions/clear_status/test.ts` を作成。

ステータスをクリア（空文字に設定）する機能。

#### 3. get_status Function
`functions/get_status/mod.ts` と `functions/get_status/test.ts` を作成。

指定ユーザーの現在のステータスを取得。

### 必須事項
- 全てのFunctionにJSDocコメントを追加
- Zodバリデーションを使用
- response.ok をチェック
- エラーメッセージはi18n化
- manifest.tsにFunctionを登録

### 完了条件
- [ ] `deno task cursor-ci` が成功

### コミットメッセージ
feat: user-status Phase 2 - set_status, clear_status, get_status 実装
```

---

## Phase 3: プリセット機能

### 命令文

```
## タスク: user-status Phase 3 - プリセット機能

### 事前準備
- `docs/user-status-spec.md` を確認
- Phase 1, 2 が完了していること

### ブランチ
`feature/user-status-phase3-presets`

### 実装内容

#### 1. list_presets Function
`functions/list_presets/mod.ts` を作成。

ユーザーのプリセット一覧と共有プリセットを取得。
Datastore queryを使用。

#### 2. create_preset Function
`functions/create_preset/mod.ts` を作成。

新しいプリセットを作成してDatastoreに保存。
- id: crypto.randomUUID()
- created_at, updated_at: ISO 8601形式

#### 3. delete_preset Function
`functions/delete_preset/mod.ts` を作成。

指定されたプリセットを削除。
所有者チェックを行う。

#### 4. apply_preset Function
`functions/apply_preset/mod.ts` を作成。

プリセットを取得してステータスに適用。
set_status の内部ロジックを再利用。

### Datastore操作パターン

```typescript
// Query
const result = await client.apps.datastore.query({
  datastore: "status_presets",
  expression: "#user_id = :user_id",
  expression_attributes: { "#user_id": "user_id" },
  expression_values: { ":user_id": userId },
});

// Put
await client.apps.datastore.put({
  datastore: "status_presets",
  item: { ... },
});

// Delete
await client.apps.datastore.delete({
  datastore: "status_presets",
  id: presetId,
});
```

### 完了条件
- [ ] 全Functionにテストがある
- [ ] `deno task cursor-ci` が成功

### コミットメッセージ
feat: user-status Phase 3 - プリセットCRUD実装
```

---

## Phase 4: ワークフロー

### 命令文

```
## タスク: user-status Phase 4 - ワークフロー

### 事前準備
- `docs/user-status-spec.md` - 「6. Workflows設計」「7. UI/UX設計」を確認
- `docs/modal-patterns.md` を確認

### ブランチ
`feature/user-status-phase4-workflows`

### 実装内容

#### 1. show_status_form Function
`functions/show_status_form/mod.ts` を作成。

モーダルでステータス設定フォームを表示：
- Status Text入力
- Status Emoji入力
- 有効期限選択（static_select）
- Save as preset チェックボックス
- Preset name入力（条件付き表示）

ViewSubmissionHandlerでフォーム送信を処理。

#### 2. show_preset_selector Function
`functions/show_preset_selector/mod.ts` を作成。

プリセット選択モーダルを表示：
- ユーザーのプリセット一覧
- 共有プリセット一覧
- 各プリセットにApplyボタン

BlockActionsHandlerでボタンクリックを処理。

#### 3. Workflows
- `workflows/set_status_workflow.ts`
- `workflows/quick_status_workflow.ts`
- `workflows/manage_presets_workflow.ts`

#### 4. Triggers
- `triggers/set_status_trigger.ts` - Link trigger
- `triggers/quick_status_trigger.ts` - Shortcut trigger

### モーダル実装の注意点
- trigger_id は3秒以内に使用
- まずローディングモーダルを表示してからデータ取得
- private_metadata でコンテキストを保持

### 完了条件
- [ ] モーダルが正しく表示される
- [ ] `deno task cursor-ci` が成功

### コミットメッセージ
feat: user-status Phase 4 - ワークフローとモーダルUI実装
```

---

## Phase 5: 追加機能

### 命令文

```
## タスク: user-status Phase 5 - 追加機能

### ブランチ
`feature/user-status-phase5-advanced`

### 実装内容

#### 1. get_team_status Function
`functions/get_team_status/mod.ts` を作成。

チームメンバーのステータス一覧を取得：
1. users.list でユーザー一覧取得
2. 各ユーザーの users.profile.get でステータス取得
3. 結果をフォーマットして返す

ページネーション対応。

#### 2. TeamStatusWorkflow
`workflows/team_status_workflow.ts` を作成。

チームステータス一覧を表示するワークフロー。

#### 3. 履歴記録（オプション）
set_status, apply_preset 実行時に status_history Datastoreに記録。

### 完了条件
- [ ] チームステータスが正しく表示される
- [ ] `deno task cursor-ci` が成功

### コミットメッセージ
feat: user-status Phase 5 - チームステータス機能実装
```

---

## 全体完了後

```
## タスク: user-status 最終確認

### 確認事項
1. 全てのFunctionが manifest.ts に登録されている
2. 全てのWorkflowが manifest.ts に登録されている
3. botScopes と userScopes が正しく設定されている
4. README.md にuser-status機能の説明を追加
5. 全テストがパス

### コマンド
deno task cursor-ci
slack manifest validate

### 動作確認
slack run でローカル実行し、以下を確認：
- ステータス設定が動作する
- プリセット保存/適用が動作する
- モーダルが正しく表示される
```

---

## トラブルシューティング

### よくあるエラー

#### 1. users.profile.set が失敗する
- userScopes に `users.profile:write` が必要
- ユーザー自身のステータスしか変更できない

#### 2. Datastore query が空を返す
- expression_attributes と expression_values の対応を確認
- `#` プレフィックスと `:` プレフィックスを正しく使用

#### 3. モーダルがタイムアウト
- trigger_id は3秒以内に使用
- まずローディングモーダルを表示

#### 4. i18n キーが見つからない
- locales/en.json にキーが存在するか確認
- ドット区切りのパスが正しいか確認
