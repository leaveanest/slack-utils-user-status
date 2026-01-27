import { load } from "std/dotenv/mod.ts";
import { setStatusWithUserToken } from "../lib/slack/user-token.ts";

await load({ export: true });

const response = await setStatusWithUserToken(
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
