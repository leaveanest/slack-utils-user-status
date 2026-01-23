import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { clearUserStatus } from "./mod.ts";

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
  name: "clearUserStatus: 正常にステータスをクリアできる",
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

    await clearUserStatus(mockClient, "U12345678");

    // プロファイルが正しくクリアされたか確認
    assertEquals(capturedProfile !== undefined, true);
    const parsed = JSON.parse(capturedProfile!);
    assertEquals(parsed.status_text, "");
    assertEquals(parsed.status_emoji, "");
    assertEquals(parsed.status_expiration, 0);
  },
});

Deno.test({
  name: "clearUserStatus: APIエラー時は例外を投げる",
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
      await clearUserStatus(mockClient, "U12345678");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("not_allowed"), true);
    }
  },
});
