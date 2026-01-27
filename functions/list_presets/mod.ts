/**
 * プリセット一覧取得Function
 * ユーザーのプリセットと共有プリセットを取得
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";
import { StatusPresetType } from "../../lib/slack/types.ts";

/**
 * プリセット一覧取得Function定義
 */
export const ListPresetsDefinition = DefineFunction({
  callback_id: "list_presets",
  title: "List Presets",
  description: "List user's status presets and shared presets",
  source_file: "functions/list_presets/mod.ts",
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
      presets: {
        type: Schema.types.array,
        items: {
          type: StatusPresetType,
        },
        description: "User's presets",
      },
      shared_presets: {
        type: Schema.types.array,
        items: {
          type: StatusPresetType,
        },
        description: "Shared presets from other users",
      },
      count: {
        type: Schema.types.integer,
        description: "Total count of presets",
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
 * Datastore クエリ結果の型
 */
interface DatastoreQueryResult {
  ok: boolean;
  items?: StatusPreset[];
  error?: string;
}

/**
 * ユーザーのプリセット一覧を取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns ユーザーのプリセット一覧
 * @throws {Error} Datastore呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const presets = await getUserPresets(client, "U12345678");
 * console.log(presets.length);
 * ```
 */
export async function getUserPresets(
  client: SlackAPIClient,
  userId: string,
): Promise<StatusPreset[]> {
  const result = await client.apps.datastore.query({
    datastore: "status_presets",
    expression: "#user_id = :user_id",
    expression_attributes: { "#user_id": "user_id" },
    expression_values: { ":user_id": userId },
  }) as unknown as DatastoreQueryResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  return result.items ?? [];
}

/**
 * 共有プリセット一覧を取得（指定ユーザー以外のもの）
 *
 * @param client - Slack APIクライアント
 * @param excludeUserId - 除外するユーザーID
 * @returns 共有プリセット一覧
 * @throws {Error} Datastore呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const sharedPresets = await getSharedPresets(client, "U12345678");
 * console.log(sharedPresets.length);
 * ```
 */
export async function getSharedPresets(
  client: SlackAPIClient,
  excludeUserId: string,
): Promise<StatusPreset[]> {
  const result = await client.apps.datastore.query({
    datastore: "status_presets",
    expression: "#is_shared = :is_shared",
    expression_attributes: { "#is_shared": "is_shared" },
    expression_values: { ":is_shared": true },
  }) as unknown as DatastoreQueryResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  // 自分のプリセットは除外
  return (result.items ?? []).filter((preset) =>
    preset.user_id !== excludeUserId
  );
}

/**
 * Slack SDKの出力用にプリセットを変換
 * duration_minutes の null を 0 に変換（Slack SDKは null を許容しない）
 *
 * @param preset - 変換元のプリセット
 * @returns Slack SDK互換のプリセット
 */
function toOutputPreset(
  preset: StatusPreset,
): Omit<StatusPreset, "duration_minutes"> & { duration_minutes: number } {
  return {
    ...preset,
    duration_minutes: preset.duration_minutes ?? 0,
  };
}

export default SlackFunction(
  ListPresetsDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // ユーザーのプリセットを取得
      const presets = await getUserPresets(client, userId);

      // 共有プリセットを取得（自分のプリセットは除外）
      const sharedPresets = await getSharedPresets(client, userId);

      // sort_order でソート
      const sortedPresets = [...presets].sort((a, b) =>
        a.sort_order - b.sort_order
      );
      const sortedSharedPresets = [...sharedPresets].sort((a, b) =>
        a.sort_order - b.sort_order
      );

      return {
        outputs: {
          presets: sortedPresets.map(toOutputPreset),
          shared_presets: sortedSharedPresets.map(toOutputPreset),
          count: sortedPresets.length + sortedSharedPresets.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("list_presets error:", message);

      return {
        outputs: {
          presets: [],
          shared_presets: [],
          count: 0,
          error: message,
        },
      };
    }
  },
);
