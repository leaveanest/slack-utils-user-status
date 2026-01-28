/**
 * User Token モジュールのテスト
 */
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "std/testing/asserts.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import {
  clearStatusWithUserToken,
  setStatusWithUserToken,
} from "./user-token.ts";

const TEST_ADMIN_TOKEN = "xoxp-test-token";

describe({
  name: "setStatusWithUserToken",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("正常にステータスを設定できる", async () => {
      // モックレスポンスを設定
      globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        // リクエストの検証
        const url = input.toString();
        assertStringIncludes(url, "users.profile.set");

        const headers = init?.headers as Record<string, string>;
        assertStringIncludes(
          headers["Authorization"],
          `Bearer ${TEST_ADMIN_TOKEN}`,
        );

        const body = JSON.parse(init?.body as string);
        assertEquals(body.user, "U12345678");
        assertEquals(body.profile.status_text, "In a meeting");
        assertEquals(body.profile.status_emoji, ":calendar:");
        assertEquals(body.profile.status_expiration, 1706000000);

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      };

      const result = await setStatusWithUserToken(
        TEST_ADMIN_TOKEN,
        "U12345678",
        "In a meeting",
        ":calendar:",
        1706000000,
      );

      assertEquals(result.ok, true);
    });

    it("APIエラー時にエラーレスポンスを返す", async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: false, error: "user_not_found" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      };

      const result = await setStatusWithUserToken(
        TEST_ADMIN_TOKEN,
        "U00000000",
        "Test",
        ":test:",
        0,
      );

      assertEquals(result.ok, false);
      assertEquals(result.error, "user_not_found");
    });

    it("HTTPエラー時に例外を投げる", async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: false, error: "http_error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      };

      await assertRejects(
        () =>
          setStatusWithUserToken(
            TEST_ADMIN_TOKEN,
            "U12345678",
            "Test",
            ":test:",
            0,
          ),
        Error,
      );
    });
  },
});

describe({
  name: "clearStatusWithUserToken",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("正常にステータスをクリアできる", async () => {
      globalThis.fetch = (
        _input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const body = JSON.parse(init?.body as string);
        // クリア時は空文字と0が設定される
        assertEquals(body.profile.status_text, "");
        assertEquals(body.profile.status_emoji, "");
        assertEquals(body.profile.status_expiration, 0);

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      };

      const result = await clearStatusWithUserToken(
        TEST_ADMIN_TOKEN,
        "U12345678",
      );

      assertEquals(result.ok, true);
    });
  },
});
