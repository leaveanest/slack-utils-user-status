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
  title: "ステータス設定",
  description: "Slackのステータスを設定します",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "トリガーからのインタラクティビティコンテキスト",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "ワークフローを起動したユーザーのID",
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
