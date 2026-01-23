import { assertEquals } from "std/testing/asserts.ts";
import {
  getLocale,
  initI18n,
  loadLocale,
  setLocale,
  SUPPORTED_LOCALES,
} from "../i18n/mod.ts";
import {
  channelIdSchema,
  createChannelIdSchema,
  createCreatePresetInputSchema,
  createExpirationMinutesSchema,
  createNonEmptyStringSchema,
  createPresetNameSchema,
  createSetStatusInputSchema,
  createStatusEmojiSchema,
  createStatusTextSchema,
  createUserIdSchema,
  expirationMinutesSchema,
  nonEmptyStringSchema,
  presetNameSchema,
  setStatusInputSchema,
  statusEmojiSchema,
  statusTextSchema,
  userIdSchema,
} from "./schemas.ts";

// i18n初期化
await initI18n();

// テストで使用する全てのロケールを事前に読み込む
await loadLocale("en");
await loadLocale("ja");

const originalLocale = getLocale() as typeof SUPPORTED_LOCALES[number];

Deno.test("channelIdSchema: 正常なチャンネルIDを検証", () => {
  const result = channelIdSchema.safeParse("C12345678");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "C12345678");
  }
});

Deno.test("channelIdSchema: 不正なチャンネルIDを拒否（小文字）", () => {
  const result = channelIdSchema.safeParse("c12345678");
  assertEquals(result.success, false);
});

Deno.test("channelIdSchema: 不正なチャンネルIDを拒否（Cで開始しない）", () => {
  const result = channelIdSchema.safeParse("U12345678");
  assertEquals(result.success, false);
});

Deno.test("channelIdSchema: 空文字を拒否", () => {
  const result = channelIdSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("userIdSchema: 正常なユーザーIDを検証（U開始）", () => {
  const result = userIdSchema.safeParse("U0812GLUZD2");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "U0812GLUZD2");
  }
});

Deno.test("userIdSchema: 正常なユーザーIDを検証（W開始）", () => {
  const result = userIdSchema.safeParse("W1234567890");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "W1234567890");
  }
});

Deno.test("userIdSchema: 不正なユーザーIDを拒否", () => {
  const result = userIdSchema.safeParse("invalid");
  assertEquals(result.success, false);
});

Deno.test("userIdSchema: 空文字を拒否", () => {
  const result = userIdSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("nonEmptyStringSchema: 正常な文字列を検証", () => {
  const result = nonEmptyStringSchema.safeParse("Hello, World!");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "Hello, World!");
  }
});

Deno.test("nonEmptyStringSchema: 空文字を拒否", () => {
  const result = nonEmptyStringSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("nonEmptyStringSchema: 空白のみの文字列を許可", () => {
  // 空白のみの文字列は許可される（trimはしない）
  const result = nonEmptyStringSchema.safeParse("   ");
  assertEquals(result.success, true);
});

// i18n対応のテスト
Deno.test({
  name: "channelIdSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createChannelIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "channelIdSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createChannelIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("チャンネルID"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "userIdSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createUserIdSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "User ID must start with 'U' or 'W' followed by uppercase alphanumeric characters",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "userIdSchema: 空のユーザーIDでエラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createUserIdSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("ユーザーID"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "nonEmptyStringSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createNonEmptyStringSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Value cannot be empty",
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "nonEmptyStringSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createNonEmptyStringSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      // 日本語のエラーメッセージを確認（部分一致）
      assertEquals(
        result.error.errors[0].message.includes("空"),
        true,
      );
    }
    setLocale(originalLocale); // 元に戻す
  },
});

Deno.test({
  name: "デフォルトスキーマ: ロケール変更に動的に対応する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    // 英語でバリデーション（デフォルトスキーマ使用）
    setLocale("en");
    const result1 = channelIdSchema.safeParse("invalid");
    assertEquals(result1.success, false);
    if (!result1.success) {
      assertEquals(
        result1.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }

    // 同じスキーマインスタンスで日本語に切り替え
    setLocale("ja");
    const result2 = channelIdSchema.safeParse("invalid");
    assertEquals(result2.success, false);
    if (!result2.success) {
      // 日本語のエラーメッセージが表示される
      assertEquals(
        result2.error.errors[0].message.includes("チャンネルID"),
        true,
      );
    }

    // 英語に戻す
    setLocale("en");
    const result3 = channelIdSchema.safeParse("invalid");
    assertEquals(result3.success, false);
    if (!result3.success) {
      // 再び英語のエラーメッセージが表示される
      assertEquals(
        result3.error.errors[0].message,
        "Channel ID must start with 'C' followed by uppercase alphanumeric characters",
      );
    }

    setLocale(originalLocale); // 元に戻す
  },
});

// ============================================================================
// ステータス関連スキーマのテスト
// ============================================================================

// statusTextSchema テスト
Deno.test("statusTextSchema: 正常なステータステキストを検証", () => {
  const result = statusTextSchema.safeParse("In a meeting");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "In a meeting");
  }
});

