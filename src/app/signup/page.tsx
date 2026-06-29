"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // パスワード強度の判定ロジック
  const { score, label, color, advice } = useMemo(() => {
    let s = 0;
    if (!password) return { score: 0, label: "未入力", color: "bg-gray-300", advice: "パスワードを入力してください。" };

    // 判定基準
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[1-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    // スコア計算 (8文字未満の場合は最大でもスコア1に制限)
    if (hasLength) s++;
    if (hasUpper) s++;
    if (hasNumber) s++;
    if (hasSymbol) s++;
    
    // 8文字未満なら、どれだけ複雑でも「弱い」と判定する制約を追加
    const finalScore = !hasLength && s > 1 ? 1 : s;

    const config = [
      { label: "非常に弱い", color: "bg-red-500", advice: "最低でも8文字以上にしてください。" },
      { label: "弱い", color: "bg-orange-500", advice: "8文字以上かつ、大文字・数字・記号を混ぜてください。" },
      { label: "普通", color: "bg-yellow-500", advice: "良いですね！さらに記号を混ぜると安全です。" },
      { label: "強い", color: "bg-blue-500", advice: "セキュアなパスワードです。" },
      { label: "非常に強い", color: "bg-green-500", advice: "完璧です！非常に安全です。" }
    ];

    return { 
      score: finalScore, 
      label: config[finalScore].label, 
      color: config[finalScore].color, 
      advice: config[finalScore].advice 
    };
  }, [password]);

  const isPasswordMatched = password === confirmPassword && confirmPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 8文字未満、または強度が「普通(2)」未満の場合はブロック
    if (password.length < 8 || score < 2) {
      setError("パスワードが短すぎるか、強度が不足しています。");
      return;
    }
    if (!isPasswordMatched) {
      setError("パスワードが一致しません。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        router.push("/login?message=登録が完了しました。");
      } else {
        const data = await res.json();
        setError(data.error || "登録に失敗しました。");
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
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">新規アカウント作成</h1>
          <p className="mt-2 text-sm text-gray-600">セキュアなパスワードを設定してください</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-500 border border-red-200 flex items-center gap-2"><AlertCircle size={16}/>{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">名前</label>
              <input type="text" required className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-black focus:border-blue-500 focus:outline-none" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
              <input type="email" required className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-black focus:border-blue-500 focus:outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {/* パスワード入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">パスワード</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-black focus:border-blue-500 focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* 強度表示とアドバイス */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-gray-200">
                    {[1-4].map((step) => (
                      <div key={step} className={`h-full flex-1 transition-all duration-300 ${step <= score ? color : "bg-transparent"}`} />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-bold ${score < 2 ? "text-red-500" : "text-gray-500"}`}>強度: {label}</p>
                    <p className="text-[10px] text-gray-400">{password.length} 文字</p>
                  </div>
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                    💡 {advice}
                  </p>
                </div>
              )}
            </div>

            {/* 確認用パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700">パスワード（確認）</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                className={`mt-1 block w-full rounded-md border py-2 px-3 focus:outline-none ${confirmPassword && !isPasswordMatched ? "border-red-500" : "border-gray-300"}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && !isPasswordMatched && <p className="mt-1 text-xs text-red-500">パスワードが一致しません</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || score < 2 || !isPasswordMatched || password.length < 8}
            className="w-full rounded-md bg-blue-600 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "登録中..." : "アカウントを作成する"}
          </button>
        </form>
      </div>
    </div>
  );
}