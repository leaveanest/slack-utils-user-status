import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { getUserStatus } from "./mod.ts";

// Mock response types
interface MockProfileGetResponse {
  ok: boolean;
  profile?: {
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  };
  error?: string;
}

Deno.test({
  name: "getUserStatus: 正常にステータスを取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          get: (): Promise<MockProfileGetResponse> =>
            Promise.resolve({
              ok: true,
              profile: {
                status_text: "Working from home",
                status_emoji: ":house:",
                status_expiration: 1706000000,
              },
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const status = await getUserStatus(mockClient, "U12345678");

    assertEquals(status.status_text, "Working from home");
    assertEquals(status.status_emoji, ":house:");
    assertEquals(status.status_expiration, 1706000000);
  },
});

Deno.test({
  name: "getUserStatus: ステータスが空の場合はデフォルト値を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          get: (): Promise<MockProfileGetResponse> =>
            Promise.resolve({
              ok: true,
              profile: {},
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const status = await getUserStatus(mockClient, "U12345678");

    assertEquals(status.status_text, "");
    assertEquals(status.status_emoji, "");
    assertEquals(status.status_expiration, 0);
  },
});

Deno.test({
  name: "getUserStatus: プロファイルがundefinedの場合はデフォルト値を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          get: (): Promise<MockProfileGetResponse> =>
            Promise.resolve({
              ok: true,
              profile: undefined,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const status = await getUserStatus(mockClient, "U12345678");

    assertEquals(status.status_text, "");
    assertEquals(status.status_emoji, "");
    assertEquals(status.status_expiration, 0);
  },
});

Deno.test({
  name: "getUserStatus: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          get: (): Promise<MockProfileGetResponse> =>
            Promise.resolve({
              ok: false,
              error: "user_not_found",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await getUserStatus(mockClient, "U00000000");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals(
        (error as Error).message.includes("user_not_found"),
        true,
      );
    }
  },
});

Deno.test({
  name: "getUserStatus: エラーコードがない場合はunknown_errorを使用",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          get: (): Promise<MockProfileGetResponse> =>
            Promise.resolve({
              ok: false,
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await getUserStatus(mockClient, "U00000000");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals(
        (error as Error).message.includes("unknown_error"),
        true,
      );
    }
  },
});
