import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. URLパラメータから削除対象のセッションIDを取得 (Next.js 15の非同期params)
  const { id: targetSessionId } = await params;

  // 2. 現在操作しているユーザー自身のセッションを確認 (認可チェック)
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get("session_id")?.value;

  if (!currentSessionId) {
    redirect("/login");
  }

  const currentSession = await prisma.session.findUnique({
    where: { id: currentSessionId },
  });

  if (!currentSession) {
    redirect("/login");
  }

  // 3. 削除対象のセッション情報をDBから取得
  const sessionToDelete = await prisma.session.findUnique({
    where: { id: targetSessionId },
  });

  // 4. セッションが存在し、かつ「操作者本人」のものであるかを確認
  // これにより、他人のセッションIDを不正に指定してログアウトさせる攻撃を防ぎます
  if (sessionToDelete && sessionToDelete.userId === currentSession.userId) {
    await prisma.session.delete({
      where: { id: targetSessionId },
    });
  }

  // 5. もし「今使っているデバイス」をログアウトした場合はCookieも消してログイン画面へ
  if (targetSessionId === currentSessionId) {
    cookieStore.delete("session_id");
    redirect("/login");
  }

  // 6. 遠隔ログアウト成功後、ダッシュボードへリダイレクトして表示を更新
  redirect("/dashboard");
}