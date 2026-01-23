import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { getSharedPresets, getUserPresets } from "./mod.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

// Mock response type
interface MockDatastoreQueryResult {
  ok: boolean;
  items?: StatusPreset[];
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

const sharedPreset: StatusPreset = {
  id: "preset-002",
  user_id: "U87654321",
  name: "Shared Status",
  status_text: "Shared status",
  status_emoji: ":star:",
  duration_minutes: 30,
  is_shared: true,
  sort_order: 1,
  created_at: "2024-01-22T09:00:00Z",
  updated_at: "2024-01-22T09:00:00Z",
};

Deno.test({
  name: "getUserPresets: 正常にプリセット一覧を取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
              items: [samplePreset],
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getUserPresets(mockClient, "U12345678");

    assertEquals(presets.length, 1);
    assertEquals(presets[0].id, "preset-001");
    assertEquals(presets[0].name, "In a meeting");
  },
});

Deno.test({
  name: "getUserPresets: プリセットがない場合は空配列を返す",
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

    const presets = await getUserPresets(mockClient, "U12345678");

    assertEquals(presets.length, 0);
  },
});

Deno.test({
  name: "getUserPresets: itemsがundefinedの場合は空配列を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
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
          query: (): Promise<MockDatastoreQueryResult> =>
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
      assertEquals(
        (error as Error).message.includes("datastore_error"),
        true,
      );
    }
  },
});

Deno.test({
  name: "getSharedPresets: 正常に共有プリセット一覧を取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
              items: [sharedPreset],
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getSharedPresets(mockClient, "U12345678");

    assertEquals(presets.length, 1);
    assertEquals(presets[0].id, "preset-002");
    assertEquals(presets[0].is_shared, true);
  },
});

Deno.test({
  name: "getSharedPresets: 自分のプリセットは除外される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const ownSharedPreset: StatusPreset = {
      ...sharedPreset,
      id: "preset-003",
      user_id: "U12345678", // 自分のID
    };

    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: true,
              items: [sharedPreset, ownSharedPreset],
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const presets = await getSharedPresets(mockClient, "U12345678");

    // 自分のプリセットは除外されるので、1件のみ
    assertEquals(presets.length, 1);
    assertEquals(presets[0].user_id, "U87654321");
  },
});

Deno.test({
  name: "getSharedPresets: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          query: (): Promise<MockDatastoreQueryResult> =>
            Promise.resolve({
              ok: false,
              error: "access_denied",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await getSharedPresets(mockClient, "U12345678");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals(
        (error as Error).message.includes("access_denied"),
        true,
      );
    }
  },
});
