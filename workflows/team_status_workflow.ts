/**
 * チームステータスワークフロー
 * チームメンバーのステータス一覧をモーダルで表示
 */
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ShowTeamStatusDefinition } from "../functions/show_team_status/mod.ts";

/**
 * チームステータスワークフロー定義
 *
 * ショートカットトリガーからinteractivityとuser_idを受け取り、
 * チームメンバーのステータス一覧をモーダルで表示するワークフロー
 */
const TeamStatusWorkflow = DefineWorkflow({
  callback_id: "team_status_workflow",
  title: "Team Status",
  description: "View team members status",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "Interactivity context from the trigger",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID who triggered the workflow",
      },
    },
    required: ["interactivity", "user_id"],
  },
});

/**
 * チームステータスモーダルを表示
 */
TeamStatusWorkflow.addStep(ShowTeamStatusDefinition, {
  interactivity: TeamStatusWorkflow.inputs.interactivity,
  user_id: TeamStatusWorkflow.inputs.user_id,
});

export { TeamStatusWorkflow };
