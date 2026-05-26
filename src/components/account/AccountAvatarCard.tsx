"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ArrowCounterClockwiseIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { dispatchAccountUpdated } from "@/lib/account/accountEvents";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

type AvatarResponse = {
  avatar_url: string | null;
};

type AccountAvatarCardProps = {
  avatarUrl: string | null;
  displayName: string;
  embedded?: boolean;
  email: string | null;
  fullName: string | null;
};

const acceptedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 2 * 1024 * 1024;

export function AccountAvatarCard({
  avatarUrl,
  displayName,
  embedded = false,
  email,
  fullName,
}: AccountAvatarCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(
    undefined,
  );
  const currentAvatarUrl = avatarOverride === undefined ? avatarUrl : avatarOverride;

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!acceptedMimeTypes.includes(file.type)) {
      const message = "Only JPG, PNG, or WEBP images under 2MB are allowed.";
      setError(message);
      notify.warning("Avatar not uploaded", message);
      return;
    }

    if (file.size > maxFileSize) {
      const message = "Only JPG, PNG, or WEBP images under 2MB are allowed.";
      setError(message);
      notify.warning("Avatar not uploaded", message);
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    setIsUploading(true);

    try {
      const response = await fetch("/api/account/avatar", {
        body: formData,
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<AvatarResponse>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not upload your avatar."
          : result.error.message;
        setError(message);
        notify.error("Avatar upload failed", message);
        return;
      }

      setAvatarOverride(result.data.avatar_url);
      setSuccess("Avatar updated.");
      dispatchAccountUpdated({
        avatarUrl: result.data.avatar_url,
      });
      notify.success("Avatar updated", "Your profile photo was uploaded.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not upload your avatar.";
      setError(message);
      notify.error("Avatar upload failed", message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setSuccess(null);
    setIsRemoving(true);

    try {
      const response = await fetch("/api/account/avatar", {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse<AvatarResponse>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not remove your avatar."
          : result.error.message;
        setError(message);
        notify.error("Avatar could not be removed", message);
        return;
      }

      setAvatarOverride(null);
      setSuccess("Avatar removed.");
      dispatchAccountUpdated({
        avatarUrl: null,
      });
      notify.success("Avatar removed", "Your initials will be shown instead.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not remove your avatar.";
      setError(message);
      notify.error("Avatar could not be removed", message);
    } finally {
      setIsRemoving(false);
    }
  }

  const content = (
    <>
      <p className="mb-4 text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary))]">
        Personal Profile
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <AccountAvatar
            avatarUrl={currentAvatarUrl}
            email={email}
            fullName={fullName}
            size="xl"
          />
          <button
            aria-label="Remove avatar"
            className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ops-border)] bg-[var(--ops-card)] text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!currentAvatarUrl || isUploading || isRemoving}
            onClick={handleRemove}
            title={currentAvatarUrl ? "Remove avatar" : "No avatar to remove"}
            type="button"
          >
            <ArrowCounterClockwiseIcon aria-hidden="true" size={14} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
            Add a clear avatar so teammates can quickly recognize you in the
            workspace.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--ops-text)]">
                {displayName}
              </p>
              {email ? (
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  {email}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-3 sm:justify-end">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUpload}
                ref={fileInputRef}
                type="file"
              />
              <Button
                disabled={isUploading || isRemoving}
                onClick={openFilePicker}
                type="button"
              >
                <UploadSimpleIcon aria-hidden="true" className="mr-2" size={18} />
                {isUploading ? "Uploading..." : "Upload avatar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
          {success}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return <Card className="p-5 sm:p-6">{content}</Card>;
}
