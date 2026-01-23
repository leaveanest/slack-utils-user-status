/**
 * ステータス設定ワークフロー
 * モーダルを表示してユーザーのステータスを設定
 */
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ShowStatusFormDefinition } from "../functions/show_status_form/mod.ts";

/**
 * ステータス設定ワークフロー定義
 *
 * ショートカットトリガーからinteractivityとuser_idを受け取り、
 * ステータス設定モーダルを表示するワークフロー
 */
const SetStatusWorkflow = DefineWorkflow({
  callback_id: "set_status_workflow",
  title: "Set Status",
  description: "Set your Slack status",
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
 * ステータス設定フォームを表示
 */
SetStatusWorkflow.addStep(ShowStatusFormDefinition, {
  interactivity: SetStatusWorkflow.inputs.interactivity,
  user_id: SetStatusWorkflow.inputs.user_id,
});

export { SetStatusWorkflow };
