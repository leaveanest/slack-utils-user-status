import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { z } from "zod";
import { t } from "../../lib/i18n/mod.ts";
import {
  createSetStatusInputSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";
import type { UserStatus } from "../../lib/types/status.ts";
import { recordStatusHistorySilent } from "../../lib/status/history.ts";

/**
 * ステータス設定Function定義
 */
export const SetStatusDefinition = DefineFunction({
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
    required: ["user_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the status was set successfully",
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
 * 有効期限をUnixタイムスタンプに変換
 *
 * @param minutes - 有効期限（分）、0以下の場合は無期限
 * @returns Unixタイムスタンプ、0で無期限
 *
 * @example
 * ```typescript
 * const expiration = calculateExpiration(60); // 1時間後のタイムスタンプ
 * const noExpiration = calculateExpiration(0); // 0（無期限）
 * ```
 */
export function calculateExpiration(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * ユーザーの現在のステータスを取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns 現在のステータス情報
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const status = await getCurrentStatus(client, "U12345678");
 * console.log(status.status_text, status.status_emoji);
 * ```
 */
export async function getCurrentStatus(
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
 * ユーザーのステータスを設定
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param expirationMinutes - 有効期限（分）
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * await setUserStatus(client, "U12345678", "In a meeting", ":calendar:", 60);
 * ```
 */
export async function setUserStatus(
  client: SlackAPIClient,
  userId: string,
  statusText: string,
  statusEmoji: string,
  expirationMinutes: number,
): Promise<void> {
  const statusExpiration = calculateExpiration(expirationMinutes);

  const response = await client.users.profile.set({
    user: userId,
    profile: JSON.stringify({
      status_text: statusText,
      status_emoji: statusEmoji,
      status_expiration: statusExpiration,
    }),
  });

  if (!response.ok) {
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }
}

export default SlackFunction(
  SetStatusDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // ステータス入力のバリデーション
      const statusInputSchema = createSetStatusInputSchema();
      const validatedInput = statusInputSchema.parse({
        status_text: inputs.status_text ?? "",
        status_emoji: inputs.status_emoji ?? "",
        expiration_minutes: inputs.expiration_minutes ?? 0,
      });

      // 現在のステータスを取得
      const previousStatus = await getCurrentStatus(client, userId);

      // ステータスを設定
      await setUserStatus(
        client,
        userId,
        validatedInput.status_text,
        validatedInput.status_emoji,
        validatedInput.expiration_minutes,
      );

      // 履歴を記録（エラーは無視）
      await recordStatusHistorySilent(
        client,
        userId,
        validatedInput.status_text,
        validatedInput.status_emoji,
        calculateExpiration(validatedInput.expiration_minutes),
        "manual",
      );

      return {
        outputs: {
          success: true,
          previous_status_text: previousStatus.status_text,
          previous_status_emoji: previousStatus.status_emoji,
        },
      };
    } catch (error) {
      // Zodバリデーションエラーの場合は詳細なメッセージを生成
      const message = error instanceof z.ZodError
        ? error.errors.map((e) => e.message).join(", ")
        : error instanceof Error
        ? error.message
        : String(error);

      console.error("set_status error:", message);

      return {
        outputs: {
          success: false,
          error: message,
        },
      };
    }
  },
);
