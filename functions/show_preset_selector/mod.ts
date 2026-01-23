/**
 * プリセット選択モーダル表示Function
 * プリセット一覧を表示し、クイックにステータスを設定
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

/**
 * モーダルコールバックID
 */
export const PRESET_SELECTOR_MODAL_CALLBACK_ID = "preset_selector_modal";

/**
 * アクションIDプレフィックス
 */
export const APPLY_PRESET_ACTION_PREFIX = "apply_preset_";
export const CLEAR_STATUS_ACTION_ID = "clear_status_button";

/**
 * private_metadataの型
 */
export interface PrivateMetadata {
  user_id: string;
}

/**
 * プリセット選択モーダル表示Function定義
 */
export const ShowPresetSelectorDefinition = DefineFunction({
  callback_id: "show_preset_selector",
  title: "Show Preset Selector",
  description: "Display a modal to select and apply a preset",
  source_file: "functions/show_preset_selector/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID",
      },
    },
    required: ["interactivity", "user_id"],
  },
  output_parameters: {
    properties: {
      selected_preset_id: {
        type: Schema.types.string,
        description: "Selected preset ID",
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
 * Profile set 結果の型
 */
interface ProfileSetResult {
  ok: boolean;
  error?: string;
}

/**
 * Datastore get 結果の型
 */
interface DatastoreGetResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

/**
 * ユーザーのプリセット一覧を取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns ユーザーのプリセット一覧
 *
 * @example
 * ```typescript
 * const presets = await getUserPresets(client, "U12345678");
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

  return (result.items ?? []).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * 共有プリセット一覧を取得（指定ユーザー以外のもの）
 *
 * @param client - Slack APIクライアント
 * @param excludeUserId - 除外するユーザーID
 * @returns 共有プリセット一覧
 *
 * @example
 * ```typescript
 * const sharedPresets = await getSharedPresets(client, "U12345678");
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

  return (result.items ?? [])
    .filter((preset) => preset.user_id !== excludeUserId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * プリセットからセクションブロックを生成
 *
 * @param preset - プリセット
 * @returns セクションブロック
 *
 * @example
 * ```typescript
 * const block = buildPresetBlock(preset);
 * ```
 */
export function buildPresetBlock(
  preset: StatusPreset,
): Record<string, unknown> {
  const emoji = preset.status_emoji || ":grey_question:";
  const text = preset.status_text || "(no text)";

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${emoji} *${preset.name}*\n"${text}"`,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: t("status.selector.apply"),
        emoji: true,
      },
      action_id: `${APPLY_PRESET_ACTION_PREFIX}${preset.id}`,
      value: preset.id,
    },
  };
}

/**
 * プリセット一覧からブロック配列を生成
 *
 * @param userPresets - ユーザーのプリセット一覧
 * @param sharedPresets - 共有プリセット一覧
 * @returns ブロック配列
 *
 * @example
 * ```typescript
 * const blocks = buildPresetBlocks(userPresets, sharedPresets);
 * ```
 */
export function buildPresetBlocks(
  userPresets: StatusPreset[],
  sharedPresets: StatusPreset[],
): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];

  // ユーザープリセットセクション
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: t("status.selector.your_presets"),
      emoji: true,
    },
  });

  if (userPresets.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_${t("status.selector.no_presets")}_`,
      },
    });
  } else {
    for (const preset of userPresets) {
      blocks.push(buildPresetBlock(preset));
    }
  }

  // 共有プリセットセクション（存在する場合のみ）
  if (sharedPresets.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: t("status.selector.shared_presets"),
        emoji: true,
      },
    });

    for (const preset of sharedPresets) {
      blocks.push(buildPresetBlock(preset));
    }
  }

  // ステータスクリアセクション
  blocks.push({ type: "divider" });
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `:x: *${t("status.selector.clear_status")}*`,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: t("status.selector.clear_status"),
        emoji: true,
      },
      action_id: CLEAR_STATUS_ACTION_ID,
      style: "danger",
    },
  });

  return blocks;
}

/**
 * ローディングビューを構築
 *
 * @param userId - ユーザーID
 * @returns ローディングモーダルビュー
 */
