/**
 * ステータス設定モーダル表示Function
 * モーダルでステータスを設定し、オプションでプリセットとして保存
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { z } from "zod";
import { t } from "../../lib/i18n/mod.ts";
import {
  createCreatePresetInputSchema,
  createSetStatusInputSchema,
  userIdSchema,
} from "../../lib/validation/schemas.ts";
import type { StatusPreset } from "../../lib/types/status.ts";
import { setStatusWithUserToken } from "../../lib/slack/user-token.ts";

/**
 * モーダルコールバックID
 */
export const STATUS_FORM_MODAL_CALLBACK_ID = "status_form_modal";

/**
 * ブロックアクションID
 */
export const BLOCK_IDS = {
  STATUS_TEXT: "status_text_block",
  STATUS_EMOJI: "status_emoji_block",
  EXPIRATION: "expiration_block",
  SAVE_PRESET: "save_preset_block",
  PRESET_NAME: "preset_name_block",
} as const;

/**
 * アクションID
 */
export const ACTION_IDS = {
  STATUS_TEXT: "status_text_input",
  STATUS_EMOJI: "status_emoji_input",
  EXPIRATION: "expiration_select",
  SAVE_PRESET: "save_preset_checkbox",
  PRESET_NAME: "preset_name_input",
} as const;

/**
 * 有効期限オプション
 */
export interface ExpirationOption {
  text: { type: "plain_text"; text: string };
  value: string;
}

/**
 * 有効期限オプションを生成
 *
 * @returns 有効期限オプション配列
 *
 * @example
 * ```typescript
 * const options = getExpirationOptions();
 * // [{ text: { type: "plain_text", text: "Don't clear" }, value: "0" }, ...]
 * ```
 */
export function getExpirationOptions(): ExpirationOption[] {
  return [
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.no_expiration"),
      },
      value: "0",
    },
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.30_minutes"),
      },
      value: "30",
    },
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.1_hour"),
      },
      value: "60",
    },
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.2_hours"),
      },
      value: "120",
    },
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.4_hours"),
      },
      value: "240",
    },
    {
      text: {
        type: "plain_text",
        text: t("status.form.expiration.options.today"),
      },
      value: "today",
    },
  ];
}

/**
 * "today"オプションを分に変換
 * 今日の終わり（23:59:59）までの分数を計算
 *
 * @returns 今日の終わりまでの分数
 *
 * @example
 * ```typescript
 * const minutes = calculateTodayExpiration();
 * ```
 */
export function calculateTodayExpiration(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const diffMs = endOfDay.getTime() - now.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60)));
}

/**
 * 有効期限値を分に変換
 *
 * @param value - 有効期限値（数値文字列または"today"）
 * @returns 分数
 *
 * @example
 * ```typescript
 * parseExpirationValue("60"); // 60
 * parseExpirationValue("today"); // 今日の終わりまでの分数
 * ```
 */
export function parseExpirationValue(value: string): number {
  if (value === "today") {
    return calculateTodayExpiration();
  }
  return parseInt(value, 10) || 0;
}

/**
 * private_metadataの型
 */
export interface PrivateMetadata {
  user_id: string;
}

/**
 * モーダルビューを構築
 *
 * @param userId - ユーザーID
 * @returns モーダルビューオブジェクト
 *
 * @example
 * ```typescript
 * const view = buildStatusFormView("U12345678");
 * ```
 */
