import { cookies } from "next/headers";
import { prisma } from "./prisma";

// セッションの作成とセキュアCookieの発行
// 引数に userAgent と ipAddress を追加しました
export async function createSession(userId: string, userAgent: string, ipAddress: string) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24時間有効（課題要件に合わせて調整可）
  
  // データベースの Session テーブルに情報を保存
  const session = await prisma.session.create({
    data: { 
      userId, 
      userAgent, // 追加
      ipAddress, // 追加
      expiresAt 
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_id", session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

// 現在のセッションからユーザーを取得（認可ガード用）
export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  // セッションが存在しない、または期限切れの場合は削除してnullを返す
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  return session.user;
}

// セッションの削除（ログアウト）
export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (sessionId) {
    // 自身のセッションをDBから削除
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  // Cookieをクリア
  cookieStore.delete("session_id");
}