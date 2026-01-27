/**
 * クイックステータスワークフロー
 * プリセット選択モーダルを表示して素早くステータスを設定
 */
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ShowPresetSelectorDefinition } from "../functions/show_preset_selector/mod.ts";

/**
 * クイックステータスワークフロー定義
 *
 * ショートカットトリガーからinteractivityとuser_idを受け取り、
 * プリセット選択モーダルを表示するワークフロー
 */
const QuickStatusWorkflow = DefineWorkflow({
  callback_id: "quick_status_workflow",
  title: "クイックステータス",
  description: "プリセットから素早くステータスを設定します",
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
 * プリセット選択モーダルを表示
 */
QuickStatusWorkflow.addStep(ShowPresetSelectorDefinition, {
  interactivity: QuickStatusWorkflow.inputs.interactivity,
  user_id: QuickStatusWorkflow.inputs.user_id,
});

export { QuickStatusWorkflow };