Deno.test("statusTextSchema: 空文字を許可", () => {
  const result = statusTextSchema.safeParse("");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "");
  }
});

Deno.test("statusTextSchema: 前後の空白をトリミング", () => {
  const result = statusTextSchema.safeParse("  In a meeting  ");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "In a meeting");
  }
});

Deno.test("statusTextSchema: 100文字を超える場合は拒否", () => {
  const longText = "a".repeat(101);
  const result = statusTextSchema.safeParse(longText);
  assertEquals(result.success, false);
});

Deno.test("statusTextSchema: ちょうど100文字は許可", () => {
  const exactText = "a".repeat(100);
  const result = statusTextSchema.safeParse(exactText);
  assertEquals(result.success, true);
});

// statusEmojiSchema テスト
Deno.test("statusEmojiSchema: 正常な絵文字形式を検証", () => {
  const result = statusEmojiSchema.safeParse(":calendar:");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, ":calendar:");
  }
});

Deno.test("statusEmojiSchema: 空文字を許可", () => {
  const result = statusEmojiSchema.safeParse("");
  assertEquals(result.success, true);
});

Deno.test("statusEmojiSchema: アンダースコア付き絵文字を許可", () => {
  const result = statusEmojiSchema.safeParse(":thumbs_up:");
  assertEquals(result.success, true);
});

Deno.test("statusEmojiSchema: プラス付き絵文字を許可", () => {
  const result = statusEmojiSchema.safeParse(":+1:");
  assertEquals(result.success, true);
});

Deno.test("statusEmojiSchema: マイナス付き絵文字を許可", () => {
  const result = statusEmojiSchema.safeParse(":-1:");
  assertEquals(result.success, true);
});

Deno.test("statusEmojiSchema: コロンなしの形式を拒否", () => {
  const result = statusEmojiSchema.safeParse("calendar");
  assertEquals(result.success, false);
});

Deno.test("statusEmojiSchema: 大文字を含む形式を拒否", () => {
  const result = statusEmojiSchema.safeParse(":Calendar:");
  assertEquals(result.success, false);
});

// expirationMinutesSchema テスト
Deno.test("expirationMinutesSchema: 0分を許可", () => {
  const result = expirationMinutesSchema.safeParse(0);
  assertEquals(result.success, true);
});

Deno.test("expirationMinutesSchema: 正常な分数を検証", () => {
  const result = expirationMinutesSchema.safeParse(60);
  assertEquals(result.success, true);
});

Deno.test("expirationMinutesSchema: 最大値（525600分）を許可", () => {
  const result = expirationMinutesSchema.safeParse(525600);
  assertEquals(result.success, true);
});

Deno.test("expirationMinutesSchema: 負の値を拒否", () => {
  const result = expirationMinutesSchema.safeParse(-1);
  assertEquals(result.success, false);
});

Deno.test("expirationMinutesSchema: 最大値を超える値を拒否", () => {
  const result = expirationMinutesSchema.safeParse(525601);
  assertEquals(result.success, false);
});

Deno.test("expirationMinutesSchema: 小数を拒否", () => {
  const result = expirationMinutesSchema.safeParse(30.5);
  assertEquals(result.success, false);
});

// presetNameSchema テスト
Deno.test("presetNameSchema: 正常なプリセット名を検証", () => {
  const result = presetNameSchema.safeParse("My Preset");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "My Preset");
  }
});

Deno.test("presetNameSchema: 前後の空白をトリミング", () => {
  const result = presetNameSchema.safeParse("  My Preset  ");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "My Preset");
  }
});

Deno.test("presetNameSchema: 空文字を拒否", () => {
  const result = presetNameSchema.safeParse("");
  assertEquals(result.success, false);
});

