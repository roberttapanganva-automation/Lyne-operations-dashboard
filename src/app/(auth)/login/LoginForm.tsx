"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  envError?: string;
};

function getHumanError(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "The email or password is not correct.";
  }

  return message;
}

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function LoginForm({ envError }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(envError ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nextPath = useMemo(() => {
    return getSafeRedirectPath(
      searchParams.get("redirect") ?? searchParams.get("next"),
    );
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(getHumanError(signInError.message));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We could not sign you in. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <div
          className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-[var(--ops-danger)]"
          role="alert"
        >
          <WarningCircleIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={20}
            weight="regular"
          />
          <p>{error}</p>
        </div>
      ) : null}

      <div>
        <label
          className="text-sm font-semibold text-[#080d2b]"
          htmlFor="email"
        >
          Email
        </label>
        <Input
          autoComplete="email"
          className="mt-2 h-14 rounded-xl border-slate-200 bg-white/90 pl-11 text-base shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:w-full"
          id="email"
          icon={
            <EnvelopeSimpleIcon
              aria-hidden="true"
              size={20}
              weight="regular"
            />
          }
          label="Email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-sm font-semibold text-[#080d2b]"
            htmlFor="password"
          >
            Password
          </label>
          <Link
            className="text-sm font-semibold text-[var(--ops-primary-dark)] transition hover:text-[var(--ops-primary)] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            href="/reset-password"
          >
            Reset password
          </Link>
        </div>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-[var(--ops-text-muted)]">
            <LockIcon aria-hidden="true" size={21} weight="regular" />
          </span>
          <input
            autoComplete="current-password"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white/90 py-0 pl-11 pr-12 text-base text-[var(--ops-text)] shadow-[0_10px_28px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
            id="password"
            name="password"
            placeholder="Enter your password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeSlashIcon aria-hidden="true" size={20} />
            ) : (
              <EyeIcon aria-hidden="true" size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <label className="inline-flex min-w-0 items-center gap-3 text-sm font-medium text-slate-600">
          <input
            checked={rememberMe}
            className="size-5 rounded border-slate-300 text-[var(--ops-primary)] focus:ring-[var(--ops-primary-glow)]"
            onChange={(event) => setRememberMe(event.target.checked)}
            type="checkbox"
          />
          <span>Remember me</span>
        </label>
        <Link
          className="text-sm font-semibold text-[var(--ops-primary-dark)] transition hover:text-[var(--ops-primary)] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
          href="/reset-password"
        >
          Need help?
        </Link>
      </div>

      <Button
        className="h-14 w-full rounded-xl bg-[linear-gradient(135deg,var(--ops-primary),var(--ops-primary-dark))] text-base shadow-[0_18px_42px_var(--ops-primary-glow)]"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>

      <div className="border-t border-slate-200 pt-6">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <LockIcon aria-hidden="true" className="size-4" weight="regular" />
          Workspace-secured sign-in
        </p>
      </div>
    </form>
  );
}
