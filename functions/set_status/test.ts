import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { calculateExpiration, getCurrentStatus, setUserStatus } from "./mod.ts";

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
  name: "getCurrentStatus: 正常にステータスを取得できる",
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
                status_text: "In a meeting",
                status_emoji: ":calendar:",
                status_expiration: 1706000000,
              },
            }),
        },
      },
    } as unknown as SlackAPIClient;

    const status = await getCurrentStatus(mockClient, "U12345678");

    assertEquals(status.status_text, "In a meeting");
    assertEquals(status.status_emoji, ":calendar:");
    assertEquals(status.status_expiration, 1706000000);
  },
});

Deno.test({
  name: "getCurrentStatus: プロファイルが空の場合はデフォルト値を返す",
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

    const status = await getCurrentStatus(mockClient, "U12345678");

    assertEquals(status.status_text, "");
    assertEquals(status.status_emoji, "");
    assertEquals(status.status_expiration, 0);
  },
});

Deno.test({
  name: "getCurrentStatus: APIエラー時は例外を投げる",
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
      await getCurrentStatus(mockClient, "U00000000");
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

describe("setUserStatus", () => {
  const originalToken = Deno.env.get("SLACK_ADMIN_USER_TOKEN");
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    Deno.env.set("SLACK_ADMIN_USER_TOKEN", "xoxp-test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken) {
      Deno.env.set("SLACK_ADMIN_USER_TOKEN", originalToken);
    } else {
      Deno.env.delete("SLACK_ADMIN_USER_TOKEN");
    }
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

    await setUserStatus("U12345678", "In a meeting", ":calendar:", 60);

    // リクエストボディが正しく設定されたか確認
    assertEquals(capturedBody !== undefined, true);
    const parsed = JSON.parse(capturedBody!);
    assertEquals(parsed.user, "U12345678");
    assertEquals(parsed.profile.status_text, "In a meeting");
    assertEquals(parsed.profile.status_emoji, ":calendar:");
    assertEquals(parsed.profile.status_expiration > 0, true);
  });

  it("有効期限0の場合はstatus_expirationも0", async () => {
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

    await setUserStatus("U12345678", "Away", ":away:", 0);

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
      await setUserStatus("U12345678", "Test", ":test:", 0);
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("not_allowed"), true);
    }
  });
});
