import { load } from "std/dotenv/mod.ts";
import { setStatusWithUserToken } from "../lib/slack/user-token.ts";

await load({ export: true });

const adminToken = Deno.env.get("SLACK_ADMIN_USER_TOKEN");
if (!adminToken) {
  console.error("SLACK_ADMIN_USER_TOKEN 環境変数が設定されていません");
  Deno.exit(1);
}

const response = await setStatusWithUserToken(
  adminToken,
  "U0812GLUZD2",
  "Claude Code実装完了！",
  ":rocket:",
  0, // 無期限
);

if (response.ok) {
  console.log("✅ ステータス設定完了！Slackを確認してください");
} else {
  console.log("❌ エラー:", response.error);
}
