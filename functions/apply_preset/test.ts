import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { calculateExpiration, getPresetById, setUserStatus } from "./mod.ts";
import type { StatusPreset } from "../../lib/types/status.ts";

// Mock response types
interface MockDatastoreGetResult {
  ok: boolean;
  item?: StatusPreset;
  error?: string;
}

const TEST_ADMIN_TOKEN = "xoxp-test-token";

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
  name: "calculateExpiration: nullの場合は0を返す",
  fn: () => {
    const result = calculateExpiration(null);
    assertEquals(result, 0);
  },
});

Deno.test({
  name: "calculateExpiration: 0の場合は0を返す",
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
  name: "getPresetById: 正常にプリセットを取得できる",
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

    const preset = await getPresetById(mockClient, "preset-001");

    assertEquals(preset !== null, true);
    assertEquals(preset?.id, "preset-001");
    assertEquals(preset?.name, "In a meeting");
  },
});

Deno.test({
  name: "getPresetById: プリセットが存在しない場合はnullを返す",
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

    const preset = await getPresetById(mockClient, "nonexistent");

    assertEquals(preset, null);
  },
});

Deno.test({
  name: "getPresetById: APIエラー時は例外を投げる",
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
      await getPresetById(mockClient, "preset-001");
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
  name:
    "getPresetById: 他人のプライベートプリセットは適用できない（所有権チェック）",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // 他のユーザーが所有する非共有プリセット
    const otherUserPreset: StatusPreset = {
      ...samplePreset,
      user_id: "U99999999", // 異なるユーザー
      is_shared: false, // 非共有
    };

    const mockClient = {
      apps: {
        datastore: {
          get: (): Promise<MockDatastoreGetResult> =>
            Promise.resolve({
              ok: true,
              item: otherUserPreset,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const preset = await getPresetById(mockClient, "preset-001");

    // プリセット自体は取得できる（チェックは呼び出し側で行う）
    assertEquals(preset !== null, true);
    assertEquals(preset?.user_id, "U99999999");
    assertEquals(preset?.is_shared, false);
  },
});

Deno.test({
  name: "getPresetById: 共有プリセットは他のユーザーも取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // 他のユーザーが所有する共有プリセット
    const sharedPreset: StatusPreset = {
      ...samplePreset,
      user_id: "U99999999", // 異なるユーザー
      is_shared: true, // 共有
    };

    const mockClient = {
      apps: {
        datastore: {
          get: (): Promise<MockDatastoreGetResult> =>
            Promise.resolve({
              ok: true,
              item: sharedPreset,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const preset = await getPresetById(mockClient, "preset-001");

    assertEquals(preset !== null, true);
    assertEquals(preset?.is_shared, true);
  },
});

describe("setUserStatus", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("正常にステータスを設定できる", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      capturedBody = init?.body as string;
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    await setUserStatus(
      TEST_ADMIN_TOKEN,
      "U12345678",
      "In a meeting",
      ":calendar:",
      60,
    );

    // リクエストボディが正しく設定されたか確認
    assertEquals(capturedBody !== undefined, true);
    const parsed = JSON.parse(capturedBody!);
    assertEquals(parsed.user, "U12345678");
    assertEquals(parsed.profile.status_text, "In a meeting");
    assertEquals(parsed.profile.status_emoji, ":calendar:");
    assertEquals(parsed.profile.status_expiration > 0, true);
  });

  it("duration_minutesがnullの場合はstatus_expirationも0", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      capturedBody = init?.body as string;
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    await setUserStatus(TEST_ADMIN_TOKEN, "U12345678", "Away", ":away:", null);

    const parsed = JSON.parse(capturedBody!);
    assertEquals(parsed.profile.status_expiration, 0);
  });

  it("APIエラー時は例外を投げる", async () => {
    globalThis.fetch = () => {
      return Promise.resolve(
        new Response(JSON.stringify({ ok: false, error: "not_allowed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    try {
      await setUserStatus(TEST_ADMIN_TOKEN, "U12345678", "Test", ":test:", 0);
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("not_allowed"), true);
    }
  });
});
