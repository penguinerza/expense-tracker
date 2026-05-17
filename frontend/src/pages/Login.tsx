import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/log", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const errorMessages: Record<string, string> = {
    oauth_failed: "Sign-in failed. Please try again.",
    unauthorized: "This app is private.",
    server_error: "Server error. Please try again.",
  };

  return (
    <div className="min-h-dvh flex flex-col bg-surface-0 lg:items-center lg:justify-center">
      <div className="flex flex-col flex-1 lg:flex-none w-full lg:max-w-sm lg:rounded-2xl lg:border lg:border-surface-3 lg:overflow-hidden lg:bg-surface-1">
        {/* Top section — logo */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 lg:pt-12 lg:pb-6">
          <div className="mb-10 text-center">
            <div className="font-display text-8xl text-ink leading-none mb-6 select-none" aria-hidden="true">
              ¥
            </div>
            <h1 className="font-display text-3xl text-ink text-balance">Expense Tracker</h1>
            <p className="font-sans text-ink-muted text-sm mt-3 text-pretty">
              Understand where your money goes.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="w-full max-w-xs mb-6 px-4 py-3 border border-red-800 rounded-lg text-red-400 text-sm font-sans text-pretty"
              style={{ background: "rgba(127,29,29,0.15)" }}
            >
              {errorMessages[error] ?? "Something went wrong."}
            </div>
          )}
        </div>

        {/* Bottom section — sign in */}
        <div className="px-6 pb-12 safe-bottom lg:pb-10">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-ink text-surface-0 rounded-xl font-sans font-medium text-[15px] hover:bg-ink/90 active:bg-ink/80 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </a>
          <p className="text-center text-ink-muted text-xs font-sans mt-4">
            Single-user private app
          </p>
        </div>
      </div>
    </div>
  );
}
