import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * セッションの作成とセキュアCookieの発行
 * IPアドレスとUser-Agentを保存することで、アクティブセッション管理を可能にします
 */
export async function createSession(userId: string, userAgent: string, ipAddress: string) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24時間有効
  
  // データベースの Session テーブルに情報を保存
  const session = await prisma.session.create({
    data: { 
      userId, 
      userAgent,
      ipAddress,
      expiresAt 
    },
  });

  const cookieStore = await cookies();
  
  // ガチガチにセキュアな属性を設定したCookieを発行 [1-3]
  cookieStore.set("session_id", session.id, {
    httpOnly: true, // JavaScriptからのアクセスを禁止し、XSSによる盗難を防ぐ [4, 5]
    secure: process.env.NODE_ENV === "production", // 本番環境ではHTTPSを強制 [6]
    sameSite: "strict", // CSRF攻撃を強力に防止 [7, 8]
    expires: expiresAt,
    path: "/",
  });
}

/**
 * 現在のセッションからユーザーを取得（認可ガード用）
 * ダッシュボードなどでログイン状態を確認するために使用します [9]
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  // セッションが存在しない、または期限切れの場合はDBから削除してnullを返す
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

/**
 * ログアウト処理（セッションの削除）
 * ダッシュボードのログアウトボタンから呼び出されます
 */
export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    // 自身のセッションレコードをデータベースから物理削除 [9, 10]
    try {
      await prisma.session.delete({ where: { id: sessionId } });
    } catch (error) {
      console.error(error)
      // 既に削除されている場合はスキップ
    }
  }
  
  // ブラウザ側のCookieをクリア
  cookieStore.delete("session_id");
}