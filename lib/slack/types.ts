/**
 * Slack Deno SDK用カスタム型定義
 *
 * マニフェストの配列items定義で使用するカスタム型を定義します。
 * Slack Deno SDK v2では、配列のitemsにインラインでオブジェクト構造を
 * 定義できないため、DefineTypeで定義したカスタム型を参照する必要があります。
 *
 * @see https://docs.slack.dev/tools/deno-slack-sdk/guides/creating-a-custom-type/
 */
import { DefineType, Schema } from "deno-slack-sdk/mod.ts";

/**
 * チームメンバーステータス型
 *
 * get_team_status関数の出力で使用するメンバーステータス情報の型です。
 */
export const TeamMemberStatusType = DefineType({
  name: "TeamMemberStatus",
  type: Schema.types.object,
  properties: {
    user_id: { type: Schema.types.string },
    display_name: { type: Schema.types.string },
    real_name: { type: Schema.types.string },
    status_text: { type: Schema.types.string },
    status_emoji: { type: Schema.types.string },
    status_expiration: { type: Schema.types.integer },
  },
  required: [],
});

/**
 * ステータスプリセット型
 *
 * list_presets関数の出力で使用するプリセット情報の型です。
 */
export const StatusPresetType = DefineType({
  name: "StatusPreset",
  type: Schema.types.object,
  properties: {
    id: { type: Schema.types.string },
    user_id: { type: Schema.types.string },
    name: { type: Schema.types.string },
    status_text: { type: Schema.types.string },
    status_emoji: { type: Schema.types.string },
    duration_minutes: { type: Schema.types.integer },
    is_shared: { type: Schema.types.boolean },
    sort_order: { type: Schema.types.integer },
    created_at: { type: Schema.types.string },
    updated_at: { type: Schema.types.string },
  },
  required: [],
});
