import { assertEquals } from "std/testing/asserts.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { clearUserStatus } from "./mod.ts";

const TEST_ADMIN_TOKEN = "xoxp-test-token";

describe("clearUserStatus", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("正常にステータスをクリアできる", async () => {
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

    await clearUserStatus(TEST_ADMIN_TOKEN, "U12345678");

    // リクエストボディが正しくクリアされたか確認
    assertEquals(capturedBody !== undefined, true);
    const parsed = JSON.parse(capturedBody!);
    assertEquals(parsed.user, "U12345678");
    assertEquals(parsed.profile.status_text, "");
    assertEquals(parsed.profile.status_emoji, "");
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
      await clearUserStatus(TEST_ADMIN_TOKEN, "U12345678");
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("not_allowed"), true);
    }
  });
});
