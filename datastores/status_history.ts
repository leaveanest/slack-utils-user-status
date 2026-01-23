/**
 * ステータス変更履歴用Datastore定義
 * ユーザーのステータス変更履歴を保存
 */
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * ステータス変更履歴Datastore
 *
 * @description ユーザーのステータス変更履歴を記録し、分析や復元に使用
 *
 * @example
 * ```typescript
 * // 履歴を記録
 * await client.apps.datastore.put({
 *   datastore: "status_history",
 *   item: {
 *     id: "history-001",
 *     user_id: "U12345678",
 *     status_text: "In a meeting",
 *     status_emoji: ":calendar:",
 *     expiration: 1706000000,
 *     changed_at: new Date().toISOString(),
 *     source: "manual",
 *   },
 * });
 * ```
 */
export const StatusHistoryDatastore = DefineDatastore({
  name: "status_history",
  primary_key: "id",
  attributes: {
    /** 履歴エントリの一意識別子 */
    id: { type: Schema.types.string },
    /** ステータスを変更したユーザーID */
    user_id: { type: Schema.types.string },
    /** ステータステキスト */
    status_text: { type: Schema.types.string },
    /** ステータス絵文字（:emoji: 形式） */
    status_emoji: { type: Schema.types.string },
    /** ステータスの有効期限（Unixタイムスタンプ、0で無期限） */
    expiration: { type: Schema.types.integer },
    /** ステータス変更日時（ISO 8601形式） */
    changed_at: { type: Schema.types.string },
    /** 変更元（"manual" | "preset" | "schedule"） */
    source: { type: Schema.types.string },
  },
});
