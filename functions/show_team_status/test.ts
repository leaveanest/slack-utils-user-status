import { assertEquals } from "std/testing/asserts.ts";
import {
  buildErrorView,
  buildLoadingView,
  buildMemberStatusBlock,
  buildTeamStatusBlocks,
  buildTeamStatusView,
  type PrivateMetadata,
  TEAM_STATUS_MODAL_CALLBACK_ID,
} from "./mod.ts";
import type { TeamMemberStatus } from "../get_team_status/mod.ts";

// テスト用のモックメンバー
function createMockMember(
  overrides: Partial<TeamMemberStatus> = {},
): TeamMemberStatus {
  return {
    user_id: "U12345678",
    display_name: "Test User",
    real_name: "Test User Real Name",
    status_text: "Working",
    status_emoji: ":laptop:",
    status_expiration: 0,
    ...overrides,
  };
}

Deno.test({
  name: "buildMemberStatusBlock: ステータスありのメンバーを正しく表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const member = createMockMember({
      display_name: "John Doe",
      status_text: "In a meeting",
      status_emoji: ":calendar:",
    });

    const block = buildMemberStatusBlock(member);

    assertEquals(block.type, "section");
    const text = block.text as Record<string, unknown>;
    assertEquals(text.type, "mrkdwn");
    assertEquals((text.text as string).includes("*John Doe*"), true);
    assertEquals((text.text as string).includes(":calendar:"), true);
    assertEquals((text.text as string).includes("In a meeting"), true);
  },
});

Deno.test({
  name: "buildMemberStatusBlock: ステータスなしのメンバーを正しく表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const member = createMockMember({
      display_name: "Jane Doe",
      status_text: "",
      status_emoji: "",
    });

    const block = buildMemberStatusBlock(member);

    assertEquals(block.type, "section");
    const text = block.text as Record<string, unknown>;
    assertEquals((text.text as string).includes("*Jane Doe*"), true);
    // "No status set" or similar message in italics
    assertEquals((text.text as string).includes("_"), true);
  },
});

Deno.test({
  name: "buildMemberStatusBlock: 絵文字のみのステータスを正しく表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const member = createMockMember({
      display_name: "Bob",
      status_text: "",
      status_emoji: ":palm_tree:",
    });

    const block = buildMemberStatusBlock(member);

    const text = block.text as Record<string, unknown>;
    const textStr = text.text as string;
    assertEquals(textStr.includes(":palm_tree:"), true);
    // Should not show "No status set" in italic format (_text_)
    // Note: emoji contains underscore, so we check for the pattern _word_ instead
    assertEquals(/\*Bob\*/.test(textStr), true);
    assertEquals(textStr.includes("No status"), false);
  },
});

Deno.test({
  name: "buildTeamStatusBlocks: メンバーが空の場合はno_membersメッセージを表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const blocks = buildTeamStatusBlocks([]);

    // ヘッダー + no_membersメッセージの2ブロック
    assertEquals(blocks.length, 2);
    assertEquals(blocks[0].type, "header");

    const secondBlock = blocks[1] as Record<string, unknown>;
    assertEquals(secondBlock.type, "section");
    const text = secondBlock.text as Record<string, unknown>;
    assertEquals((text.text as string).includes("_"), true);
  },
});

Deno.test({
  name: "buildTeamStatusBlocks: ステータスありのメンバーを先に表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const members = [
      createMockMember({
        user_id: "U111",
        display_name: "No Status User",
        status_text: "",
        status_emoji: "",
      }),
      createMockMember({
        user_id: "U222",
        display_name: "Has Status User",
        status_text: "Working",
        status_emoji: ":laptop:",
      }),
    ];

    const blocks = buildTeamStatusBlocks(members);

    // ヘッダー + context + divider + statusあり + divider + context + statusなし
    assertEquals(blocks.length >= 5, true);

    // "ステータスあり" contextが "ステータスなし" contextより前にある
    const statusSetIndex = blocks.findIndex(
      (b) =>
        b.type === "context" &&
        JSON.stringify(b).includes("ステータスあり"),
    );
    const noStatusIndex = blocks.findIndex(
      (b) =>
        b.type === "context" &&
        JSON.stringify(b).includes("ステータスなし"),
    );

    assertEquals(statusSetIndex < noStatusIndex, true);
  },
});

Deno.test({
  name: "buildTeamStatusBlocks: 全員ステータスありの場合は正しく表示",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const members = [
      createMockMember({
        user_id: "U111",
        display_name: "User 1",
        status_text: "Working",
        status_emoji: ":laptop:",
      }),
      createMockMember({
        user_id: "U222",
        display_name: "User 2",
        status_text: "Meeting",
        status_emoji: ":calendar:",
      }),
    ];

    const blocks = buildTeamStatusBlocks(members);

    // "No Status" contextは含まれない
    const hasNoStatusContext = blocks.some(
      (b) =>
        b.type === "context" &&
        JSON.stringify(b).includes("No Status"),
    );
    assertEquals(hasNoStatusContext, false);
  },
});

Deno.test({
  name: "buildLoadingView: 正しいローディングビュー構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const view = buildLoadingView(userId);

    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, TEAM_STATUS_MODAL_CALLBACK_ID);

    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(blocks.length, 1);

    const text = blocks[0].text as Record<string, unknown>;
    assertEquals(
      (text.text as string).includes(":hourglass_flowing_sand:"),
      true,
    );
  },
});

Deno.test({
  name: "buildTeamStatusView: 正しいビュー構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const members = [
      createMockMember({ user_id: "U111", display_name: "User 1" }),
    ];

    const view = buildTeamStatusView(userId, members);

    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, TEAM_STATUS_MODAL_CALLBACK_ID);

    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(blocks.length > 0, true);
    assertEquals(blocks[0].type, "header");
  },
});

Deno.test({
  name: "buildErrorView: 正しいエラービュー構造を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    const userId = "U12345678";
    const errorMessage = "API call failed: ratelimited";

    const view = buildErrorView(userId, errorMessage);

    assertEquals(view.type, "modal");
    assertEquals(view.callback_id, TEAM_STATUS_MODAL_CALLBACK_ID);

    const metadata: PrivateMetadata = JSON.parse(
      view.private_metadata as string,
    );
    assertEquals(metadata.user_id, userId);

    const blocks = view.blocks as Array<Record<string, unknown>>;
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0].type, "section");

    const text = blocks[0].text as Record<string, unknown>;
    assertEquals(text.type, "mrkdwn");
    assertEquals((text.text as string).includes(":warning:"), true);
    // エラーメッセージが含まれていることを確認
    assertEquals((text.text as string).includes(errorMessage), true);
  },
});
