import { useNavigate, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import { loginApi } from "@/services/authService";
import { useState } from "react";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/app/billing" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-100 px-6 py-12 lg:px-8">
      {/* Logo & Heading */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-red-700 text-2xl font-bold text-white shadow-lg">
            D
          </div>
        </div>

        <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-gray-900">
          DineInk POS
        </h2>

        <p className="mt-2 text-center text-sm text-gray-500">
          Sign in to continue
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <form
            onSubmit={async (e) => {
              e.preventDefault();

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
              } catch (error) {
                console.log(error);

                alert("Invalid credentials");
              }
            }}
            className="space-y-6"
          >
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Email or Phone Number
              </label>

              <div className="mt-2">
                <input
                  type="text"
                  required
                  autoComplete="email"
                  placeholder="Enter email or phone number"
                  className="block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-red-700"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">
                  Password
                </label>

                <button
                  type="button"
                  className="text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Forgot password?
                </button>
              </div>

              <div className="mt-2">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-red-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-2xl bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600"
              >
                Sign In
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Powered by{" "}
            <span className="font-semibold text-red-700">DineInk</span>
          </p>
        </div>
      </div>
    </div>
  );
}
