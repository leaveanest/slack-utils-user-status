/**
 * 共通バリデーションスキーマ
 * Zodを使用した型安全なバリデーション
 * i18n対応のエラーメッセージをサポート
 */
import { z } from "zod";
import { initI18n, t } from "../i18n/mod.ts";

// トップレベルawaitでi18nを初期化
await initI18n();

/**
 * i18n対応のSlackチャンネル ID スキーマを生成
 * 形式: C + 英数字大文字
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createChannelIdSchema();
 * const channelId = schema.parse("C12345678");
 * ```
 */
export function createChannelIdSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.channel_id_empty"),
      });
      return;
    }
    if (!/^C[A-Z0-9]+$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
        message: t("errors.validation.channel_id_format"),
      });
    }
  });
}

/**
 * i18n対応のSlack ユーザー ID スキーマを生成
 * 形式: U または W + 英数字大文字
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createUserIdSchema();
 * const userId = schema.parse("U0812GLUZD2");
 * ```
 */
export function createUserIdSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.user_id_empty"),
      });
      return;
    }
    if (!/^[UW][A-Z0-9]+$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
        message: t("errors.validation.user_id_format"),
      });
    }
  });
}

/**
 * i18n対応の空でない文字列スキーマを生成
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に対応します。
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createNonEmptyStringSchema();
 * const text = schema.parse("Hello");
 * ```
 */
export function createNonEmptyStringSchema() {
  return z.string().superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.value_empty"),
      });
    }
  });
}

/**
 * Slackチャンネル ID スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const channelId = channelIdSchema.parse("C12345678");
 * ```
 */
export const channelIdSchema = createChannelIdSchema();

/**
 * Slack ユーザー ID スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const userId = userIdSchema.parse("U0812GLUZD2");
 * ```
 */
export const userIdSchema = createUserIdSchema();

/**
 * 空でない文字列スキーマ（デフォルトインスタンス）
 *
 * エラーメッセージは検証時に動的に評価されるため、
 * ロケール変更に自動的に対応します。
 *
 * @example
 * ```typescript
 * const text = nonEmptyStringSchema.parse("Hello");
 * ```
 */
export const nonEmptyStringSchema = createNonEmptyStringSchema();

/**
 * 型推論のエクスポート
 */
export type ChannelId = z.infer<ReturnType<typeof createChannelIdSchema>>;
export type UserId = z.infer<ReturnType<typeof createUserIdSchema>>;
export type NonEmptyString = z.infer<
  ReturnType<typeof createNonEmptyStringSchema>
>;

// ============================================================================
// ステータス関連スキーマ（user-status機能用）
// ============================================================================

/** ステータステキストの最大文字数 */
const STATUS_TEXT_MAX_LENGTH = 100;

/** プリセット名の最大文字数 */
const PRESET_NAME_MAX_LENGTH = 50;

/** 有効期限の最大値（1年 = 525600分） */
const EXPIRATION_MAX_MINUTES = 525600;

/**
 * i18n対応のステータステキストスキーマを生成
 * 最大100文字、トリミング付き
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createStatusTextSchema();
 * const text = schema.parse("In a meeting");
 * ```
 */
export function createStatusTextSchema() {
  return z.string().transform((val) => val.trim()).superRefine((val, ctx) => {
    if (val.length > STATUS_TEXT_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: STATUS_TEXT_MAX_LENGTH,
        type: "string",
        inclusive: true,
        message: t("errors.validation.status_text_too_long", {
          max: STATUS_TEXT_MAX_LENGTH.toString(),
        }),
      });
    }
  });
}

/**
 * i18n対応のステータス絵文字スキーマを生成
 * :emoji: 形式または空文字を許可
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createStatusEmojiSchema();
 * const emoji = schema.parse(":calendar:");
 * ```
 */
export function createStatusEmojiSchema() {
  return z.string().superRefine((val, ctx) => {
    // 空文字は許可
    if (val === "") {
      return;
    }
    // :emoji: 形式のチェック（小文字英数字、アンダースコア、プラス、マイナスを許可）
    if (!/^:[a-z0-9_+-]+:$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
        message: t("errors.validation.status_emoji_format"),
      });
    }
  });
}

