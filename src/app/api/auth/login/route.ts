import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcrypt";
import crypto from "crypto"; // CAPTCHA検証用に追加

export async function POST(request: Request) {
  try {
    // 1. クライアントから送られたデータの受け取り
    const { email, password, captchaAnswer, captchaToken } = await request.json();
    
    // IPアドレスとUser-Agentの取得
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "Unknown";
    const ipAddress = headerList.get("x-forwarded-for") || "127.0.0.1";

    // --- 【追加機能①】レートリミット（間隔制限）のチェック ---
    // 過去15分以内に5回以上失敗しているIPアドレスを一時ブロック
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentFailures = await prisma.loginHistory.count({
      where: {
        ipAddress,
        status: "FAILED",
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentFailures >= 5) {
      return NextResponse.json(
        { error: "試行回数が制限を超えました。15分後にもう一度お試しください。" },
        { status: 429 }
      );
    }

    // --- 【追加機能②】CAPTCHA（bot対策）の検証 ---
    // ユーザーが入力した答えを再度ハッシュ化し、送られてきたトークンと一致するか確認
    const expectedToken = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "fallback-secret")
      .update(captchaAnswer)
      .digest("hex");

    if (expectedToken !== captchaToken) {
      return NextResponse.json({ error: "計算の答えが正しくありません。botですか？" }, { status: 400 });
    }

    // 2. ユーザーの存在確認
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "認証情報が正しくありません" }, { status: 401 });
    }

    // 3. パスワードの照合（bcryptを使用） [2]
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      // ログイン失敗履歴の保存（監視用） [3]
      await prisma.loginHistory.create({
        data: { 
          userId: user.id, 
          status: "FAILED",
          ipAddress,
          userAgent 
        },
      });
      return NextResponse.json({ error: "認証情報が正しくありません" }, { status: 401 });
    }

    // 4. 認証成功処理：セッション作成と履歴保存 [4]
    await createSession(user.id, userAgent, ipAddress); 

    await prisma.loginHistory.create({
      data: { 
        userId: user.id, 
        status: "SUCCESS",
        ipAddress,
        userAgent 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}