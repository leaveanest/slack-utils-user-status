/**
 * チームステータストリガー
 * ショートカットからチームステータスワークフローを起動
 */
import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import { TeamStatusWorkflow } from "../workflows/team_status_workflow.ts";

/**
 * チームステータスショートカットトリガー
 *
 * Slackのショートカットメニューから「Team Status」を選択すると、
 * チームメンバーのステータス一覧がモーダルで表示されます。
 */
const TeamStatusTrigger: Trigger<typeof TeamStatusWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "チームステータス",
  description: "チームメンバーのステータスを確認します",
  workflow: `#/workflows/${TeamStatusWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default TeamStatusTrigger;
