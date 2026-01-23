/**
 * ステータススケジュール用Datastore定義
 * ユーザーのスケジュールベースのステータス設定を保存
 */
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * ステータススケジュールDatastore
 *
 * @description スケジュールに基づいてステータスを自動設定するための設定を管理
 *
 * @example
 * ```typescript
 * // スケジュールを保存
 * await client.apps.datastore.put({
 *   datastore: "status_schedules",
 *   item: {
 *     id: "schedule-001",
 *     user_id: "U12345678",
 *     preset_id: "preset-001",
 *     cron_expression: "0 9 * * 1-5",
 *     timezone: "Asia/Tokyo",
 *     is_active: true,
 *     next_run_at: "2024-01-22T09:00:00+09:00",
 *     created_at: new Date().toISOString(),
 *     updated_at: new Date().toISOString(),
 *   },
 * });
 * ```
 */
export const StatusScheduleDatastore = DefineDatastore({
  name: "status_schedules",
  primary_key: "id",
  attributes: {
    /** スケジュールの一意識別子 */
    id: { type: Schema.types.string },
    /** スケジュールを所有するユーザーID */
    user_id: { type: Schema.types.string },
    /** 適用するプリセットのID */
    preset_id: { type: Schema.types.string },
    /** Cron式（例: "0 9 * * 1-5" は平日9時） */
    cron_expression: { type: Schema.types.string },
    /** タイムゾーン（例: "Asia/Tokyo"） */
    timezone: { type: Schema.types.string },
    /** スケジュールが有効かどうか */
    is_active: { type: Schema.types.boolean },
    /** 次回実行予定日時（ISO 8601形式） */
    next_run_at: { type: Schema.types.string },
    /** 作成日時（ISO 8601形式） */
    created_at: { type: Schema.types.string },
    /** 更新日時（ISO 8601形式） */
    updated_at: { type: Schema.types.string },
  },
});
