import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { initI18n } from "../../lib/i18n/mod.ts";
import {
  APPLY_PRESET_ACTION_PREFIX,
  buildLoadingView,
  buildPresetBlock,
  buildPresetBlocks,
  buildPresetSelectorView,
  calculateExpiration,
  CLEAR_STATUS_ACTION_ID,
  getSharedPresets,
  getUserPresets,
  PRESET_SELECTOR_MODAL_CALLBACK_ID,
} from "./mod.ts";
import type { PrivateMetadata } from "./mod.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

// i18nの初期化を待つ（レースコンディション対策）
await initI18n();

// テスト用のモックプリセット
function createMockPreset(overrides: Partial<StatusPreset> = {}): StatusPreset {
  return {
    id: "preset-001",
    user_id: "U12345678",
    name: "Test Preset",
    status_text: "In a meeting",
    status_emoji: ":calendar:",
    duration_minutes: 60,
    is_shared: false,
    sort_order: 1,
    created_at: "2024-01-22T09:00:00Z",
    updated_at: "2024-01-22T09:00:00Z",
    ...overrides,
  };
}

Deno.test({
  name: "calculateExpiration: nullの場合は0を返す",
  fn: () => {
    const result = calculateExpiration(null);
    assertEquals(result, 0);
  },
});

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
    assertEquals(result >= now + 3600 - 1, true);
    assertEquals(result <= now + 3600 + 1, true);
  },
});

Deno.test({
  name: "buildPresetBlock: 正しいブロック構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const preset = createMockPreset();
    const block = buildPresetBlock(preset);

    assertEquals(block.type, "section");

    const text = block.text as Record<string, unknown>;
    assertEquals(text.type, "mrkdwn");
    assertEquals((text.text as string).includes(preset.name), true);
    assertEquals((text.text as string).includes(preset.status_emoji), true);
    assertEquals((text.text as string).includes(preset.status_text), true);

    const accessory = block.accessory as Record<string, unknown>;
    assertEquals(accessory.type, "button");
    assertEquals(
      accessory.action_id,
      `${APPLY_PRESET_ACTION_PREFIX}${preset.id}`,
    );
    assertEquals(accessory.value, preset.id);
  },
});

Deno.test({
  name: "buildPresetBlock: 絵文字が空の場合はデフォルト絵文字を使用",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const preset = createMockPreset({ status_emoji: "" });
    const block = buildPresetBlock(preset);

    const text = block.text as Record<string, unknown>;
    assertEquals((text.text as string).includes(":grey_question:"), true);
  },
});

Deno.test({
  name: "buildPresetBlock: ステータステキストが空の場合は代替テキストを使用",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const preset = createMockPreset({ status_text: "" });
    const block = buildPresetBlock(preset);

    const text = block.text as Record<string, unknown>;
    assertEquals((text.text as string).includes("（テキストなし）"), true);
  },
});

Deno.test({
  name:
    "buildPresetBlocks: プリセットがない場合は「プリセットなし」メッセージを表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const blocks = buildPresetBlocks([], []);

    // ヘッダー、no_presetsメッセージ、divider、クリアボタンの4つ
    assertEquals(blocks.length >= 4, true);

    // no_presetsメッセージが含まれる
    const noPresetsBlock = blocks.find(
      (b) =>
        (b.text as Record<string, unknown>)?.text?.toString().includes("_"),
    );
    assertEquals(noPresetsBlock !== undefined, true);
  },
});

Deno.test({
  name:
    "buildPresetBlocks: ユーザープリセットのみの場合は正しいブロック構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userPresets = [
      createMockPreset({ id: "preset-001", name: "Preset 1" }),
      createMockPreset({ id: "preset-002", name: "Preset 2" }),
    ];

    const blocks = buildPresetBlocks(userPresets, []);

    // ヘッダー(1) + プリセット(2) + divider(1) + クリアセクション(1) = 5
    assertEquals(blocks.length, 5);

    // 最初はヘッダー
    assertEquals(blocks[0].type, "header");

    // プリセットブロックが含まれる
    const presetBlocks = blocks.filter((b) =>
      b.type === "section" && b.accessory
    );
    assertEquals(presetBlocks.length, 3); // 2 presets + 1 clear button
  },
});

