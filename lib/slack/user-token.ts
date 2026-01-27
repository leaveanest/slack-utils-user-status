/**
 * User Token を使用した Slack API 呼び出し
 *
 * Slack Deno SDK の Bot Token では users.profile.set が使用できないため、
 * Admin User Token (xoxp-) を使用して直接 HTTP fetch で API を呼び出す
 *
 * @module
 */

import { t } from "../i18n/mod.ts";

const SLACK_API_BASE = "https://slack.com/api";

/**
 * Slack API レスポンスの型
 */
export interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

/**
 * 環境変数から Admin User Token を取得
 *
 * @returns Admin User Token
 * @throws {Error} トークンが設定されていない場合
 *
 * @example
 * ```typescript
 * const token = getAdminUserToken();
 * // "xoxp-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx"
 * ```
 */
export function getAdminUserToken(): string {
  const token = Deno.env.get("SLACK_ADMIN_USER_TOKEN");
  if (!token) {
    throw new Error(t("status.errors.admin_token_not_configured"));
  }
  return token;
}

/**
 * User Token を使用してユーザーステータスを設定
 *
 * Bot Token ではなく User OAuth Token (xoxp-) を使用して
 * users.profile.set API を直接呼び出す
 *
 * @param userId - ステータスを設定するユーザーID
 * @param statusText - ステータステキスト（最大100文字）
 * @param statusEmoji - ステータス絵文字（:emoji: 形式）
 * @param statusExpiration - ステータスの有効期限（Unixタイムスタンプ、0で無期限）
 * @returns API レスポンス
 * @throws {Error} トークンが設定されていない場合、またはAPI呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const response = await setStatusWithUserToken(
 *   "U12345678",
 *   "In a meeting",
 *   ":calendar:",
 *   1706000000
 * );
 * if (!response.ok) {
 *   console.error(response.error);
 * }
 * ```
 */
export async function setStatusWithUserToken(
  userId: string,
  statusText: string,
  statusEmoji: string,
  statusExpiration: number,
): Promise<SlackApiResponse> {
  const token = getAdminUserToken();

  const response = await fetch(`${SLACK_API_BASE}/users.profile.set`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      user: userId,
      profile: {
        status_text: statusText,
        status_emoji: statusEmoji,
        status_expiration: statusExpiration,
      },
    }),
  });

  const result = await response.json() as SlackApiResponse;

  if (!response.ok) {
    throw new Error(
      t("status.errors.api_call_failed", {
        error: result.error ?? "http_error",
      }),
    );
  }

  return result;
}

/**
 * User Token を使用してユーザーステータスをクリア
 *
 * ステータステキストと絵文字を空にし、有効期限も0にリセット
 *
 * @param userId - ステータスをクリアするユーザーID
 * @returns API レスポンス
 * @throws {Error} トークンが設定されていない場合、またはAPI呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * await clearStatusWithUserToken("U12345678");
 * ```
 */
export function clearStatusWithUserToken(
  userId: string,
): Promise<SlackApiResponse> {
  return setStatusWithUserToken(userId, "", "", 0);
}
