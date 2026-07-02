import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/session";

export default async function DashboardPage() {
  // ログインチェック（認可ガード）
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) redirect("/login");

  const currentSession = await prisma.session.findUnique({ 
    where: { id: sessionId }, 
    include: { user: true } 
  });
  
  if (!currentSession) redirect("/login");

  // 履歴と全セッションを取得
  const histories = await prisma.loginHistory.findMany({
    where: { userId: currentSession.userId },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const activeSessions = await prisma.session.findMany({
    where: { userId: currentSession.userId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* 修正ポイント：タイトルとログアウトボタンを横並びに配置 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">セキュリティダッシュボード</h1>
        {/* メインのログアウト処理（Server Action） */}
        <form action={async () => {
          "use server";
          await logout(); // セッションCookieとDBからレコードを削除 [1, 2]
          redirect("/login");
        }}>
          <button 
            type="submit" 
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-bold transition-colors shadow-md active:scale-95"
          >
            ログアウト
          </button>
        </form>
      </div>

      {/* アクティブセッション一覧 */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">現在アクティブなセッション</h2>
        <div className="space-y-4">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">{session.userAgent}</p>
                <p className="text-xs text-gray-500">
                  IP: {session.ipAddress} | 開始: {session.createdAt.toLocaleString()}
                </p>
                {session.id === sessionId && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">このデバイス</span>
                )}
              </div>
              {/* 遠隔ログアウト：自分以外のデバイス用 */}
              {session.id !== sessionId && (
                <form action={`/api/auth/sessions/${session.id}`} method="POST">
                   <button type="submit" className="text-sm text-red-500 hover:underline">遠隔ログアウト</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ログイン履歴一覧 [3, 4] */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">最近のログイン履歴</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">日時</th>
              <th>状態</th>
              <th>IPアドレス</th>
            </tr>
          </thead>
          <tbody>
            {histories.map((log) => (
              <tr key={log.id} className="border-b">
                <td className="py-2">{log.createdAt.toLocaleString()}</td>
                <td>
                  <span className={log.status === "SUCCESS" ? "text-green-600" : "text-red-600"}>
                    {log.status}
                  </span>
                </td>
                <td>{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}