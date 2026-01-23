import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { deletePreset, getPreset } from "./mod.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

// Mock response types
interface MockDatastoreGetResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

interface MockDatastoreDeleteResult {
  ok: boolean;
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
  name: "getPreset: 正常にプリセットを取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          get: (): Promise<MockDatastoreGetResult> =>
            Promise.resolve({
              ok: true,
              item: samplePreset,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const preset = await getPreset(mockClient, "preset-001");

    assertEquals(preset !== null, true);
    assertEquals(preset?.id, "preset-001");
    assertEquals(preset?.name, "In a meeting");
  },
});

Deno.test({
  name: "getPreset: プリセットが存在しない場合はnullを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          get: (): Promise<MockDatastoreGetResult> =>
            Promise.resolve({
              ok: true,
              // item がない
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const preset = await getPreset(mockClient, "nonexistent");

    assertEquals(preset, null);
  },
});

Deno.test({
  name: "getPreset: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          get: (): Promise<MockDatastoreGetResult> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await getPreset(mockClient, "preset-001");
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
  name: "deletePreset: 正常にプリセットを削除できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedId: string | undefined;

    const mockClient = {
      apps: {
        datastore: {
          delete: (
            args: { datastore: string; id: string },
          ): Promise<MockDatastoreDeleteResult> => {
            capturedId = args.id;
            return Promise.resolve({
              ok: true,
            });
          },
        },
      },
    } as unknown as SlackAPIClient;

    await deletePreset(mockClient, "preset-001");

    assertEquals(capturedId, "preset-001");
  },
});

Deno.test({
  name: "deletePreset: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          delete: (): Promise<MockDatastoreDeleteResult> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await deletePreset(mockClient, "preset-001");
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
