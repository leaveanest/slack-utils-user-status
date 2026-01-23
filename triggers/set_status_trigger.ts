/**
 * ステータス設定トリガー
 * ショートカットからステータス設定ワークフローを起動
 */
import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import { SetStatusWorkflow } from "../workflows/set_status_workflow.ts";

/**
 * ステータス設定ショートカットトリガー
 *
 * Slackのショートカットメニューから「Set Status」を選択すると、
 * ステータス設定モーダルが表示されます。
 */
const SetStatusTrigger: Trigger<typeof SetStatusWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Set Status",
  description: "Set your Slack status",
  workflow: `#/workflows/${SetStatusWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default SetStatusTrigger;
