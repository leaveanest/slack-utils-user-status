import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { UserStatus } from "../../lib/types/status.ts";
import { clearStatusWithUserToken } from "../../lib/slack/user-token.ts";

/**
 * ステータスクリアFunction定義
 */
export const ClearStatusDefinition = DefineFunction({
  callback_id: "clear_status",
  title: "Clear User Status",
  description: "Clear the current user status",
  source_file: "functions/clear_status/mod.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "Target user ID",
      },
    },
    required: ["user_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the status was cleared successfully",
      },
      previous_status_text: {
        type: Schema.types.string,
        description: "Previous status text",
      },
      previous_status_emoji: {
        type: Schema.types.string,
        description: "Previous status emoji",
      },
      error: {
        type: Schema.types.string,
        description: "Error message if failed",
      },
    },
    required: ["success"],
  },
});

/**
 * ユーザーの現在のステータスを取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns 現在のステータス情報
 * @throws {Error} API呼び出しに失敗した場合
 */
async function getCurrentStatus(
  client: SlackAPIClient,
  userId: string,
): Promise<UserStatus> {
  const response = await client.users.profile.get({
    user: userId,
  });

  if (!response.ok) {
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  const profile = response.profile as {
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  } | undefined;

  return {
    status_text: profile?.status_text ?? "",
    status_emoji: profile?.status_emoji ?? "",
    status_expiration: profile?.status_expiration ?? 0,
  };
}

/**
 * ユーザーのステータスをクリア
 *
 * ステータステキストと絵文字を空にし、有効期限も0にリセットします。
 * Admin User Token を使用して users.profile.set API を呼び出します。
 *
 * @param userId - ユーザーID
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * await clearUserStatus("U12345678");
 * ```
 */
export async function clearUserStatus(
  userId: string,
): Promise<void> {
  const response = await clearStatusWithUserToken(userId);

  if (!response.ok) {
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }
}

export default SlackFunction(
  ClearStatusDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // 現在のステータスを取得
      const previousStatus = await getCurrentStatus(client, userId);

      // ステータスをクリア
      await clearUserStatus(userId);

      return {
        outputs: {
          success: true,
          previous_status_text: previousStatus.status_text,
          previous_status_emoji: previousStatus.status_emoji,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("clear_status error:", message);

      return {
        outputs: {
          success: false,
          error: message,
        },
      };
    }
  },
);
