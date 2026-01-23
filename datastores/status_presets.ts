/**
 * ステータスプリセット用Datastore定義
 * ユーザーのカスタムステータスプリセットを保存
 */
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * ステータスプリセットDatastore
 *
 * @description ユーザーが保存したステータスプリセットを管理
 *
 * @example
 * ```typescript
 * // プリセットを保存
 * await client.apps.datastore.put({
 *   datastore: "status_presets",
 *   item: {
 *     id: "preset-001",
 *     user_id: "U12345678",
 *     name: "In a meeting",
 *     status_text: "In a meeting",
 *     status_emoji: ":calendar:",
 *     duration_minutes: 60,
 *     is_shared: false,
 *     sort_order: 1,
 *     created_at: new Date().toISOString(),
 *     updated_at: new Date().toISOString(),
 *   },
 * });
 * ```
 */
export const StatusPresetDatastore = DefineDatastore({
  name: "status_presets",
  primary_key: "id",
  attributes: {
    /** プリセットの一意識別子 */
    id: { type: Schema.types.string },
    /** プリセットを所有するユーザーID */
    user_id: { type: Schema.types.string },
    /** プリセット名 */
    name: { type: Schema.types.string },
    /** ステータステキスト */
    status_text: { type: Schema.types.string },
    /** ステータス絵文字（:emoji: 形式） */
    status_emoji: { type: Schema.types.string },
    /** ステータスの持続時間（分）、nullまたは0で無期限 */
    duration_minutes: { type: Schema.types.integer },
    /** 他のユーザーと共有するかどうか */
    is_shared: { type: Schema.types.boolean },
    /** 表示順序 */
    sort_order: { type: Schema.types.integer },
    /** 作成日時（ISO 8601形式） */
    created_at: { type: Schema.types.string },
    /** 更新日時（ISO 8601形式） */
    updated_at: { type: Schema.types.string },
  },
});
