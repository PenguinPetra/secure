"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldAlert, RefreshCw } from "lucide-react";
import useSWR from "swr";

// データ取得用のフェッチャー関数
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // SWRを使用してCAPTCHAを取得
  const { data: captchaData, mutate: refreshCaptcha } = useSWR("/api/auth/captcha", fetcher, {
    revalidateOnFocus: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          captchaAnswer, 
          captchaToken: captchaData?.captchaToken 
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "ログインに失敗しました");
        // 失敗時は問題をリフレッシュ
        refreshCaptcha();
        setCaptchaAnswer("");
      }
    } catch (err) {
      console.error(err);
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">ログイン</h2>
          <p className="mt-2 text-sm text-gray-600">登録した情報を入力してください</p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200 flex items-center gap-2">
            <ShieldAlert size={18} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 p-2.5 text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
              placeholder="example@email.com"
            />
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2.5 pr-10 text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Bot対策クイズ表示エリア */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-blue-800">Bot対策クイズ</label>
              <button 
                type="button" 
                onClick={() => refreshCaptcha()} 
                className="text-blue-500 hover:text-blue-700 transition"
                title="問題を更新"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center py-2 bg-white rounded border border-blue-200 shadow-inner">
                <span className="text-xl font-mono font-black text-blue-900 tracking-wider">
                  {captchaData?.question || "取得中..."}
                </span>
              </div>
              <input
                type="text"
                required
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="w-24 rounded-md border border-blue-300 p-2.5 text-center text-black font-bold focus:border-blue-500 focus:outline-none"
                placeholder="答え"
              />
            </div>
            <p className="mt-2 text-[11px] text-blue-600 leading-tight italic">
              ※自動プログラムによる不正ログインを防ぐための確認です。
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 p-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:bg-gray-400"
        >
          {loading ? "認証中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}