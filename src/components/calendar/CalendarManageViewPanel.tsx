"use client";

import {
  CalendarBlankIcon,
  CheckSquareIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import type {
  CalendarFilterMember,
  CalendarManageViewType,
} from "@/lib/calendar/types";

type CalendarManageViewPanelProps = {
  canFilterMembers: boolean;
  filteredMembers: CalendarFilterMember[];
  onMemberSearchChange: (value: string) => void;
  onSelectedMemberChange: (memberId: string | null) => void;
  onSourceToggle: (source: "appointment" | "job", checked: boolean) => void;
  onViewTypeChange: (value: CalendarManageViewType) => void;
  selectedMemberId: string | null;
  sourceSelection: {
    appointments: boolean;
    jobs: boolean;
  };
  viewType: CalendarManageViewType;
};

const viewTypeOptions: Array<{
  description: string;
  label: string;
  value: CalendarManageViewType;
}> = [
  {
    description: "See appointments and scheduled jobs together.",
    label: "All",
    value: "all",
  },
  {
    description: "Focus only on appointment records.",
    label: "Appointments",
    value: "appointments",
  },
  {
    description: "Show scheduled job visits only.",
    label: "Scheduled jobs",
    value: "scheduled_jobs",
  },
];

export function CalendarManageViewPanel({
  canFilterMembers,
  filteredMembers,
  onMemberSearchChange,
  onSelectedMemberChange,
  onSourceToggle,
  onViewTypeChange,
  selectedMemberId,
  sourceSelection,
  viewType,
}: CalendarManageViewPanelProps) {
  return (
    <Card className="h-fit p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
          <FunnelSimpleIcon aria-hidden="true" size={20} weight="duotone" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Manage view
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
            Adjust what the calendar shows without changing saved workspace settings.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
              View type
            </p>
          </div>
          <div className="space-y-2">
            {viewTypeOptions.map((option) => {
              const active = option.value === viewType;

              return (
                <button
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--workspace-primary,var(--ops-primary))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
                      : "border-[var(--ops-border)] bg-[var(--ops-card-soft)]"
                  }`}
                  key={option.value}
                  onClick={() => onViewTypeChange(option.value)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ops-text-soft)]">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
              Filters
            </p>
          </div>
          <label className="relative block">
            <span className="sr-only">Search users, calendars, or groups</span>
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
              size={16}
              weight="regular"
            />
            <input
              className="h-10 w-full rounded-xl border border-[var(--ops-border)] bg-white pl-9 pr-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
              onChange={(event) => onMemberSearchChange(event.target.value)}
              placeholder="Search users, calendars, or groups"
              type="search"
            />
          </label>
        </section>

        {canFilterMembers ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <UsersThreeIcon
                aria-hidden="true"
                size={16}
                weight="duotone"
                className="text-[var(--ops-text-muted)]"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                Users
              </p>
            </div>
            <div className="space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedMemberId === null
                    ? "border-[var(--workspace-primary,var(--ops-primary))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--ops-text)]"
                    : "border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] hover:border-[var(--workspace-primary-soft,var(--ops-primary-soft))] hover:text-[var(--ops-text)]"
                }`}
                onClick={() => onSelectedMemberChange(null)}
                type="button"
              >
                <span className="font-medium">All active members</span>
                {selectedMemberId === null ? (
                  <CheckSquareIcon aria-hidden="true" size={16} weight="fill" />
                ) : null}
              </button>
              {filteredMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--ops-border)] px-3 py-3 text-sm text-[var(--ops-text-soft)]">
                  No team members match the current search.
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const active = member.id === selectedMemberId;

                  return (
                    <button
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-[var(--workspace-primary,var(--ops-primary))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
                          : "border-[var(--ops-border)] bg-white hover:border-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
                      }`}
                      key={member.id}
                      onClick={() =>
                        onSelectedMemberChange(active ? null : member.id)
                      }
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ops-text)]">
                          {member.label}
                        </p>
                        <p className="truncate text-xs text-[var(--ops-text-soft)]">
                          {member.email ?? member.role}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--ops-card-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                        {member.role}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarBlankIcon
              aria-hidden="true"
              size={16}
              weight="duotone"
              className="text-[var(--ops-text-muted)]"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
              Calendars
            </p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-xl border border-[var(--ops-border)] bg-white px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[var(--ops-text)]">
                  Appointments
                </p>
                <p className="text-xs text-[var(--ops-text-soft)]">
                  Customer meetings, calls, and booked calendar blocks.
                </p>
              </div>
              <input
                checked={sourceSelection.appointments}
                className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--workspace-primary,var(--ops-primary))]"
                onChange={(event) =>
                  onSourceToggle("appointment", event.target.checked)
                }
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[var(--ops-border)] bg-white px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[var(--ops-text)]">
                  Scheduled jobs
                </p>
                <p className="text-xs text-[var(--ops-text-soft)]">
                  Operational work pulled from live job schedules.
                </p>
              </div>
              <input
                checked={sourceSelection.jobs}
                className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--workspace-primary,var(--ops-primary))]"
                onChange={(event) => onSourceToggle("job", event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
        </section>
      </div>
    </Card>
  );
}
