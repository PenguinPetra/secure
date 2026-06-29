import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    // 0~9のランダムな数字で計算問題を作成
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    const answer = (num1 + num2).toString();

    // 答えを秘密鍵でハッシュ化（改ざん防止トークン）
    // .envに JWT_SECRET がない場合は 'fallback-secret' を使用
    const token = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "fallback-secret")
      .update(answer)
      .digest("hex");

    return NextResponse.json({
      question: `${num1} + ${num2} = ?`,
      captchaToken: token, 
    });
  } catch (error) {
    console.error("CAPTCHA生成エラー:", error);
    return NextResponse.json({ error: "CAPTCHAの生成に失敗しました" }, { status: 500 });
  }
}