/**
 * i18n対応の有効期限（分）スキーマを生成
 * 0以上525600以下の整数
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createExpirationMinutesSchema();
 * const minutes = schema.parse(60);
 * ```
 */
export function createExpirationMinutesSchema() {
  return z.number().superRefine((val, ctx) => {
    if (!Number.isInteger(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "integer",
        received: "float",
        message: t("errors.validation.expiration_not_integer"),
      });
      return;
    }
    if (val < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 0,
        type: "number",
        inclusive: true,
        message: t("errors.validation.expiration_min", { min: "0" }),
      });
    }
    if (val > EXPIRATION_MAX_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: EXPIRATION_MAX_MINUTES,
        type: "number",
        inclusive: true,
        message: t("errors.validation.expiration_max", {
          max: EXPIRATION_MAX_MINUTES.toString(),
        }),
      });
    }
  });
}

/**
 * i18n対応のプリセット名スキーマを生成
 * 1〜50文字、トリミング付き
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createPresetNameSchema();
 * const name = schema.parse("My Preset");
 * ```
 */
export function createPresetNameSchema() {
  return z.string().transform((val) => val.trim()).superRefine((val, ctx) => {
    if (val.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: t("errors.validation.preset_name_empty"),
      });
      return;
    }
    if (val.length > PRESET_NAME_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: PRESET_NAME_MAX_LENGTH,
        type: "string",
        inclusive: true,
        message: t("errors.validation.preset_name_too_long", {
          max: PRESET_NAME_MAX_LENGTH.toString(),
        }),
      });
    }
  });
}

/**
 * ステータス設定入力スキーマを生成
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createSetStatusInputSchema();
 * const input = schema.parse({
 *   status_text: "In a meeting",
 *   status_emoji: ":calendar:",
 *   expiration_minutes: 60,
 * });
 * ```
 */
export function createSetStatusInputSchema() {
  return z.object({
    status_text: createStatusTextSchema().default(""),
    status_emoji: createStatusEmojiSchema().default(""),
    expiration_minutes: createExpirationMinutesSchema().default(0),
  });
}

/**
 * プリセット作成入力スキーマを生成
 *
 * @returns Zodスキーマ
 *
 * @example
 * ```typescript
 * const schema = createCreatePresetInputSchema();
 * const input = schema.parse({
 *   name: "My Preset",
 *   status_text: "In a meeting",
 *   status_emoji: ":calendar:",
 *   duration_minutes: 60,
 *   is_shared: false,
 * });
 * ```
 */
export function createCreatePresetInputSchema() {
  return z.object({
    name: createPresetNameSchema(),
    status_text: createStatusTextSchema().default(""),
    status_emoji: createStatusEmojiSchema().default(""),
    duration_minutes: createExpirationMinutesSchema().nullable().default(null),
    is_shared: z.boolean().default(false),
  });
}

/**
 * ステータステキストスキーマ（デフォルトインスタンス）
 */
export const statusTextSchema = createStatusTextSchema();

/**
 * ステータス絵文字スキーマ（デフォルトインスタンス）
 */
export const statusEmojiSchema = createStatusEmojiSchema();

/**
 * 有効期限（分）スキーマ（デフォルトインスタンス）
 */
export const expirationMinutesSchema = createExpirationMinutesSchema();

/**
 * プリセット名スキーマ（デフォルトインスタンス）
 */
export const presetNameSchema = createPresetNameSchema();

/**
 * ステータス設定入力スキーマ（デフォルトインスタンス）
 */
export const setStatusInputSchema = createSetStatusInputSchema();

/**
 * プリセット作成入力スキーマ（デフォルトインスタンス）
 */
export const createPresetInputSchema = createCreatePresetInputSchema();

/**
 * ステータス関連の型推論エクスポート
 */
export type StatusText = z.infer<ReturnType<typeof createStatusTextSchema>>;
export type StatusEmoji = z.infer<ReturnType<typeof createStatusEmojiSchema>>;
export type ExpirationMinutes = z.infer<
  ReturnType<typeof createExpirationMinutesSchema>
>;
export type PresetName = z.infer<ReturnType<typeof createPresetNameSchema>>;
export type SetStatusInput = z.infer<
  ReturnType<typeof createSetStatusInputSchema>
>;
export type CreatePresetInput = z.infer<
  ReturnType<typeof createCreatePresetInputSchema>
>;
