import { Card } from "@/components/ui/Card";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { getSupabaseEnvError, hasSupabaseEnv } from "@/lib/supabase/env";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  const envError = hasSupabaseEnv() ? undefined : getSupabaseEnvError();

  return (
    <main className="min-h-screen bg-[var(--ops-main-bg)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center">
        <Card className="w-full p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[var(--ops-sidebar)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${DEFAULT_BRAND.appName} icon`}
                className="h-full w-full object-cover"
                src={DEFAULT_BRAND.iconUrl}
              />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-[var(--ops-text)]">
                Reset password
              </h1>
              <p className="text-sm text-[var(--ops-text-soft)]">
                Request a secure reset email from Supabase Auth.
              </p>
            </div>
          </div>
          <ResetPasswordForm envError={envError} />
        </Card>
      </div>
    </main>
  );
}
