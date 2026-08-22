import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import { loginApi } from "@/services/authService";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  if (isAuthenticated) return <Navigate to="/app/billing" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi(identifier, password);
      dispatch(setAuth({
        token: data.token,
        user: data.user,
        restaurant: data.user.restaurant ?? null,
        branch: data.user.branch ?? null,
      }));
      navigate("/app/billing");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-red-600 via-red-500 to-rose-600">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        {/* BRANDING */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-xl ring-1 ring-white/30">
            <span className="text-2xl font-black text-white">D</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DineInk POS</h1>
          <p className="mt-0.5 text-xs text-red-100/80">Restaurant Intelligence System</p>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <h2 className="text-base font-black text-gray-900">Welcome Back</h2>
            <p className="mt-0.5 text-xs text-gray-500">Sign in to your account</p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {/* IDENTIFIER */}
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Email or Phone Number
                </label>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-red-400 focus-within:bg-white">
                  <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <input type="text" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or phone"
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Password</label>
                  <button type="button" className="-m-2 p-2 text-[10px] font-semibold text-red-600 transition hover:text-red-700">
                    Forgot password?
                  </button>
                </div>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-red-400 focus-within:bg-white">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="-m-2 shrink-0 p-2 text-gray-400 transition hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* SUBMIT */}
              <button type="submit" disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200 transition hover:shadow-xl active:scale-[0.99] disabled:opacity-70">
                {loading ? (
                  <><LoadingIndicator variant="button" /> Signing In...</>
                ) : "Sign In"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-[10px] text-red-100/70">
            Powered by <span className="font-bold text-white">DineInk</span>
          </p>
        </div>
      </div>
    </div>
  );
}
