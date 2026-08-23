import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import { loginApi } from "@/services/authService";
import { Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { defaultRouteFor } from "@/config/navigation";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  // Landing route is derived from what this session can actually reach. It was
  // hardcoded to /app/billing, which a kitchen-department device has no access
  // to — so those users hit billing, got bounced by the route guard, and
  // arrived at the KDS via a visible double redirect.
  if (isAuthenticated) return <Navigate to={defaultRouteFor(user)} replace />;

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
      navigate(defaultRouteFor(data.user));
    } catch {
      setError("Those details didn't match. Check the email or phone and try again.");
    } finally {
      setLoading(false);
    }
  };

  // focus-visible:outline-none on the inner input is safe here, and not an
  // accessibility regression: the wrapper carries the focus indicator via
  // focus-within (border turns primary), so focus is still clearly visible.
  // Without it the global :focus-visible outline draws INSIDE the wrapper and
  // you get two concentric red rings.
  //
  // The inner <input> takes h-full deliberately: a bare input inside this
  // 48px row renders only ~23px tall, and the surrounding div does NOT
  // forward clicks to it — so tapping the padding above or below the text did
  // nothing. Filling the row makes the whole control the hit area.
  const fieldWrap =
    "flex h-12 items-center gap-2.5 rounded-control border border-input bg-muted px-3 transition-colors focus-within:border-primary focus-within:bg-card";

  return (
    <div className="relative flex min-h-dvh flex-col bg-primary pad-safe-top pad-safe-bottom">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        {/* BRANDING */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-white/20 shadow-xl ring-1 ring-white/25">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">DineInk POS</h1>
          <p className="mt-1 text-[0.8125rem] text-white/70">Restaurant Intelligence System</p>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full max-w-sm">
          <div className="rounded-card bg-card p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground">Sign in</h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">Use the details your manager gave you.</p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              {/* IDENTIFIER */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-identifier"
                  className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase"
                >
                  Email or phone
                </label>
                <div className={fieldWrap}>
                  <User className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    // A till is usually a shared device with a physical keyboard
                    // or an on-screen one; autofocus saves a tap every shift.
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@restaurant.com"
                    className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase"
                >
                  Password
                </label>
                <div className={fieldWrap}>
                  <Lock className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-subtle-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-control border border-destructive/30 bg-destructive/8 px-3 py-2.5"
                >
                  <AlertCircle className="mt-px h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[0.8125rem] font-semibold text-destructive">{error}</p>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-red-600 active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <LoadingIndicator variant="button" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-white/60">
            Powered by <span className="font-bold text-white/90">DineInk</span>
          </p>
        </div>
      </div>
    </div>
  );
}
