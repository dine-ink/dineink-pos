import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import { loginApi } from "@/services/authService";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/app/billing" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi(identifier, password);
      dispatch(
        setAuth({
          token: data.token,
          user: data.user,
          restaurant: data.user.restaurantId,
          branch: data.user.branchId,
        }),
      );
      navigate("/app/billing");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-red-600 via-red-500 to-rose-600">
      {/* DECORATIVE BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-12">
        {/* BRANDING */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-xl ring-1 ring-white/30 backdrop-blur-sm">
            <span className="text-3xl font-black text-white">D</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            DineInk POS
          </h1>
          <p className="mt-1 text-sm text-red-100/80">
            Restaurant Intelligence System
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full max-w-sm">
          <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
            <h2 className="text-xl font-black text-gray-900">Welcome Back</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Sign in to your account
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* IDENTIFIER */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">
                  Email or Phone Number
                </label>
                <div className="flex h-12 items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 transition focus-within:border-red-400 focus-within:bg-white">
                  <User className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or phone"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="flex h-12 items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 transition focus-within:border-red-400 focus-within:bg-white">
                  <Lock className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-gray-400 transition hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* FOOTER */}
          <p className="mt-6 text-center text-xs text-red-100/70">
            Powered by{" "}
            <span className="font-bold text-white">DineInk</span>
          </p>
        </div>
      </div>
    </div>
  );
}