export function buildLoadingView(userId: string): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: PRESET_SELECTOR_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.selector.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:hourglass_flowing_sand: ${t("status.messages.loading")}`,
        },
      },
    ],
  };
}

/**
 * プリセット選択ビューを構築
 *
 * @param userId - ユーザーID
 * @param userPresets - ユーザーのプリセット一覧
 * @param sharedPresets - 共有プリセット一覧
 * @returns モーダルビュー
 */
export function buildPresetSelectorView(
  userId: string,
  userPresets: StatusPreset[],
  sharedPresets: StatusPreset[],
): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: PRESET_SELECTOR_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.selector.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: buildPresetBlocks(userPresets, sharedPresets),
  };
}

/**
 * 有効期限をUnixタイムスタンプに変換
 *
 * @param minutes - 有効期限（分）、nullまたは0以下の場合は無期限
 * @returns Unixタイムスタンプ、0で無期限
 */
export function calculateExpiration(minutes: number | null): number {
  if (minutes === null || minutes <= 0) return 0;
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * ユーザーのステータスを設定
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param durationMinutes - 有効期限（分）
 */
async function setUserStatus(
  client: SlackAPIClient,
  userId: string,
  statusText: string,
  statusEmoji: string,
  durationMinutes: number | null,
): Promise<void> {
  const statusExpiration = calculateExpiration(durationMinutes);

  const response = await client.users.profile.set({
    user: userId,
    profile: JSON.stringify({
      status_text: statusText,
      status_emoji: statusEmoji,
      status_expiration: statusExpiration,
    }),
  }) as ProfileSetResult;

  if (!response.ok) {
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }
}

/**
 * ステータスをクリア
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 */
async function clearUserStatus(
  client: SlackAPIClient,
  userId: string,
): Promise<void> {
  await setUserStatus(client, userId, "", "", null);
}

/**
 * プリセットをDatastoreから取得
 *
 * @param client - Slack APIクライアント
 * @param presetId - プリセットID
 * @returns プリセット（存在しない場合はnull）
 */
async function getPresetById(
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
 * 完了メッセージビューを構築
 *
 * @param userId - ユーザーID
 * @param message - 完了メッセージ
 * @returns モーダルビュー
 */
function buildCompletionView(
  userId: string,
  message: string,
): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: PRESET_SELECTOR_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.selector.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: ${message}`,
        },
      },
    ],
  };
}

/**
 * BlockAction body の型
 */
interface BlockActionBody {
  view?: {
    id: string;
    private_metadata?: string;
  };
  user?: {
    id: string;
  };
}

export default SlackFunction(
  ShowPresetSelectorDefinition,
  async ({ inputs, client }) => {
    try {
      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // ローディングモーダルを表示（3秒タイムアウト対策）
      const loadingView = buildLoadingView(userId);

      const openResult = await client.views.open({
        trigger_id: inputs.interactivity.interactivity_pointer,
        view: loadingView,
      });

      if (!openResult.ok) {
        const errorCode = openResult.error ?? "unknown_error";
        throw new Error(
          t("status.messages.modal_open_failed", { error: errorCode }),
        );
      }

      const viewId = (openResult.view as { id: string })?.id;

      // プリセットを取得
      const userPresets = await getUserPresets(client, userId);
      const sharedPresets = await getSharedPresets(client, userId);

      // モーダルを更新
      const selectorView = buildPresetSelectorView(
        userId,
        userPresets,
        sharedPresets,
      );

      await client.views.update({
        view_id: viewId,
        view: selectorView,
      });

      // モーダルを開いた後は completed: false を返す
      return { completed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("show_preset_selector error:", message);

      return {
        error: message,
      };
    }
  },
)
  .addBlockActionsHandler(
    new RegExp(`^${APPLY_PRESET_ACTION_PREFIX}`),
    async ({ action, body, client }) => {
      try {
        const blockBody = body as BlockActionBody;
        const metadata: PrivateMetadata = JSON.parse(
          blockBody.view?.private_metadata || "{}",
        );
        const userId = userIdSchema.parse(metadata.user_id);
        const presetId = action.value as string;

        // プリセットを取得
        const preset = await getPresetById(client, presetId);

        if (!preset) {
          throw new Error(t("status.errors.preset_not_found"));
        }

        // 所有者または共有プリセットかチェック
        if (preset.user_id !== userId && !preset.is_shared) {
          throw new Error(t("status.errors.unauthorized"));
        }

        // ステータスを設定
        await setUserStatus(
          client,
          userId,
          preset.status_text,
          preset.status_emoji,
          preset.duration_minutes,
        );

        // 完了メッセージを表示
        const completionView = buildCompletionView(
          userId,
          t("status.messages.preset_applied"),
        );

        await client.views.update({
          view_id: blockBody.view?.id,
          view: completionView,
        });

        return {
          outputs: {
            selected_preset_id: presetId,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("apply_preset error:", message);

        return {
          error: message,
        };
      }
    },
  )
  .addBlockActionsHandler(
    [CLEAR_STATUS_ACTION_ID],
    async ({ body, client }) => {
      try {
        const blockBody = body as BlockActionBody;
        const metadata: PrivateMetadata = JSON.parse(
          blockBody.view?.private_metadata || "{}",
        );
        const userId = userIdSchema.parse(metadata.user_id);

        // ステータスをクリア
        await clearUserStatus(client, userId);

        // 完了メッセージを表示
        const completionView = buildCompletionView(
          userId,
          t("status.messages.status_cleared"),
        );

        await client.views.update({
          view_id: blockBody.view?.id,
          view: completionView,
        });

        return {
          outputs: {},
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("clear_status error:", message);

        return {
          error: message,
        };
      }
    },
  )
  .addViewClosedHandler(
    [PRESET_SELECTOR_MODAL_CALLBACK_ID],
    () => {
      // モーダルが閉じられた場合は何もせず完了
      return {
        outputs: {},
        completed: true,
      };
    },
  );
