"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Invalid email format";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    }
    return nextErrors;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      router.push("/");
    } else if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
    } else {
      setGeneralError(result.message || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1
          data-testid="login-heading"
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Log In
        </h1>
        <p className="text-gray-500 mb-6">
          Welcome back! Please sign in to your account.
        </p>

        <form
          onSubmit={handleSubmit}
          data-testid="login-form"
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              data-testid="login-email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email)
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.email;
                    return n;
                  });
              }}
              aria-invalid={!!errors.email}
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p
                data-testid="field-error-login-email"
                role="alert"
                className="text-red-500 text-sm mt-1"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              data-testid="login-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.password;
                    return n;
                  });
              }}
              aria-invalid={!!errors.password}
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.password && (
              <p
                data-testid="field-error-login-password"
                role="alert"
                className="text-red-500 text-sm mt-1"
              >
                {errors.password}
              </p>
            )}
          </div>

          {generalError && (
            <p
              data-testid="login-error"
              role="alert"
              className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {generalError}
            </p>
          )}

          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            data-testid="signup-link"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
