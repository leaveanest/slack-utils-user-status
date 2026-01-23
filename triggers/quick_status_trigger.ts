/**
 * クイックステータストリガー
 * ショートカットからクイックステータスワークフローを起動
 */
import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import { QuickStatusWorkflow } from "../workflows/quick_status_workflow.ts";

/**
 * クイックステータスショートカットトリガー
 *
 * Slackのショートカットメニューから「Quick Status」を選択すると、
 * プリセット選択モーダルが表示されます。
 */
const QuickStatusTrigger: Trigger<typeof QuickStatusWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Quick Status",
  description: "Quickly set status from presets",
  workflow: `#/workflows/${QuickStatusWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default QuickStatusTrigger;
