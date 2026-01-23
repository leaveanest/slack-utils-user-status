/**
 * ステータス履歴記録ユーティリティ
 * ステータス変更をDatastoreに記録
 */
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../i18n/mod.ts";
import type { StatusChangeSource, StatusHistory } from "../types/status.ts";

/**
 * Datastore put 結果の型
 */
interface DatastorePutResult {
  ok: boolean;
  item?: StatusHistory;
  error?: string;
}

/**
 * ステータス変更履歴を記録
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param expiration - 有効期限（Unixタイムスタンプ、0で無期限）
 * @param source - 変更元（"manual" | "preset" | "schedule"）
 * @returns 記録された履歴のID
 * @throws {Error} Datastore操作に失敗した場合
 *
 * @example
 * ```typescript
 * await recordStatusHistory(
 *   client,
 *   "U12345678",
 *   "In a meeting",
 *   ":calendar:",
 *   1706000000,
 *   "manual"
 * );
 * ```
 */
export async function recordStatusHistory(
  client: SlackAPIClient,
  userId: string,
  statusText: string,
  statusEmoji: string,
  expiration: number,
  source: StatusChangeSource,
): Promise<string> {
  const history: StatusHistory = {
    id: crypto.randomUUID(),
    user_id: userId,
    status_text: statusText,
    status_emoji: statusEmoji,
    expiration,
    changed_at: new Date().toISOString(),
    source,
  };

  const result = await client.apps.datastore.put({
    datastore: "status_history",
    item: history,
  }) as unknown as DatastorePutResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  return history.id;
}

/**
 * ステータス変更履歴を記録（エラーを無視）
 *
 * 履歴の記録に失敗してもステータス設定自体は成功させたい場合に使用。
 * エラーはコンソールにログ出力のみ。
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param expiration - 有効期限（Unixタイムスタンプ、0で無期限）
 * @param source - 変更元（"manual" | "preset" | "schedule"）
 *
 * @example
 * ```typescript
 * await recordStatusHistorySilent(
 *   client,
 *   "U12345678",
 *   "In a meeting",
 *   ":calendar:",
 *   1706000000,
 *   "manual"
 * );
 * ```
 */
export async function recordStatusHistorySilent(
  client: SlackAPIClient,
  userId: string,
  statusText: string,
  statusEmoji: string,
  expiration: number,
  source: StatusChangeSource,
): Promise<void> {
  try {
    await recordStatusHistory(
      client,
      userId,
      statusText,
      statusEmoji,
      expiration,
      source,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to record status history:", message);
  }
}
