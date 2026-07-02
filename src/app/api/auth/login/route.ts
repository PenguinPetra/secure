import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcrypt";
import crypto from "crypto"; // CAPTCHA検証用に追加

export async function POST(request: Request) {
  try {
    const { email, password, captchaAnswer, captchaToken } = await request.json();
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "Unknown";
    const ipAddress = headerList.get("x-forwarded-for") || "127.0.0.1";

    // 1. レートリミットチェック（すべてのFAILEDをカウント）
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
        { error: "試行回数が制限を超えました。15分後に再度お試しください。" },
        { status: 429 }
      );
    }

    // 2. CAPTCHA検証（失敗したら履歴に保存して即終了）
    const expectedToken = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "fallback-secret")
      .update(captchaAnswer)
      .digest("hex");

    if (expectedToken !== captchaToken) {
      await prisma.loginHistory.create({
        data: { 
          status: "FAILED", 
          ipAddress, 
          userAgent 
        }
      });
      return NextResponse.json({ error: "計算の答えが正しくありません。" }, { status: 400 });
    }

    // 3. ユーザー確認とパスワード照合
    const user = await prisma.user.findUnique({ where: { email } });
    const isPasswordValid = user ? await bcrypt.compare(password, user.hashedPassword) : false;

    if (!isPasswordValid) {
      // ユーザーがいない場合やパスワードミスも失敗履歴として保存
      await prisma.loginHistory.create({
        data: { 
          userId: user?.id ?? undefined, // user?.id があればその値、なければ undefined
          status: "FAILED",
          ipAddress, 
          userAgent 
        },
      });
      return NextResponse.json({ error: "認証情報が正しくありません。" }, { status: 401 });
    }

    // 4. 成功処理
    await createSession(user!.id, userAgent, ipAddress);
    await prisma.loginHistory.create({
      data: { userId: user!.id, status: "SUCCESS", ipAddress, userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}