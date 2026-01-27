import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { recordStatusHistory, recordStatusHistorySilent } from "./history.ts";
import type { StatusHistory } from "../types/status.ts";
import { initI18n } from "../i18n/mod.ts";

// Mock response type
interface MockDatastorePutResponse {
  ok: boolean;
  item?: StatusHistory;
  error?: string;
}

Deno.test({
  name: "recordStatusHistory: 正常に履歴を記録できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedItem: StatusHistory | undefined;

    const mockClient = {
      apps: {
        datastore: {
          put: (
            args: { datastore: string; item: StatusHistory },
          ): Promise<MockDatastorePutResponse> => {
            capturedItem = args.item;
            return Promise.resolve({ ok: true, item: args.item });
          },
        },
      },
    } as unknown as SlackAPIClient;

    const historyId = await recordStatusHistory(
      mockClient,
      "U12345678",
      "In a meeting",
      ":calendar:",
      1706000000,
      "manual",
    );

    assertEquals(typeof historyId, "string");
    assertEquals(historyId.length > 0, true);
    assertEquals(capturedItem?.user_id, "U12345678");
    assertEquals(capturedItem?.status_text, "In a meeting");
    assertEquals(capturedItem?.status_emoji, ":calendar:");
    assertEquals(capturedItem?.expiration, 1706000000);
    assertEquals(capturedItem?.source, "manual");
    assertEquals(typeof capturedItem?.changed_at, "string");
  },
});

Deno.test({
  name: "recordStatusHistory: presetソースを正しく記録",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedItem: StatusHistory | undefined;

    const mockClient = {
      apps: {
        datastore: {
          put: (
            args: { datastore: string; item: StatusHistory },
          ): Promise<MockDatastorePutResponse> => {
            capturedItem = args.item;
            return Promise.resolve({ ok: true, item: args.item });
          },
        },
      },
    } as unknown as SlackAPIClient;

    await recordStatusHistory(
      mockClient,
      "U12345678",
      "Working from home",
      ":house:",
      0,
      "preset",
    );

    assertEquals(capturedItem?.source, "preset");
  },
});

Deno.test({
  name: "recordStatusHistory: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // i18nの初期化を待つ（レースコンディション対策）
    await initI18n();

    const mockClient = {
      apps: {
        datastore: {
          put: (): Promise<MockDatastorePutResponse> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    try {
      await recordStatusHistory(
        mockClient,
        "U12345678",
        "Test",
        ":test:",
        0,
        "manual",
      );
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("datastore_error"), true);
    }
  },
});

Deno.test({
  name: "recordStatusHistorySilent: エラーを投げずにログ出力のみ",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      apps: {
        datastore: {
          put: (): Promise<MockDatastorePutResponse> =>
            Promise.resolve({
              ok: false,
              error: "datastore_error",
            }),
        },
      },
    } as unknown as SlackAPIClient;

    // エラーを投げないことを確認
    await recordStatusHistorySilent(
      mockClient,
      "U12345678",
      "Test",
      ":test:",
      0,
      "manual",
    );

    // 正常終了すればOK
    assertEquals(true, true);
  },
});

Deno.test({
  name: "recordStatusHistorySilent: 正常時は履歴を記録",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    let capturedItem: StatusHistory | undefined;

    const mockClient = {
      apps: {
        datastore: {
          put: (
            args: { datastore: string; item: StatusHistory },
          ): Promise<MockDatastorePutResponse> => {
            capturedItem = args.item;
            return Promise.resolve({ ok: true, item: args.item });
          },
        },
      },
    } as unknown as SlackAPIClient;

    await recordStatusHistorySilent(
      mockClient,
      "U12345678",
      "Working",
      ":laptop:",
      0,
      "schedule",
    );

    assertEquals(capturedItem?.user_id, "U12345678");
    assertEquals(capturedItem?.source, "schedule");
  },
});