export function buildStatusFormView(userId: string): Record<string, unknown> {
  const expirationOptions = getExpirationOptions();
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: STATUS_FORM_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.form.title"),
    },
    submit: {
      type: "plain_text",
      text: t("status.form.submit"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    notify_on_close: true,
    blocks: [
      {
        type: "input",
        block_id: BLOCK_IDS.STATUS_TEXT,
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: ACTION_IDS.STATUS_TEXT,
          placeholder: {
            type: "plain_text",
            text: t("status.form.status_text.placeholder"),
          },
          max_length: 100,
        },
        label: {
          type: "plain_text",
          text: t("status.form.status_text.label"),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.STATUS_EMOJI,
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: ACTION_IDS.STATUS_EMOJI,
          placeholder: {
            type: "plain_text",
            text: t("status.form.status_emoji.placeholder"),
          },
        },
        label: {
          type: "plain_text",
          text: t("status.form.status_emoji.label"),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.EXPIRATION,
        element: {
          type: "static_select",
          action_id: ACTION_IDS.EXPIRATION,
          initial_option: expirationOptions[0],
          options: expirationOptions,
        },
        label: {
          type: "plain_text",
          text: t("status.form.expiration.label"),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.SAVE_PRESET,
        optional: true,
        element: {
          type: "checkboxes",
          action_id: ACTION_IDS.SAVE_PRESET,
          options: [
            {
              text: {
                type: "plain_text",
                text: t("status.form.save_preset.label"),
              },
              value: "save_preset",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: t("status.form.save_preset.label"),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.PRESET_NAME,
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: ACTION_IDS.PRESET_NAME,
          placeholder: {
            type: "plain_text",
            text: t("status.form.save_preset.name_placeholder"),
          },
          max_length: 50,
        },
        label: {
          type: "plain_text",
          text: t("status.form.save_preset.name_label"),
        },
      },
    ],
  };
}

/**
 * ステータス設定モーダル表示Function定義
 */
export const ShowStatusFormDefinition = DefineFunction({
  callback_id: "show_status_form",
  title: "ステータス設定フォーム",
  description: "ステータスを設定するモーダルを表示します",
  source_file: "functions/show_status_form/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "インタラクティビティコンテキスト",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "ユーザーID",
      },
    },
    required: ["interactivity", "user_id"],
  },
  output_parameters: {
    properties: {
      status_text: {
        type: Schema.types.string,
        description: "設定されたステータステキスト",
      },
      status_emoji: {
        type: Schema.types.string,
        description: "設定されたステータス絵文字",
      },
      expiration_minutes: {
        type: Schema.types.integer,
        description: "有効期限（分）",
      },
      preset_name: {
        type: Schema.types.string,
        description: "作成されたプリセット名（保存した場合）",
      },
      save_as_preset: {
        type: Schema.types.boolean,
        description: "プリセットとして保存したかどうか",
      },
    },
    required: [],
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
 * 有効期限をUnixタイムスタンプに変換
 *
 * @param minutes - 有効期限（分）、0以下の場合は無期限
 * @returns Unixタイムスタンプ、0で無期限
 */
export function calculateExpiration(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * 次のsort_orderを取得
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @returns 次のsort_order値
 */
async function getNextSortOrder(
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
    return 1;
  }

  if (!result.items || result.items.length === 0) {
    return 1;
  }

  const maxSortOrder = Math.max(...result.items.map((item) => item.sort_order));
  return maxSortOrder + 1;
}

/**
 * ユーザーのステータスを設定
 *
 * Admin User Token を使用して users.profile.set API を呼び出します。
 *
 * @param adminToken - Admin User Token
 * @param userId - ユーザーID
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param expirationMinutes - 有効期限（分）
 */
async function setUserStatus(
  adminToken: string,
  userId: string,
  statusText: string,
  statusEmoji: string,
  expirationMinutes: number,
): Promise<void> {
  const statusExpiration = calculateExpiration(expirationMinutes);

  const response = await setStatusWithUserToken(
    adminToken,
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

/**
 * プリセットを保存
 *
 * @param client - Slack APIクライアント
 * @param userId - ユーザーID
 * @param name - プリセット名
 * @param statusText - ステータステキスト
 * @param statusEmoji - ステータス絵文字
 * @param durationMinutes - 有効期限（分）
 * @returns 保存されたプリセットID
 */
async function savePreset(
  client: SlackAPIClient,
  userId: string,
  name: string,
  statusText: string,
  statusEmoji: string,
  durationMinutes: number | null,
): Promise<string> {
  const sortOrder = await getNextSortOrder(client, userId);
  const now = new Date().toISOString();

  const preset: StatusPreset = {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    status_text: statusText,
    status_emoji: statusEmoji,
    duration_minutes: durationMinutes,
    is_shared: false,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };

  const result = await client.apps.datastore.put({
    datastore: "status_presets",
    item: preset,
  }) as unknown as DatastorePutResult;

  if (!result.ok) {
    const errorCode = result.error ?? "unknown_error";
    throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
  }

  return preset.id;
}

/**
 * ビュー状態の型
 */
interface ViewState {
  values: {
    [blockId: string]: {
      [actionId: string]: {
        type: string;
        value?: string;
        selected_option?: { value: string };
        selected_options?: Array<{ value: string }>;
      };
    };
  };
}

export default SlackFunction(
  ShowStatusFormDefinition,
  async ({ inputs, client, env }) => {
    try {
      // Admin User Tokenの事前チェック（未設定ならフォームを開かずエラーを返す）
      const adminToken = env.SLACK_ADMIN_USER_TOKEN;
      if (!adminToken) {
        throw new Error(t("status.errors.admin_token_not_configured"));
      }

      // ユーザーIDのバリデーション
      const userId = userIdSchema.parse(inputs.user_id);

      // モーダルを開く（3秒以内に完了する必要あり）
      const view = buildStatusFormView(userId);

      const result = await client.views.open({
        trigger_id: inputs.interactivity.interactivity_pointer,
        view,
      });

      if (!result.ok) {
        const errorCode = result.error ?? "unknown_error";
        throw new Error(
          t("status.messages.modal_open_failed", { error: errorCode }),
        );
      }

      // モーダルを開いた後は completed: false を返す
      return { completed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("show_status_form error:", message);

      return {
        error: message,
      };
    }
  },
)
  .addViewSubmissionHandler(
    [STATUS_FORM_MODAL_CALLBACK_ID],
    async ({ view, body, client, env }) => {
      try {
        // Admin User Token を取得
        const adminToken = env.SLACK_ADMIN_USER_TOKEN;
        if (!adminToken) {
          throw new Error(t("status.errors.admin_token_not_configured"));
        }

        // private_metadataからユーザーIDを取得
        const metadata: PrivateMetadata = JSON.parse(
          view.private_metadata || "{}",
        );
        const userId = userIdSchema.parse(metadata.user_id);

        // フォーム値を取得
        const state = view.state as ViewState;

        const statusTextValue =
          state.values[BLOCK_IDS.STATUS_TEXT]?.[ACTION_IDS.STATUS_TEXT]
            ?.value ?? "";
        const statusEmojiValue =
          state.values[BLOCK_IDS.STATUS_EMOJI]?.[ACTION_IDS.STATUS_EMOJI]
            ?.value ?? "";
        const expirationValue =
          state.values[BLOCK_IDS.EXPIRATION]?.[ACTION_IDS.EXPIRATION]
            ?.selected_option?.value ??
            "0";
        const savePresetOptions =
          state.values[BLOCK_IDS.SAVE_PRESET]?.[ACTION_IDS.SAVE_PRESET]
            ?.selected_options ?? [];
        const presetNameValue =
          state.values[BLOCK_IDS.PRESET_NAME]?.[ACTION_IDS.PRESET_NAME]
            ?.value ?? "";

        // バリデーション
        const statusInputSchema = createSetStatusInputSchema();
        const validatedStatus = statusInputSchema.parse({
          status_text: statusTextValue,
          status_emoji: statusEmojiValue,
          expiration_minutes: parseExpirationValue(expirationValue),
        });

        // ステータスを設定
        await setUserStatus(
          adminToken,
          userId,
          validatedStatus.status_text,
          validatedStatus.status_emoji,
          validatedStatus.expiration_minutes,
        );

        // プリセットとして保存するかチェック
        const shouldSavePreset = savePresetOptions.some((opt) =>
          opt.value === "save_preset"
        );
        let savedPresetName: string | undefined;

        if (shouldSavePreset && presetNameValue.trim()) {
          // プリセット入力のバリデーション
          const presetInputSchema = createCreatePresetInputSchema();
          const validatedPreset = presetInputSchema.parse({
            name: presetNameValue,
            status_text: validatedStatus.status_text,
            status_emoji: validatedStatus.status_emoji,
            duration_minutes: validatedStatus.expiration_minutes > 0
              ? validatedStatus.expiration_minutes
              : null,
            is_shared: false,
          });

          await savePreset(
            client,
            userId,
            validatedPreset.name,
            validatedPreset.status_text,
            validatedPreset.status_emoji,
            validatedPreset.duration_minutes,
          );
          savedPresetName = validatedPreset.name;
        }

        // 関数を完了させる（outputs付き）
        // addViewSubmissionHandler の return では outputs を渡せないため、
        // client.functions.completeSuccess() を使用する
        const completionResult = await client.functions.completeSuccess({
          function_execution_id: body.function_data.execution_id,
          outputs: {
            status_text: validatedStatus.status_text,
            status_emoji: validatedStatus.status_emoji,
            expiration_minutes: validatedStatus.expiration_minutes,
            preset_name: savedPresetName ?? "",
            save_as_preset: shouldSavePreset && !!savedPresetName,
          },
        });

        if (!completionResult.ok) {
          console.error(
            "show_status_form completeSuccess error:",
            completionResult.error,
          );
        }

        // 何も返さない = モーダルを閉じる（デフォルト動作）
        return;
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Zodバリデーションエラーの場合はフィールドごとにエラーをマッピング
          const fieldToBlockId: Record<string, string> = {
            status_text: BLOCK_IDS.STATUS_TEXT,
            status_emoji: BLOCK_IDS.STATUS_EMOJI,
            expiration_minutes: BLOCK_IDS.EXPIRATION,
          };

          const errors: Record<string, string> = {};
          for (const e of error.errors) {
            const fieldName = e.path[0]?.toString() ?? "";
            const blockId = fieldToBlockId[fieldName] ?? BLOCK_IDS.STATUS_TEXT;
            // 同一ブロックに複数エラーがある場合はカンマ区切りで結合
            errors[blockId] = errors[blockId]
              ? `${errors[blockId]}, ${e.message}`
              : e.message;
          }

          console.error(
            "show_status_form validation error:",
            JSON.stringify(errors),
          );

          return {
            response_action: "errors",
            errors,
          };
        }

        // Zod以外のエラーはSTATUS_TEXTにフォールバック
        const message = error instanceof Error ? error.message : String(error);
        console.error("show_status_form submission error:", message);

        return {
          response_action: "errors",
          errors: {
            [BLOCK_IDS.STATUS_TEXT]: message,
          },
        };
      }
    },
  )
  .addViewClosedHandler(
    [STATUS_FORM_MODAL_CALLBACK_ID],
    async ({ body, client }) => {
      // モーダルが閉じられた場合は関数を完了させる
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  );
