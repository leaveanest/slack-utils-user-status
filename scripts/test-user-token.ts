/**
 * User Token のテストスクリプト
 * 実際にSlack APIを呼び出してステータス設定をテストします
 */

import { load } from "std/dotenv/mod.ts";
import {
  clearStatusWithUserToken,
  getAdminUserToken,
  setStatusWithUserToken,
} from "../lib/slack/user-token.ts";

// .envファイルを読み込む
await load({ export: true });

async function main() {
  console.log("=== User Token テスト ===\n");

  // 1. トークン確認
  console.log("1. トークン確認...");
  try {
    const token = getAdminUserToken();
    console.log(`   ✅ トークン取得成功: ${token.substring(0, 5)}...`);
  } catch (e) {
    console.error(`   ❌ エラー: ${(e as Error).message}`);
    Deno.exit(1);
  }

  // テスト用のユーザーID（自分のIDを使用）
  // 注意: 実際のユーザーIDに置き換えてください
  const testUserId = Deno.env.get("TEST_USER_ID");

  if (!testUserId) {
    console.log("\n⚠️  TEST_USER_ID環境変数が設定されていません");
    console.log("   テストをスキップします");
    console.log(
      "\n   使用方法: TEST_USER_ID=U12345678 deno run --allow-env --allow-read --allow-net scripts/test-user-token.ts",
    );
    Deno.exit(0);
  }

  // 2. ステータス設定テスト
  console.log(`\n2. ステータス設定テスト (user: ${testUserId})...`);
  try {
    const response = await setStatusWithUserToken(
      testUserId,
      "テスト中 🧪",
      ":test_tube:",
      0, // 無期限
    );

    if (response.ok) {
      console.log("   ✅ ステータス設定成功!");
    } else {
      console.log(`   ❌ API エラー: ${response.error}`);
    }
  } catch (e) {
    console.error(`   ❌ エラー: ${(e as Error).message}`);
  }

  // 3秒待機
  console.log("\n   3秒待機...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. ステータスクリアテスト
  console.log("\n3. ステータスクリアテスト...");
  try {
    const response = await clearStatusWithUserToken(testUserId);

    if (response.ok) {
      console.log("   ✅ ステータスクリア成功!");
    } else {
      console.log(`   ❌ API エラー: ${response.error}`);
    }
  } catch (e) {
    console.error(`   ❌ エラー: ${(e as Error).message}`);
  }

  console.log("\n=== テスト完了 ===");
}

main();
