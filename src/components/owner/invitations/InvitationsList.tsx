"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceInvitation } from "@/types/domain";

const statusGroups: Array<{
  status: WorkspaceInvitation["status"];
  title: string;
}> = [
  { status: "pending", title: "Pending" },
  { status: "accepted", title: "Accepted" },
  { status: "cancelled", title: "Cancelled" },
  { status: "expired", title: "Expired" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InvitationsList({
  invitations,
}: {
  invitations: WorkspaceInvitation[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  async function copyInviteLink(invitationId: string) {
    setMessage(null);
    setCopyingId(invitationId);

    try {
      const link = `${window.location.origin}/invite/${invitationId}`;
      await navigator.clipboard.writeText(link);
      setMessage("Invite link copied.");
      notify.success("Invite link copied");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite link copy failed.";
      setMessage(message);
      notify.error("Invite link copy failed", message);
    } finally {
      setCopyingId(null);
    }
  }

  async function cancelInvitation(invitationId: string) {
    setMessage(null);
    setBusyId(invitationId);

    try {
      const response = await fetch(`/api/owner/invitations/${invitationId}`, {
        body: JSON.stringify({ status: "cancelled" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<{ id: string }>;

      if (!response.ok || !result.ok) {
        const message = result.ok ? "Invite update failed." : result.error.message;
        setMessage(message);
        notify.error("Invite could not be updated", message);
        return;
      }

      setMessage("Invite cancelled.");
      notify.success("Changes saved", "Invite cancelled.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite update failed.";
      setMessage(message);
      notify.error("Invite could not be updated", message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-[var(--ops-text)]">Invitations</h2>
        <p className="text-sm text-[var(--ops-text-soft)]">
          These are invite records only. They do not send email or create users yet.
        </p>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg bg-[var(--ops-card-soft)] p-3 text-sm text-[var(--ops-text-soft)]">
          {message}
        </p>
      ) : null}

      {invitations.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            description="Invite records will appear here after the owner creates them."
            title="No invitations yet"
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {statusGroups.map(({ status, title }) => {
            const groupedInvitations = invitations.filter(
              (invitation) => invitation.status === status,
            );

            if (groupedInvitations.length === 0) {
              return null;
            }

            return (
              <section
                className="overflow-hidden rounded-lg border border-[var(--ops-border)]"
                key={status}
              >
                <div className="flex items-center justify-between border-b border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                    {title}
                  </h3>
                  <Badge variant={status === "pending" ? "info" : "warning"}>
                    {groupedInvitations.length}
                  </Badge>
                </div>
                <div className="divide-y divide-[var(--ops-border)]">
                  {groupedInvitations.map((invitation) => (
                    <article
                      className="bg-[var(--ops-card)] p-4"
                      key={invitation.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[var(--ops-text)]">
                            {invitation.invited_email}
                          </h4>
                          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                            Role: {invitation.role} - Invited{" "}
                            {formatDate(invitation.created_at)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            Expires {formatDate(invitation.expires_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              invitation.status === "pending" ? "info" : "warning"
                            }
                          >
                            {invitation.status}
                          </Badge>
                          {invitation.status === "pending" ? (
                            <>
                              <Button
                                disabled={copyingId === invitation.id}
                                onClick={() => copyInviteLink(invitation.id)}
                                variant="secondary"
                              >
                                {copyingId === invitation.id
                                  ? "Copying..."
                                  : "Copy invite link"}
                              </Button>
                              <a
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-4 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                                href={`/invite/${invitation.id}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open invite
                              </a>
                              <Button
                                disabled={busyId === invitation.id}
                                onClick={() => cancelInvitation(invitation.id)}
                                variant="secondary"
                              >
                                {busyId === invitation.id
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
