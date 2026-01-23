import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { UserStatus } from "../../lib/types/status.ts";

/**
 * ステータス取得Function定義
 */
export const GetStatusDefinition = DefineFunction({
  callback_id: "get_status",
  title: "Get User Status",
  description: "Get the current status of a user",
  source_file: "functions/get_status/mod.ts",
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
      status_text: {
        type: Schema.types.string,
        description: "Current status text",
      },
      status_emoji: {
        type: Schema.types.string,
        description: "Current status emoji",
      },
      status_expiration: {
        type: Schema.types.integer,
        description: "Status expiration timestamp (0 = no expiration)",
      },
      error: {
        type: Schema.types.string,
        description: "Error message if failed",
      },
    },
    required: [],
  },
});

/**
 * ユーザーの現在のステータスを取得
 *
 * Slack APIを使用して指定されたユーザーの現在のステータス情報を取得します。
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns 現在のステータス情報（テキスト、絵文字、有効期限）
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const status = await getUserStatus(client, "U12345678");
 * console.log(`${status.status_emoji} ${status.status_text}`);
 * ```
 */
export async function getUserStatus(
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

export default SlackFunction(
  GetStatusDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // ステータスを取得
      const status = await getUserStatus(client, userId);

      return {
        outputs: {
          status_text: status.status_text,
          status_emoji: status.status_emoji,
          status_expiration: status.status_expiration,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("get_status error:", message);

      return {
        outputs: {
          error: message,
        },
      };
    }
  },
);
