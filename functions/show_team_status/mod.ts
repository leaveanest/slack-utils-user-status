/**
 * チームステータスモーダル表示Function
 * チームメンバーのステータス一覧をモーダルで表示
 */
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { t } from "../../lib/i18n/mod.ts";
import { userIdSchema } from "../../lib/validation/schemas.ts";
import {
  getTeamMemberStatuses,
  type TeamMemberStatus,
} from "../get_team_status/mod.ts";

/**
 * モーダルコールバックID
 */
export const TEAM_STATUS_MODAL_CALLBACK_ID = "team_status_modal";

/**
 * チームステータスモーダル表示Function定義
 */
export const ShowTeamStatusDefinition = DefineFunction({
  callback_id: "show_team_status",
  title: "Show Team Status",
  description: "Display team member statuses in a modal",
  source_file: "functions/show_team_status/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID who triggered the modal",
      },
      limit: {
        type: Schema.types.integer,
        description: "Maximum number of members to display (default: 50)",
      },
    },
    required: ["interactivity", "user_id"],
  },
  output_parameters: {
    properties: {
      member_count: {
        type: Schema.types.integer,
        description: "Number of members displayed",
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
 * private_metadataの型
 */
export interface PrivateMetadata {
  user_id: string;
}

/**
 * メンバーステータスからブロックを生成
 *
 * @param member - メンバーのステータス情報
 * @returns Slackブロック
 */
export function buildMemberStatusBlock(
  member: TeamMemberStatus,
): Record<string, unknown> {
  const hasStatus = member.status_text || member.status_emoji;

  let statusText: string;
  if (hasStatus) {
    const emoji = member.status_emoji || "";
    const text = member.status_text || "";
    statusText = `${emoji} ${text}`.trim();
  } else {
    statusText = `_${t("status.team.no_status")}_`;
  }

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${member.display_name}*\n${statusText}`,
    },
  };
}

/**
 * チームステータスモーダルのブロックを生成
 *
 * @param members - メンバーステータスの配列
 * @returns Slackブロックの配列
 */
export function buildTeamStatusBlocks(
  members: TeamMemberStatus[],
): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];

  // ヘッダー
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `${t("status.team.title")} (${
        t("status.team.member_count", { count: members.length })
      })`,
      emoji: true,
    },
  });

  if (members.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_${t("status.team.no_members")}_`,
      },
    });
    return blocks;
  }

  // ステータスありのメンバーを先に表示
  const membersWithStatus = members.filter(
    (m) => m.status_text || m.status_emoji,
  );
  const membersWithoutStatus = members.filter(
    (m) => !m.status_text && !m.status_emoji,
  );

  // ステータスありセクション
  if (membersWithStatus.length > 0) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:speech_balloon: *Status Set (${membersWithStatus.length})*`,
        },
      ],
    });
    blocks.push({ type: "divider" });

    for (const member of membersWithStatus) {
      blocks.push(buildMemberStatusBlock(member));
    }
  }

  // ステータスなしセクション
  if (membersWithoutStatus.length > 0) {
    if (membersWithStatus.length > 0) {
      blocks.push({ type: "divider" });
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:grey_question: *No Status (${membersWithoutStatus.length})*`,
        },
      ],
    });

    // ステータスなしのメンバーは簡略表示（最大10人）
    const displayMembers = membersWithoutStatus.slice(0, 10);
    const names = displayMembers.map((m) => m.display_name).join(", ");
    const remaining = membersWithoutStatus.length - displayMembers.length;

    let text = names;
    if (remaining > 0) {
      text += ` +${remaining} more`;
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    });
  }

  return blocks;
}

/**
 * ローディングモーダルビューを構築
 *
 * @param userId - ユーザーID
 * @returns モーダルビューオブジェクト
 */
export function buildLoadingView(userId: string): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: TEAM_STATUS_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.team.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:hourglass_flowing_sand: ${t("status.team.loading")}`,
        },
      },
    ],
  };
}

/**
 * チームステータスモーダルビューを構築
 *
 * @param userId - ユーザーID
 * @param members - メンバーステータスの配列
 * @returns モーダルビューオブジェクト
 */
export function buildTeamStatusView(
  userId: string,
  members: TeamMemberStatus[],
): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: TEAM_STATUS_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.team.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: buildTeamStatusBlocks(members),
  };
}

/**
 * エラー表示モーダルビューを構築
 *
 * @param userId - ユーザーID
 * @param errorMessage - エラーメッセージ
 * @returns モーダルビューオブジェクト
 */
export function buildErrorView(
  userId: string,
  errorMessage: string,
): Record<string, unknown> {
  const privateMetadata: PrivateMetadata = { user_id: userId };

  return {
    type: "modal",
    callback_id: TEAM_STATUS_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: {
      type: "plain_text",
      text: t("status.team.title"),
    },
    close: {
      type: "plain_text",
      text: t("status.form.cancel"),
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:warning: ${t("status.team.error", { error: errorMessage })}`,
        },
      },
    ],
  };
}

export default SlackFunction(
  ShowTeamStatusDefinition,
  async ({ inputs, client }) => {
    let viewId: string | undefined;
    let userId: string = "";

    try {
      // ユーザーIDのバリデーション
      userId = userIdSchema.parse(inputs.user_id);
      const limit = inputs.limit || 50;

      // ローディングモーダルを表示（3秒タイムアウト対策）
      const loadingView = buildLoadingView(userId);

      const openResult = await client.views.open({
        trigger_id: inputs.interactivity.interactivity_pointer,
        view: loadingView,
      });

      if (!openResult.ok) {
        const errorCode = openResult.error ?? "unknown_error";
        throw new Error(
          t("status.messages.modal_open_failed", { error: errorCode }),
        );
      }

      viewId = (openResult.view as { id: string })?.id;

      // チームメンバーのステータスを取得
      const members = await getTeamMemberStatuses(
        client as unknown as SlackAPIClient,
        limit,
      );

      // モーダルを更新
      const teamStatusView = buildTeamStatusView(userId, members);

      await client.views.update({
        view_id: viewId,
        view: teamStatusView,
      });

      return {
        outputs: {
          member_count: members.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("show_team_status error:", message);

      // viewIdが取得できている場合はエラー表示に更新
      if (viewId) {
        try {
          const errorView = buildErrorView(userId, message);
          await client.views.update({
            view_id: viewId,
            view: errorView,
          });
        } catch (updateError) {
          console.error("Failed to update modal with error:", updateError);
        }
      }

      return {
        outputs: {
          member_count: 0,
          error: message,
        },
      };
    }
  },
);
