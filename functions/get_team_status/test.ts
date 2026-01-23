import { assertEquals } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import {
  filterMembersWithStatus,
  getTeamMemberStatuses,
  type TeamMemberStatus,
} from "./mod.ts";

// Mock member type
interface MockMember {
  id: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  profile?: {
    display_name?: string;
    real_name?: string;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  };
}

// Mock response type
interface MockUsersListResponse {
  ok: boolean;
  members?: MockMember[];
  error?: string;
}

// テスト用のモックメンバー
function createMockMember(
  overrides: Partial<MockMember> = {},
): MockMember {
  return {
    id: "U12345678",
    deleted: false,
    is_bot: false,
    is_app_user: false,
    profile: {
      display_name: "Test User",
      real_name: "Test User Real Name",
      status_text: "Working",
      status_emoji: ":laptop:",
      status_expiration: 0,
    },
    ...overrides,
  };
}

Deno.test({
  name: "getTeamMemberStatuses: 正常にチームメンバーのステータスを取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockMembers = [
      createMockMember({ id: "U11111111" }),
      createMockMember({
        id: "U22222222",
        profile: {
          display_name: "User 2",
          real_name: "User Two",
          status_text: "In a meeting",
          status_emoji: ":calendar:",
          status_expiration: 1706000000,
        },
      }),
    ];

    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: mockMembers,
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 2);
    assertEquals(members[0].user_id, "U11111111");
    assertEquals(members[0].status_text, "Working");
    assertEquals(members[1].user_id, "U22222222");
    assertEquals(members[1].status_emoji, ":calendar:");
  },
});

Deno.test({
  name: "getTeamMemberStatuses: ボットユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockMembers = [
      createMockMember({ id: "U11111111" }),
      createMockMember({ id: "B22222222", is_bot: true }),
    ];

    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: mockMembers,
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 1);
    assertEquals(members[0].user_id, "U11111111");
  },
});

Deno.test({
  name: "getTeamMemberStatuses: アプリユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockMembers = [
      createMockMember({ id: "U11111111" }),
      createMockMember({ id: "U22222222", is_app_user: true }),
    ];

    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: mockMembers,
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 1);
    assertEquals(members[0].user_id, "U11111111");
  },
});

Deno.test({
  name: "getTeamMemberStatuses: 削除済みユーザーを除外する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockMembers = [
      createMockMember({ id: "U11111111" }),
      createMockMember({ id: "U22222222", deleted: true }),
    ];

    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: mockMembers,
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 1);
    assertEquals(members[0].user_id, "U11111111");
  },
});

Deno.test({
  name: "getTeamMemberStatuses: プロファイルがない場合はデフォルト値を使用",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockMembers = [
      {
        id: "U11111111",
        deleted: false,
        is_bot: false,
        is_app_user: false,
        profile: undefined,
      },
    ];

    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: mockMembers,
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 1);
    assertEquals(members[0].user_id, "U11111111");
    assertEquals(members[0].display_name, "U11111111");
    assertEquals(members[0].status_text, "");
    assertEquals(members[0].status_emoji, "");
  },
});

Deno.test({
  name: "getTeamMemberStatuses: メンバーが空の場合は空配列を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: true,
            members: [],
          }),
      },
    } as unknown as SlackAPIClient;

    const members = await getTeamMemberStatuses(mockClient, 50);

    assertEquals(members.length, 0);
  },
});

Deno.test({
  name: "getTeamMemberStatuses: APIエラー時は例外を投げる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockClient = {
      users: {
        list: (): Promise<MockUsersListResponse> =>
          Promise.resolve({
            ok: false,
            error: "ratelimited",
          }),
      },
    } as unknown as SlackAPIClient;

    try {
      await getTeamMemberStatuses(mockClient, 50);
      assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("ratelimited"), true);
    }
  },
});

Deno.test({
  name: "filterMembersWithStatus: ステータスを持つメンバーのみを返す",
  fn: () => {
    const members: TeamMemberStatus[] = [
      {
        user_id: "U11111111",
        display_name: "User 1",
        real_name: "User One",
        status_text: "Working",
        status_emoji: ":laptop:",
        status_expiration: 0,
      },
      {
        user_id: "U22222222",
        display_name: "User 2",
        real_name: "User Two",
        status_text: "",
        status_emoji: "",
        status_expiration: 0,
      },
      {
        user_id: "U33333333",
        display_name: "User 3",
        real_name: "User Three",
        status_text: "",
        status_emoji: ":calendar:",
        status_expiration: 0,
      },
    ];

    const filtered = filterMembersWithStatus(members);

    assertEquals(filtered.length, 2);
    assertEquals(filtered[0].user_id, "U11111111");
    assertEquals(filtered[1].user_id, "U33333333");
  },
});

Deno.test({
  name: "filterMembersWithStatus: 全員ステータスなしの場合は空配列を返す",
  fn: () => {
    const members: TeamMemberStatus[] = [
      {
        user_id: "U11111111",
        display_name: "User 1",
        real_name: "User One",
        status_text: "",
        status_emoji: "",
        status_expiration: 0,
      },
    ];

    const filtered = filterMembersWithStatus(members);

    assertEquals(filtered.length, 0);
  },
});
