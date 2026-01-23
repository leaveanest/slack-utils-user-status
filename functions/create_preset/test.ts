import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { getNextSortOrder, savePreset } from "./mod.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

// Mock response types
interface MockDatastoreQueryResult {
  ok: boolean;
  items?: StatusPreset[];
  error?: string;
}

interface MockDatastorePutResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

// サンプルプリセットデータ
const samplePreset: StatusPreset = {
  id: "preset-001",
  user_id: "U12345678",
  name: "In a meeting",
  status_text: "In a meeting",
  status_emoji: ":calendar:",
  duration_minutes: 60,
  is_shared: false,
  sort_order: 1,
  created_at: "2024-01-22T09:00:00Z",
  updated_at: "2024-01-22T09:00:00Z",
};

Deno.test({
  name: "getNextSortOrder: プリセットがない場合は1を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
              items: [],
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const sortOrder = await getNextSortOrder(mockClient, "U12345678");

    assertEquals(sortOrder, 1);
  },
});

Deno.test({
  name: "getNextSortOrder: 既存プリセットがある場合は最大値+1を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const existingPresets: StatusPreset[] = [
      { ...samplePreset, id: "preset-001", sort_order: 1 },
      { ...samplePreset, id: "preset-002", sort_order: 3 },
      { ...samplePreset, id: "preset-003", sort_order: 2 },
    ];

    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
              items: existingPresets,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const sortOrder = await getNextSortOrder(mockClient, "U12345678");

    assertEquals(sortOrder, 4); // 最大値3 + 1
  },
});

Deno.test({
  name: "getNextSortOrder: クエリエラー時は1を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const sortOrder = await getNextSortOrder(mockClient, "U12345678");

    assertEquals(sortOrder, 1);
  },
});

Deno.test({
  name: "savePreset: 正常にプリセットを保存できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedItem: StatusPreset | undefined;

    const mockClient = {
      apps: {
        datastore: {
          put: (
            args: { datastore: string; item: StatusPreset },
          ): Promise<MockDatastorePutResult> => {
            capturedItem = args.item;
            return Promise.resolve({
              ok: true,
              item: args.item,
            });
          },
        },
      },
    } as unknown as SlackAPIClient;

    const result = await savePreset(mockClient, samplePreset);

    assertEquals(capturedItem?.id, "preset-001");
    assertEquals(result.id, "preset-001");
    assertEquals(result.name, "In a meeting");
  },
});

Deno.test({
  name: "savePreset: Datastoreエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          put: (): Promise<MockDatastorePutResult> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await savePreset(mockClient, samplePreset);
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals(
        (error as Error).message.includes("datastore_error"),
        true,
      );
    }
  },
});

Deno.test({
  name: "savePreset: レスポンスにitemがない場合は入力を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          put: (): Promise<MockDatastorePutResult> =>
            Promise.resolve({
              ok: true,
              // item がない
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const result = await savePreset(mockClient, samplePreset);

    // 入力がそのまま返される
    assertEquals(result.id, samplePreset.id);
    assertEquals(result.name, samplePreset.name);
  },
});
