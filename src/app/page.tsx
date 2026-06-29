// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-3xl font-bold">セキュア認証デモアプリ</h1>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          ログイン画面へ
        </Link>
        <Link href="/signup" className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
          新規登録画面へ
        </Link>
      </div>
    </div>
  );
}