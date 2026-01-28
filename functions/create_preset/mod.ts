/**
 * プリセット作成Function
 * 新しいステータスプリセットを作成
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { z } from "zod";
import { t } from "../../lib/i18n/mod.ts";
import {
  createCreatePresetInputSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

/**
 * プリセット作成Function定義
 */
export const CreatePresetDefinition = DefineFunction({
  callback_id: "create_preset",
  title: "プリセット作成",
  description: "新しいステータスプリセットを作成します",
  source_file: "functions/create_preset/mod.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "所有者ユーザーID",
      },
      name: {
        type: Schema.types.string,
        description: "プリセット名（最大50文字）",
      },
      status_text: {
        type: Schema.types.string,
        description: "ステータステキスト（最大100文字）",
      },
      status_emoji: {
        type: Schema.types.string,
        description: "ステータス絵文字（:emoji: 形式）",
      },
      duration_minutes: {
        type: Schema.types.integer,
        description: "有効期限（分）（null = 無期限）",
      },
      is_shared: {
        type: Schema.types.boolean,
        description: "他のユーザーと共有するかどうか",
      },
    },
    required: ["user_id", "name"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "プリセットの作成に成功したかどうか",
      },
      preset_id: {
        type: Schema.types.string,
        description: "作成されたプリセットID",
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
 * Datastore put 結果の型
 */
interface DatastorePutResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

/**
 * Datastore クエリ結果の型
 */
interface DatastoreQueryResult {
  ok: boolean;
  items?: StatusPreset[];
  error?: string;
}

/**
 * 次のsort_orderを取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns 次のsort_order値
 *
 * @example
 * ```typescript
 * const sortOrder = await getNextSortOrder(client, "U12345678");
 * ```
 */
export async function getNextSortOrder(
  client: SlackAPIClient,
  userId: string,
): Promise<number> {
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

  if (!result.items || result.items.length === 0) {
    return 1;
  }

  const maxSortOrder = Math.max(...result.items.map((item) => item.sort_order));
  return maxSortOrder + 1;
}

/**
 * プリセットをDatastoreに保存
 *
 * @param client - Slack APIクライアント
 * @param preset - 保存するプリセット
 * @returns 保存されたプリセット
 * @throws {Error} Datastore呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const saved = await savePreset(client, preset);
 * console.log(saved.id);
 * ```
 */
export async function savePreset(
  client: SlackAPIClient,
  preset: StatusPreset,
): Promise<StatusPreset> {
  const result = await client.apps.datastore.put({
    datastore: "status_presets",
    item: preset,
  }) as unknown as DatastorePutResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  return result.item ?? preset;
}

export default SlackFunction(
  CreatePresetDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // プリセット入力のバリデーション
      const presetInputSchema = createCreatePresetInputSchema();
      const validatedInput = presetInputSchema.parse({
        name: inputs.name,
        status_text: inputs.status_text ?? "",
        status_emoji: inputs.status_emoji ?? "",
        duration_minutes: inputs.duration_minutes ?? null,
        is_shared: inputs.is_shared ?? false,
      });

      // 次のsort_orderを取得
      const sortOrder = await getNextSortOrder(client, userId);

      // プリセットを作成
      const now = new Date().toISOString();
      const preset: StatusPreset = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: validatedInput.name,
        status_text: validatedInput.status_text,
        status_emoji: validatedInput.status_emoji,
        duration_minutes: validatedInput.duration_minutes,
        is_shared: validatedInput.is_shared,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
      };

      // Datastoreに保存
      await savePreset(client, preset);

      return {
        outputs: {
          success: true,
          preset_id: preset.id,
        },
      };
    } catch (error) {
      // Zodバリデーションエラーの場合は詳細なメッセージを生成
      const message = error instanceof z.ZodError
        ? error.errors.map((e) => e.message).join(", ")
        : error instanceof Error
        ? error.message
        : String(error);

      console.error("create_preset error:", message);

      return {
        outputs: {
          success: false,
          error: message,
        },
      };
    }
  },
);
