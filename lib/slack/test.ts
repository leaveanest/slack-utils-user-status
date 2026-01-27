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
  getAdminUserToken,
  setStatusWithUserToken,
} from "./user-token.ts";

describe({
  name: "getAdminUserToken",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const originalToken = Deno.env.get("SLACK_ADMIN_USER_TOKEN");

    afterEach(() => {
      // テスト後に元の環境変数を復元
      if (originalToken) {
        Deno.env.set("SLACK_ADMIN_USER_TOKEN", originalToken);
      } else {
        Deno.env.delete("SLACK_ADMIN_USER_TOKEN");
      }
    });

    it("環境変数が設定されている場合はトークンを返す", () => {
      const testToken = "xoxp-test-token";
      Deno.env.set("SLACK_ADMIN_USER_TOKEN", testToken);

      const result = getAdminUserToken();

      assertEquals(result, testToken);
    });

    it("環境変数が設定されていない場合はエラーを投げる", () => {
      Deno.env.delete("SLACK_ADMIN_USER_TOKEN");

      try {
        getAdminUserToken();
        throw new Error("Should have thrown an error");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        assertStringIncludes(message.toLowerCase(), "token");
      }
    });
  },
});

describe({
  name: "setStatusWithUserToken",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
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
      // モックレスポンスを設定
      globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        // リクエストの検証
        const url = input.toString();
        assertStringIncludes(url, "users.profile.set");

        const headers = init?.headers as Record<string, string>;
        assertStringIncludes(
          headers["Authorization"],
          "Bearer xoxp-test-token",
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
        () => setStatusWithUserToken("U12345678", "Test", ":test:", 0),
        Error,
      );
    });

    it("トークンが設定されていない場合はエラーを投げる", async () => {
      Deno.env.delete("SLACK_ADMIN_USER_TOKEN");

      await assertRejects(
        () => setStatusWithUserToken("U12345678", "Test", ":test:", 0),
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

      const result = await clearStatusWithUserToken("U12345678");

      assertEquals(result.ok, true);
    });
  },
});
