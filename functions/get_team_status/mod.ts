/**
 * チームステータス取得Function
 * チームメンバーのステータス一覧を取得
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";

/**
 * チームメンバーのステータス情報
 */
export interface TeamMemberStatus {
  /** ユーザーID */
  user_id: string;
  /** 表示名 */
  display_name: string;
  /** 本名 */
  real_name: string;
  /** ステータステキスト */
  status_text: string;
  /** ステータス絵文字 */
  status_emoji: string;
  /** ステータス有効期限 */
  status_expiration: number;
}

/**
 * チームステータス取得Function定義
 */
export const GetTeamStatusDefinition = DefineFunction({
  callback_id: "get_team_status",
  title: "Get Team Status",
  description: "Get status of team members",
  source_file: "functions/get_team_status/mod.ts",
  input_parameters: {
    properties: {
      limit: {
        type: Schema.types.integer,
        description: "Maximum number of members to fetch (default: 50)",
      },
    },
    required: [],
  },
  output_parameters: {
    properties: {
      members: {
        type: Schema.types.array,
        items: {
          type: Schema.types.object,
          properties: {
            user_id: { type: Schema.types.string },
            display_name: { type: Schema.types.string },
            real_name: { type: Schema.types.string },
            status_text: { type: Schema.types.string },
            status_emoji: { type: Schema.types.string },
            status_expiration: { type: Schema.types.integer },
          },
        },
        description: "List of team member statuses",
      },
      count: {
        type: Schema.types.integer,
        description: "Number of members returned",
      },
      error: {
        type: Schema.types.string,
        description: "Error message if failed",
      },
    },
    required: [],
  },
});

/**
 * users.list API レスポンスの型
 */
interface UsersListResponse {
  ok: boolean;
  members?: Array<{
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
  }>;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

/**
 * チームメンバーのステータス一覧を取得
 *
 * users.list APIを使用してチームメンバーを取得し、
 * 各メンバーのプロファイル情報からステータスを抽出します。
 * ページネーションに対応し、limitまでのメンバーを取得します。
 *
 * @param client - Slack APIクライアント
 * @param limit - 取得するメンバーの最大数
 * @returns チームメンバーのステータス一覧
 * @throws {Error} API呼び出しに失敗した場合
 *
 * @example
 * ```typescript
 * const members = await getTeamMemberStatuses(client, 50);
 * for (const member of members) {
 *   console.log(`${member.display_name}: ${member.status_emoji} ${member.status_text}`);
 * }
 * ```
 */
export async function getTeamMemberStatuses(
  client: SlackAPIClient,
  limit: number,
): Promise<TeamMemberStatus[]> {
  const members: TeamMemberStatus[] = [];
  let cursor: string | undefined;

  do {
    // API最大は200、残り必要数を考慮してリクエスト
    const requestLimit = Math.min(limit - members.length, 200);

    const response = await client.users.list({
      limit: requestLimit,
      cursor,
    }) as UsersListResponse;

    if (!response.ok) {
      const errorCode = response.error ?? "unknown_error";
      throw new Error(t("status.errors.api_call_failed", { error: errorCode }));
    }

    for (const user of response.members ?? []) {
      // ボット、アプリユーザー、削除済みユーザーを除外
      if (user.is_bot || user.is_app_user || user.deleted) {
        continue;
      }

      const profile = user.profile ?? {};

      members.push({
        user_id: user.id,
        display_name: profile.display_name || profile.real_name || user.id,
        real_name: profile.real_name || "",
        status_text: profile.status_text || "",
        status_emoji: profile.status_emoji || "",
        status_expiration: profile.status_expiration || 0,
      });

      // limitに達したら終了
      if (members.length >= limit) {
        return members;
      }
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor && members.length < limit);

  return members;
}

/**
 * ステータスを持つメンバーをフィルタリング
 *
 * @param members - 全メンバーのステータス
 * @returns ステータスが設定されているメンバー
 */
export function filterMembersWithStatus(
  members: TeamMemberStatus[],
): TeamMemberStatus[] {
  return members.filter(
    (member) => member.status_text || member.status_emoji,
  );
}

export default SlackFunction(
  GetTeamStatusDefinition,
  async ({ inputs, client }) => {
    try {
      const limit = inputs.limit || 50;

      // チームメンバーのステータスを取得
      const members = await getTeamMemberStatuses(client, limit);

      return {
        outputs: {
          members,
          count: members.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("get_team_status error:", message);

      return {
        outputs: {
          members: [],
          count: 0,
          error: message,
        },
      };
    }
  },
);
