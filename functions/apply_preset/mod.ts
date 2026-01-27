/**
 * プリセット適用Function
 * 保存されたプリセットをユーザーのステータスに適用
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";
import { recordStatusHistorySilent } from "../../lib/status/history.ts";
import { setStatusWithUserToken } from "../../lib/slack/user-token.ts";

/**
 * プリセット適用Function定義
 */
export const ApplyPresetDefinition = DefineFunction({
  callback_id: "apply_preset",
  title: "プリセット適用",
  description: "保存済みプリセットをユーザーステータスに適用します",
  source_file: "functions/apply_preset/mod.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "対象ユーザーID",
      },
      preset_id: {
        type: Schema.types.string,
        description: "適用するプリセットID",
      },
    },
    required: ["user_id", "preset_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "プリセットの適用に成功したかどうか",
      },
      status_text: {
        type: Schema.types.string,
        description: "適用されたステータステキスト",
      },
      status_emoji: {
        type: Schema.types.string,
        description: "適用されたステータス絵文字",
      },
      error: {
        type: Schema.types.string,
        description: "失敗時のエラーメッセージ",
      },
    },
    required: ["success"],
  },
});

/**
 * Datastore get 結果の型
 */
interface DatastoreGetResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

/**
 * 有効期限をUnixタイムスタンプに変換
 *
 * @param minutes - 有効期限（分）、nullまたは0以下の場合は無期限
 * @returns Unixタイムスタンプ、0で無期限
 *
 * @example
 * ```typescript
 * const expiration = calculateExpiration(60); // 1時間後のタイムスタンプ
 * const noExpiration = calculateExpiration(null); // 0（無期限）
 * ```
 */
export function calculateExpiration(minutes: number | null): number {
  if (minutes === null || minutes <= 0) return 0;
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * プリセットをDatastoreから取得
 *
 * @param client - Slack APIクライアント
 * @param presetId - プリセットID
 * @returns プリセット（存在しない場合はnull）
 * @throws {Error} Datastore呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const preset = await getPresetById(client, "preset-001");
 * if (preset) {
 *   console.log(preset.name);
 * }
 * ```
 */
export async function getPresetById(
  client: SlackAPIClient,
  presetId: string,
): Promise<StatusPreset | null> {
  const result = await client.apps.datastore.get({
    datastore: "status_presets",
    id: presetId,
  }) as unknown as DatastoreGetResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  return result.item ?? null;
}

/**
 * ユーザーのステータスを設定
 *
 * Admin User Token を使用して users.profile.set API を呼び出します。
 *
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param durationMinutes - 有効期限（分）
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * await setUserStatus("U12345678", "In a meeting", ":calendar:", 60);
 * ```
 */
export async function setUserStatus(
  userId: string,
  statusText: string,
  statusEmoji: string,
  durationMinutes: number | null,
): Promise<void> {
  const statusExpiration = calculateExpiration(durationMinutes);

  const response = await setStatusWithUserToken(
    userId,
    statusText,
    statusEmoji,
    statusExpiration,
  );

  if (!response.ok) {
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }
}

export default SlackFunction(
  ApplyPresetDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);
      const presetId = inputs.preset_id;

      // プリセットを取得
      const preset = await getPresetById(client, presetId);

      // プリセットが存在しない場合
      if (!preset) {
        return {
          outputs: {
            success: false,
            error: t("status.errors.preset_not_found"),
          },
        };
      }

      // 所有者または共有プリセットかチェック
      if (preset.user_id !== userId && !preset.is_shared) {
        return {
          outputs: {
            success: false,
            error: t("status.errors.unauthorized"),
          },
        };
      }

      // ステータスを設定
      await setUserStatus(
        userId,
        preset.status_text,
        preset.status_emoji,
        preset.duration_minutes,
      );

      // 履歴を記録（エラーは無視）
      await recordStatusHistorySilent(
        client,
        userId,
        preset.status_text,
        preset.status_emoji,
        calculateExpiration(preset.duration_minutes),
        "preset",
      );

      return {
        outputs: {
          success: true,
          status_text: preset.status_text,
          status_emoji: preset.status_emoji,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("apply_preset error:", message);

      return {
        outputs: {
          success: false,
          error: message,
        },
      };
    }
  },
);
