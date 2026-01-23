import { assertEquals } from "std/testing/asserts.ts";
import {
  ACTION_IDS,
  BLOCK_IDS,
  buildStatusFormView,
  calculateExpiration,
  calculateTodayExpiration,
  getExpirationOptions,
  parseExpirationValue,
  STATUS_FORM_MODAL_CALLBACK_ID,
} from "./mod.ts";
import type { PrivateMetadata } from "./mod.ts";

Deno.test({
  name: "calculateExpiration: 0分の場合は0を返す",
  fn: () => {
    const result = calculateExpiration(0);
    assertEquals(result, 0);
  },
});

Deno.test({
  name: "calculateExpiration: 負の値の場合は0を返す",
  fn: () => {
    const result = calculateExpiration(-10);
    assertEquals(result, 0);
  },
});

Deno.test({
  name: "calculateExpiration: 正の値の場合は未来のタイムスタンプを返す",
  fn: () => {
    const now = Math.floor(Date.now() / 1000);
    const result = calculateExpiration(60);
    // 60分後 = 3600秒後
    assertEquals(result >= now + 3600 - 1, true);
    assertEquals(result <= now + 3600 + 1, true);
  },
});

Deno.test({
  name: "calculateTodayExpiration: 今日の終わりまでの分数を返す",
  fn: () => {
    const result = calculateTodayExpiration();
    // 最低1分、最大1440分（24時間）
    assertEquals(result >= 1, true);
    assertEquals(result <= 1440, true);
  },
});

Deno.test({
  name: "parseExpirationValue: 数値文字列を分に変換",
  fn: () => {
    assertEquals(parseExpirationValue("0"), 0);
    assertEquals(parseExpirationValue("30"), 30);
    assertEquals(parseExpirationValue("60"), 60);
    assertEquals(parseExpirationValue("120"), 120);
  },
});

Deno.test({
  name: "parseExpirationValue: 'today'は今日の終わりまでの分数を返す",
  fn: () => {
    const result = parseExpirationValue("today");
    assertEquals(result >= 1, true);
    assertEquals(result <= 1440, true);
  },
});

Deno.test({
  name: "parseExpirationValue: 無効な値は0を返す",
  fn: () => {
    assertEquals(parseExpirationValue("invalid"), 0);
    assertEquals(parseExpirationValue(""), 0);
  },
});

Deno.test({
  name: "getExpirationOptions: 6つのオプションを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const options = getExpirationOptions();
    assertEquals(options.length, 6);
    assertEquals(options[0].value, "0");
    assertEquals(options[1].value, "30");
    assertEquals(options[2].value, "60");
    assertEquals(options[3].value, "120");
    assertEquals(options[4].value, "240");
    assertEquals(options[5].value, "today");
  },
});

Deno.test({
  name: "buildStatusFormView: 正しいモーダル構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const view = buildStatusFormView(userId);

    // 基本構造のチェック
    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, STATUS_FORM_MODAL_CALLBACK_ID);

    // private_metadataにユーザーIDが含まれる
    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    // title, submit, closeが存在
    assertEquals((view.title as Record<string, unknown>).type, "plain_text");
    assertEquals((view.submit as Record<string, unknown>).type, "plain_text");
    assertEquals((view.close as Record<string, unknown>).type, "plain_text");

    // blocksが配列で5つのブロックがある
    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(Array.isArray(blocks), true);
    assertEquals(blocks.length, 5);
  },
});

Deno.test({
  name: "buildStatusFormView: 正しいブロックIDを持つ",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const view = buildStatusFormView("U12345678");
    const blocks = view.blocks as Array<Record<string, unknown>>;

    // ブロックIDのチェック
    const blockIds = blocks.map((block) => block.block_id);
    assertEquals(blockIds.includes(BLOCK_IDS.STATUS_TEXT), true);
    assertEquals(blockIds.includes(BLOCK_IDS.STATUS_EMOJI), true);
    assertEquals(blockIds.includes(BLOCK_IDS.EXPIRATION), true);
    assertEquals(blockIds.includes(BLOCK_IDS.SAVE_PRESET), true);
    assertEquals(blockIds.includes(BLOCK_IDS.PRESET_NAME), true);
  },
});

Deno.test({
  name: "buildStatusFormView: ステータステキストブロックの設定が正しい",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const view = buildStatusFormView("U12345678");
    const blocks = view.blocks as Array<Record<string, unknown>>;
    const statusTextBlock = blocks.find((block) =>
      block.block_id === BLOCK_IDS.STATUS_TEXT
    );

    assertEquals(statusTextBlock !== undefined, true);
    assertEquals(statusTextBlock!.type, "input");
    assertEquals(statusTextBlock!.optional, true);

    const element = statusTextBlock!.element as Record<string, unknown>;
    assertEquals(element.type, "plain_text_input");
    assertEquals(element.action_id, ACTION_IDS.STATUS_TEXT);
    assertEquals(element.max_length, 100);
  },
});

Deno.test({
  name: "buildStatusFormView: 有効期限ブロックの設定が正しい",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const view = buildStatusFormView("U12345678");
    const blocks = view.blocks as Array<Record<string, unknown>>;
    const expirationBlock = blocks.find((block) =>
      block.block_id === BLOCK_IDS.EXPIRATION
    );

    assertEquals(expirationBlock !== undefined, true);
    assertEquals(expirationBlock!.type, "input");

    const element = expirationBlock!.element as Record<string, unknown>;
    assertEquals(element.type, "static_select");
    assertEquals(element.action_id, ACTION_IDS.EXPIRATION);

    // 初期値は "0" (Don't clear)
    const initialOption = element.initial_option as Record<string, unknown>;
    assertEquals(initialOption.value, "0");
  },
});

Deno.test({
  name: "buildStatusFormView: プリセット保存チェックボックスの設定が正しい",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const view = buildStatusFormView("U12345678");
    const blocks = view.blocks as Array<Record<string, unknown>>;
    const savePresetBlock = blocks.find((block) =>
      block.block_id === BLOCK_IDS.SAVE_PRESET
    );

    assertEquals(savePresetBlock !== undefined, true);
    assertEquals(savePresetBlock!.type, "input");
    assertEquals(savePresetBlock!.optional, true);

    const element = savePresetBlock!.element as Record<string, unknown>;
    assertEquals(element.type, "checkboxes");
    assertEquals(element.action_id, ACTION_IDS.SAVE_PRESET);
  },
});

Deno.test({
  name: "buildStatusFormView: プリセット名入力ブロックの設定が正しい",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const view = buildStatusFormView("U12345678");
    const blocks = view.blocks as Array<Record<string, unknown>>;
    const presetNameBlock = blocks.find((block) =>
      block.block_id === BLOCK_IDS.PRESET_NAME
    );

    assertEquals(presetNameBlock !== undefined, true);
    assertEquals(presetNameBlock!.type, "input");
    assertEquals(presetNameBlock!.optional, true);

    const element = presetNameBlock!.element as Record<string, unknown>;
    assertEquals(element.type, "plain_text_input");
    assertEquals(element.action_id, ACTION_IDS.PRESET_NAME);
    assertEquals(element.max_length, 50);
  },
});
