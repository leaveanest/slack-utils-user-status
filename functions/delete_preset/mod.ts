/**
 * プリセット削除Function
 * ステータスプリセットを削除
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

/**
 * プリセット削除Function定義
 */
export const DeletePresetDefinition = DefineFunction({
  callback_id: "delete_preset",
  title: "Delete Preset",
  description: "Delete a status preset",
  source_file: "functions/delete_preset/mod.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID requesting deletion",
      },
      preset_id: {
        type: Schema.types.string,
        description: "Preset ID to delete",
      },
    },
    required: ["user_id", "preset_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the preset was deleted successfully",
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
 * Datastore get 結果の型
 */
interface DatastoreGetResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

/**
 * Datastore delete 結果の型
 */
interface DatastoreDeleteResult {
  ok: boolean;
  error?: string;
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
 * const preset = await getPreset(client, "preset-001");
 * if (preset) {
 *   console.log(preset.name);
 * }
 * ```
 */
export async function getPreset(
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
 * プリセットをDatastoreから削除
 *
 * @param client - Slack APIクライアント
 * @param presetId - プリセットID
 * @throws {Error} Datastore呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * await deletePreset(client, "preset-001");
 * ```
 */
export async function deletePreset(
  client: SlackAPIClient,
  presetId: string,
): Promise<void> {
  const result = await client.apps.datastore.delete({
    datastore: "status_presets",
    id: presetId,
  }) as DatastoreDeleteResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }
}

export default SlackFunction(
  DeletePresetDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);
      const presetId = inputs.preset_id;

      // プリセットを取得
      const preset = await getPreset(client, presetId);

      // プリセットが存在しない場合
      if (!preset) {
        return {
          outputs: {
            success: false,
            error: t("status.errors.preset_not_found"),
          },
        };
      }

      // 所有者チェック
      if (preset.user_id !== userId) {
        return {
          outputs: {
            success: false,
            error: t("status.errors.unauthorized"),
          },
        };
      }

      // プリセットを削除
      await deletePreset(client, presetId);

      return {
        outputs: {
          success: true,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("delete_preset error:", message);

      return {
        outputs: {
          success: false,
          error: message,
        },
      };
    }
  },
);
