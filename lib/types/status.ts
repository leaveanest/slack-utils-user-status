/**
 * ステータス関連の型定義
 * user-status機能で使用する全ての型を定義
 */

/**
 * Datastoreに保存されるステータスプリセット
 *
 * @example
 * ```typescript
 * const preset: StatusPreset = {
 *   id: "preset-001",
 *   user_id: "U12345678",
 *   name: "In a meeting",
 *   status_text: "In a meeting",
 *   status_emoji: ":calendar:",
 *   duration_minutes: 60,
 *   is_shared: false,
 *   sort_order: 1,
 *   created_at: "2024-01-22T09:00:00Z",
 *   updated_at: "2024-01-22T09:00:00Z",
 * };
 * ```
 */
export interface StatusPreset {
  /** プリセットの一意識別子 */
  id: string;
  /** プリセットを所有するユーザーID */
  user_id: string;
  /** プリセット名 */
  name: string;
  /** ステータステキスト */
  status_text: string;
  /** ステータス絵文字（:emoji: 形式） */
  status_emoji: string;
  /** ステータスの持続時間（分）、nullで無期限 */
  duration_minutes: number | null;
  /** 他のユーザーと共有するかどうか */
  is_shared: boolean;
  /** 表示順序 */
  sort_order: number;
  /** 作成日時（ISO 8601形式） */
  created_at: string;
  /** 更新日時（ISO 8601形式） */
  updated_at: string;
}

/**
 * Slack APIから取得する現在のユーザーステータス
 *
 * @example
 * ```typescript
 * const status: UserStatus = {
 *   status_text: "In a meeting",
 *   status_emoji: ":calendar:",
 *   status_expiration: 1706000000,
 * };
 * ```
 */
export interface UserStatus {
  /** ステータステキスト */
  status_text: string;
  /** ステータス絵文字（:emoji: 形式） */
  status_emoji: string;
  /** ステータスの有効期限（Unixタイムスタンプ、0で無期限） */
  status_expiration: number;
}

/**
 * ステータス更新操作の結果
 *
 * @example
 * ```typescript
 * const result: StatusUpdateResult = {
 *   success: true,
 *   previous_status: {
 *     status_text: "Away",
 *     status_emoji: ":away:",
 *     status_expiration: 0,
 *   },
 *   new_status: {
 *     status_text: "In a meeting",
 *     status_emoji: ":calendar:",
 *     status_expiration: 1706000000,
 *   },
 * };
 * ```
 */
export interface StatusUpdateResult {
  /** 更新が成功したかどうか */
  success: boolean;
  /** 更新前のステータス（取得できなかった場合はnull） */
  previous_status: UserStatus | null;
  /** 更新後のステータス */
  new_status: UserStatus;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
}

/**
 * ステータス変更の発生元
 */
export type StatusChangeSource = "manual" | "preset" | "schedule";

/**
 * Datastoreに保存されるステータススケジュール
 *
 * @example
 * ```typescript
 * const schedule: StatusSchedule = {
 *   id: "schedule-001",
 *   user_id: "U12345678",
 *   preset_id: "preset-001",
 *   cron_expression: "0 9 * * 1-5",
 *   timezone: "Asia/Tokyo",
 *   is_active: true,
 *   next_run_at: "2024-01-22T09:00:00+09:00",
 *   created_at: "2024-01-22T09:00:00Z",
 *   updated_at: "2024-01-22T09:00:00Z",
 * };
 * ```
 */
export interface StatusSchedule {
  /** スケジュールの一意識別子 */
  id: string;
  /** スケジュールを所有するユーザーID */
  user_id: string;
  /** 適用するプリセットのID */
  preset_id: string;
  /** Cron式 */
  cron_expression: string;
  /** タイムゾーン */
  timezone: string;
  /** スケジュールが有効かどうか */
  is_active: boolean;
  /** 次回実行予定日時（ISO 8601形式） */
  next_run_at: string;
  /** 作成日時（ISO 8601形式） */
  created_at: string;
  /** 更新日時（ISO 8601形式） */
  updated_at: string;
}

/**
 * Datastoreに保存されるステータス変更履歴
 *
 * @example
 * ```typescript
 * const history: StatusHistory = {
 *   id: "history-001",
 *   user_id: "U12345678",
 *   status_text: "In a meeting",
 *   status_emoji: ":calendar:",
 *   expiration: 1706000000,
 *   changed_at: "2024-01-22T09:00:00Z",
 *   source: "manual",
 * };
 * ```
 */
export interface StatusHistory {
  /** 履歴エントリの一意識別子 */
  id: string;
  /** ステータスを変更したユーザーID */
  user_id: string;
  /** ステータステキスト */
  status_text: string;
  /** ステータス絵文字（:emoji: 形式） */
  status_emoji: string;
  /** ステータスの有効期限（Unixタイムスタンプ、0で無期限） */
  expiration: number;
  /** ステータス変更日時（ISO 8601形式） */
  changed_at: string;
  /** 変更元 */
  source: StatusChangeSource;
}
