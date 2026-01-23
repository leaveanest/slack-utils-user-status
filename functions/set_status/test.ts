import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
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

interface MockProfileSetResponse {
  ok: boolean;
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

Deno.test({
  name: "setUserStatus: 正常にステータスを設定できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedProfile: string | undefined;

    const mockClient = {
      users: {
        profile: {
          set: (
            args: { user: string; profile: string },
          ): Promise<MockProfileSetResponse> => {
            capturedProfile = args.profile;
            return Promise.resolve({ ok: true });
          },
        },
      },
    } as unknown as SlackAPIClient;

    await setUserStatus(
      mockClient,
      "U12345678",
      "In a meeting",
      ":calendar:",
      60,
    );

    // プロファイルが正しく設定されたか確認
    assertEquals(capturedProfile !== undefined, true);
    const parsed = JSON.parse(capturedProfile!);
    assertEquals(parsed.status_text, "In a meeting");
    assertEquals(parsed.status_emoji, ":calendar:");
    assertEquals(parsed.status_expiration > 0, true);
  },
});

Deno.test({
  name: "setUserStatus: 有効期限0の場合はstatus_expirationも0",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedProfile: string | undefined;

    const mockClient = {
      users: {
        profile: {
          set: (
            args: { user: string; profile: string },
          ): Promise<MockProfileSetResponse> => {
            capturedProfile = args.profile;
            return Promise.resolve({ ok: true });
          },
        },
      },
    } as unknown as SlackAPIClient;

    await setUserStatus(mockClient, "U12345678", "Away", ":away:", 0);

    const parsed = JSON.parse(capturedProfile!);
    assertEquals(parsed.status_expiration, 0);
  },
});

Deno.test({
  name: "setUserStatus: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        profile: {
          set: (): Promise<MockProfileSetResponse> =>
            Promise.resolve({
              ok: false,
              error: "not_allowed",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await setUserStatus(mockClient, "U12345678", "Test", ":test:", 0);
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("not_allowed"), true);
    }
  },
});