Deno.test({
  name: "buildPresetBlocks: 共有プリセットがある場合は別セクションで表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userPresets = [
      createMockPreset({ id: "preset-001", name: "My Preset" }),
    ];
    const sharedPresets = [
      createMockPreset({
        id: "preset-002",
        name: "Shared Preset",
        is_shared: true,
      }),
    ];

    const blocks = buildPresetBlocks(userPresets, sharedPresets);

    // ヘッダー(1) + userプリセット(1) + divider(1) + 共有ヘッダー(1) + 共有プリセット(1) + divider(1) + クリア(1) = 7
    assertEquals(blocks.length, 7);

    // ヘッダーが2つある
    const headers = blocks.filter((b) => b.type === "header");
    assertEquals(headers.length, 2);
  },
});

Deno.test({
  name: "buildPresetBlocks: クリアボタンが最後に配置される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userPresets = [createMockPreset()];
    const blocks = buildPresetBlocks(userPresets, []);

    const lastBlock = blocks[blocks.length - 1];
    assertEquals(lastBlock.type, "section");

    const accessory = lastBlock.accessory as Record<string, unknown>;
    assertEquals(accessory.action_id, CLEAR_STATUS_ACTION_ID);
    assertEquals(accessory.style, "danger");
  },
});

Deno.test({
  name: "buildLoadingView: 正しいローディングビュー構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const view = buildLoadingView(userId);

    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, PRESET_SELECTOR_MODAL_CALLBACK_ID);

    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(blocks.length, 1);

    const text = blocks[0].text as Record<string, unknown>;
    assertEquals(
      (text.text as string).includes(":hourglass_flowing_sand:"),
      true,
    );
  },
});

Deno.test({
  name: "buildPresetSelectorView: 正しいビュー構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const userPresets = [createMockPreset()];

    const view = buildPresetSelectorView(userId, userPresets, []);

    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, PRESET_SELECTOR_MODAL_CALLBACK_ID);

    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(blocks.length > 0, true);
  },
});

// Mock types for API tests
interface MockDatastoreQueryResponse {
  ok: boolean;
  items?: StatusPreset[];
  error?: string;
}

Deno.test({
  name: "getUserPresets: 正常にプリセットを取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockPresets = [
      createMockPreset({ id: "preset-001", sort_order: 2 }),
      createMockPreset({ id: "preset-002", sort_order: 1 }),
    ];

    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResponse> =>
            Promise.resolve({
              ok: true,
              items: mockPresets,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getUserPresets(mockClient, "U12345678");

    assertEquals(presets.length, 2);
    // sort_orderでソートされている
    assertEquals(presets[0].id, "preset-002");
    assertEquals(presets[1].id, "preset-001");
  },
});

Deno.test({
  name: "getUserPresets: プリセットが空の場合は空配列を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResponse> =>
            Promise.resolve({
              ok: true,
              items: [],
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getUserPresets(mockClient, "U12345678");
    assertEquals(presets.length, 0);
  },
});

Deno.test({
  name: "getUserPresets: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResponse> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await getUserPresets(mockClient, "U12345678");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("datastore_error"), true);
    }
  },
});

Deno.test({
  name: "getSharedPresets: 共有プリセットを取得し、自分のプリセットを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockPresets = [
      createMockPreset({
        id: "preset-001",
        user_id: "U12345678",
        is_shared: true,
      }),
      createMockPreset({
        id: "preset-002",
        user_id: "U87654321",
        is_shared: true,
      }),
    ];

    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResponse> =>
            Promise.resolve({
              ok: true,
              items: mockPresets,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getSharedPresets(mockClient, "U12345678");

    // 自分のプリセットは除外される
    assertEquals(presets.length, 1);
    assertEquals(presets[0].id, "preset-002");
  },
});
