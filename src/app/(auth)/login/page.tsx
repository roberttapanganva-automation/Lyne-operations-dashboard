import {
  CalendarCheckIcon,
  CheckCircleIcon,
  FlowArrowIcon,
  LightningIcon,
  ShieldCheckIcon,
  SparkleIcon,
  UserCircleGearIcon,
} from "@phosphor-icons/react/ssr";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { getSupabaseEnvError, hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const envError =
    params.error === "supabase-env" || !hasSupabaseEnv()
      ? getSupabaseEnvError()
      : undefined;
  const currentYear = new Date().getFullYear();

  const trustCards = [
    {
      description: "Role-based access and workspace-secured sign-in.",
      icon: ShieldCheckIcon,
      title: "Secure workspace",
    },
    {
      description: "Clear accountability across leads, jobs, and tasks.",
      icon: UserCircleGearIcon,
      title: "Team ownership",
    },
    {
      description: "Built to connect with automation workflows.",
      icon: LightningIcon,
      title: "Automation ready",
    },
  ];

  const workflowCards = [
    {
      className: "bottom-9 left-0",
      icon: SparkleIcon,
      label: "New lead received",
      tone: "from-violet-500 to-indigo-500",
    },
    {
      className: "bottom-24 left-[32%]",
      icon: CalendarCheckIcon,
      label: "Job scheduled",
      tone: "from-emerald-400 to-green-500",
    },
    {
      className: "right-[13%] top-6",
      icon: FlowArrowIcon,
      label: "Follow-up due",
      tone: "from-orange-400 to-amber-500",
    },
    {
      className: "bottom-8 right-0",
      icon: CheckCircleIcon,
      label: "Task assigned",
      tone: "from-blue-500 to-indigo-500",
    },
  ];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f8f9ff] px-4 py-6 text-[var(--ops-text)] sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(circle at 12% 92%, rgba(124, 92, 255, 0.28), transparent 30%), radial-gradient(circle at 86% 22%, rgba(139, 124, 255, 0.12), transparent 34%), linear-gradient(135deg, #ffffff 0%, #f6f7ff 45%, #eef2ff 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-14 -z-10 hidden h-28 w-40 -translate-x-1/2 opacity-60 md:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124, 92, 255, 0.22) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-24 -z-10 hidden h-80 w-[44rem] rounded-[50%] bg-[linear-gradient(135deg,rgba(124,92,255,0.28),rgba(139,124,255,0.08))] blur-2xl md:block"
      />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1600px] flex-col">
        <header className="flex shrink-0 items-center gap-4 py-2">
          <span className="inline-flex size-12 items-center justify-center overflow-hidden rounded-xl bg-[var(--ops-sidebar)] shadow-[0_18px_38px_var(--ops-primary-glow)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${DEFAULT_BRAND.appName} icon`}
              className="h-full w-full object-cover"
              src={DEFAULT_BRAND.iconUrl}
            />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-[#0a102f]">
              {DEFAULT_BRAND.appName}
            </p>
            <p className="text-sm font-medium text-slate-600">
              {DEFAULT_BRAND.subtitle}
            </p>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,472px)] lg:gap-16 lg:py-10 xl:gap-24">
          <section className="order-2 lg:order-1">
            <div className="relative h-full">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/75 px-3 py-1.5 text-sm font-semibold text-[var(--ops-primary-dark)] shadow-sm shadow-violet-100/70 backdrop-blur">
                  <SparkleIcon aria-hidden="true" className="size-4" weight="fill" />
                  Service operations, simplified
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#080d2b] sm:text-5xl lg:text-6xl">
                  Turn daily service operations into a clear, trackable workflow.
                </h1>
                <p className="mt-6 max-w-[34rem] text-lg leading-8 text-slate-600">
                  Keep customer requests, job schedules, follow-ups, and team
                  ownership organized in one secure workspace.
                </p>

                <div className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
                  {trustCards.map((item) => (
                    <div className="flex items-start gap-3" key={item.title}>
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[var(--ops-primary-dark)] shadow-sm shadow-violet-100 ring-1 ring-violet-100">
                        <item.icon
                          aria-hidden="true"
                          className="size-5"
                          weight="duotone"
                        />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-[#0a102f]">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none relative mt-8 hidden h-64 max-w-4xl md:block"
              >
                <div className="absolute bottom-[-10rem] left-[-18rem] h-[22rem] w-[60rem] rotate-[10deg] rounded-[50%] bg-[linear-gradient(135deg,rgba(124,92,255,0.78)_0%,rgba(139,124,255,0.58)_44%,rgba(176,160,255,0.25)_66%,rgba(255,255,255,0)_82%)]" />
                <div className="absolute bottom-[-12rem] left-[-22rem] h-[27rem] w-[46rem] rounded-[50%] bg-[radial-gradient(circle_at_58%_32%,rgba(124,92,255,0.88),rgba(139,124,255,0.48)_45%,rgba(124,92,255,0)_74%)] blur-xl" />
                <div className="absolute bottom-[-4.5rem] left-[-9rem] h-44 w-[34rem] rotate-[12deg] rounded-[50%] bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,255,255,0)_64%)]" />
                <div
                  className="absolute bottom-5 left-[-1rem] h-20 w-36 opacity-70"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255, 255, 255, 0.75) 1.4px, transparent 1.4px)",
                    backgroundSize: "12px 12px",
                  }}
                />
                <svg
                  aria-hidden="true"
                  className="absolute bottom-12 left-24 h-44 w-[36rem] text-violet-300/80"
                  fill="none"
                  viewBox="0 0 544 160"
                >
                  <path
                    d="M8 118 C86 54 139 95 190 98 C263 102 236 36 315 48 C394 60 372 137 440 112 C481 97 493 48 536 70"
                    stroke="currentColor"
                    strokeDasharray="7 8"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <circle cx="190" cy="98" fill="white" r="5" />
                  <circle cx="315" cy="48" fill="white" r="5" />
                </svg>

                {workflowCards.map((card) => (
                  <div
                    className={`absolute w-56 rounded-xl border border-white/75 bg-white/88 p-4 opacity-90 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur ${card.className}`}
                    key={card.label}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.tone} text-white shadow-lg shadow-slate-200`}
                      >
                        <card.icon aria-hidden="true" className="size-5" weight="bold" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#0a102f]">
                          {card.label}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Workspace workflow
                        </p>
                      </div>
                    </div>
                    <span className="absolute right-4 top-4 size-2 rounded-full bg-[var(--ops-primary)] opacity-75" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2" aria-label="Sign in">
            <div className="mx-auto w-full max-w-[460px] rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8 lg:p-10">
              <h2 className="text-3xl font-semibold tracking-tight text-[#080d2b]">
                Welcome back
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Sign in to continue to your workspace.
              </p>
              <LoginForm envError={envError} />
            </div>
            <p className="mt-8 text-center text-xs text-slate-500">
              &copy; {currentYear} {DEFAULT_BRAND.appName}. All rights reserved.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