Deno.test("presetNameSchema: 空白のみを拒否", () => {
  const result = presetNameSchema.safeParse("   ");
  assertEquals(result.success, false);
});

Deno.test("presetNameSchema: 50文字を超える場合は拒否", () => {
  const longName = "a".repeat(51);
  const result = presetNameSchema.safeParse(longName);
  assertEquals(result.success, false);
});

Deno.test("presetNameSchema: ちょうど50文字は許可", () => {
  const exactName = "a".repeat(50);
  const result = presetNameSchema.safeParse(exactName);
  assertEquals(result.success, true);
});

// setStatusInputSchema テスト
Deno.test("setStatusInputSchema: 全フィールド指定で検証", () => {
  const schema = createSetStatusInputSchema();
  const result = schema.safeParse({
    status_text: "In a meeting",
    status_emoji: ":calendar:",
    expiration_minutes: 60,
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.status_text, "In a meeting");
    assertEquals(result.data.status_emoji, ":calendar:");
    assertEquals(result.data.expiration_minutes, 60);
  }
});

Deno.test("setStatusInputSchema: デフォルト値を適用", () => {
  // デフォルトインスタンスを使用
  const result = setStatusInputSchema.safeParse({});
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.status_text, "");
    assertEquals(result.data.status_emoji, "");
    assertEquals(result.data.expiration_minutes, 0);
  }
});

// createPresetInputSchema テスト
Deno.test("createPresetInputSchema: 全フィールド指定で検証", () => {
  const schema = createCreatePresetInputSchema();
  const result = schema.safeParse({
    name: "Meeting",
    status_text: "In a meeting",
    status_emoji: ":calendar:",
    duration_minutes: 60,
    is_shared: true,
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.name, "Meeting");
    assertEquals(result.data.status_text, "In a meeting");
    assertEquals(result.data.status_emoji, ":calendar:");
    assertEquals(result.data.duration_minutes, 60);
    assertEquals(result.data.is_shared, true);
  }
});

Deno.test("createPresetInputSchema: 名前のみで検証（デフォルト値適用）", () => {
  const schema = createCreatePresetInputSchema();
  const result = schema.safeParse({
    name: "My Preset",
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.name, "My Preset");
    assertEquals(result.data.status_text, "");
    assertEquals(result.data.status_emoji, "");
    assertEquals(result.data.duration_minutes, null);
    assertEquals(result.data.is_shared, false);
  }
});

Deno.test("createPresetInputSchema: 名前なしで拒否", () => {
  const schema = createCreatePresetInputSchema();
  const result = schema.safeParse({
    status_text: "In a meeting",
  });
  assertEquals(result.success, false);
});

// i18n対応テスト（ステータス関連）
Deno.test({
  name: "statusTextSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createStatusTextSchema();
    const longText = "a".repeat(101);
    const result = schema.safeParse(longText);

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Status text must be 100 characters or less",
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "statusTextSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createStatusTextSchema();
    const longText = "a".repeat(101);
    const result = schema.safeParse(longText);

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message.includes("ステータステキスト"),
        true,
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "statusEmojiSchema: エラーメッセージが英語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createStatusEmojiSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Invalid emoji format. Use :emoji: format (e.g., :calendar:)",
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "statusEmojiSchema: エラーメッセージが日本語で表示される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createStatusEmojiSchema();
    const result = schema.safeParse("invalid");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message.includes("無効な絵文字形式"),
        true,
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "presetNameSchema: エラーメッセージが英語で表示される（空）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createPresetNameSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Preset name cannot be empty",
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "presetNameSchema: エラーメッセージが日本語で表示される（空）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createPresetNameSchema();
    const result = schema.safeParse("");

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message.includes("プリセット名"),
        true,
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name: "expirationMinutesSchema: エラーメッセージが英語で表示される（負の値）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("en");
    const schema = createExpirationMinutesSchema();
    const result = schema.safeParse(-1);

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message,
        "Expiration minutes must be at least 0",
      );
    }
    setLocale(originalLocale);
  },
});

Deno.test({
  name:
    "expirationMinutesSchema: エラーメッセージが日本語で表示される（負の値）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    setLocale("ja");
    const schema = createExpirationMinutesSchema();
    const result = schema.safeParse(-1);

    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(
        result.error.errors[0].message.includes("有効期限"),
        true,
      );
    }
    setLocale(originalLocale);
  },
});
