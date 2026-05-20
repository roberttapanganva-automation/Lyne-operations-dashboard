"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwiseIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

type AvatarResponse = {
  avatar_url: string | null;
};

type AccountAvatarCardProps = {
  avatarUrl: string | null;
  displayName: string;
  email: string | null;
  fullName: string | null;
};

const acceptedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 2 * 1024 * 1024;

export function AccountAvatarCard({
  avatarUrl,
  displayName,
  email,
  fullName,
}: AccountAvatarCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    avatarUrl,
  );

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

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

      setCurrentAvatarUrl(result.data.avatar_url);
      setSuccess("Avatar updated.");
      notify.success("Avatar updated", "Your profile photo was uploaded.");
      router.refresh();
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

      setCurrentAvatarUrl(null);
      setSuccess("Avatar removed.");
      notify.success("Avatar removed", "Your initials will be shown instead.");
      router.refresh();
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

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AccountAvatar
          avatarUrl={currentAvatarUrl}
          email={email}
          fullName={fullName}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
            Use a clear personal avatar so teammates can recognize updates and
            ownership faster.
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--ops-text)]">
            {displayName}
          </p>
          {email ? (
            <p className="mt-1 text-sm text-[var(--ops-text-soft)]">{email}</p>
          ) : null}
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

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
          ref={fileInputRef}
          type="file"
        />
        <Button disabled={isUploading || isRemoving} onClick={openFilePicker} type="button">
          <UploadSimpleIcon aria-hidden="true" className="mr-2" size={18} />
          {isUploading ? "Uploading..." : "Upload avatar"}
        </Button>
        {currentAvatarUrl ? (
          <Button
            className="gap-2"
            disabled={isUploading || isRemoving}
            onClick={handleRemove}
            type="button"
            variant="secondary"
          >
            <ArrowCounterClockwiseIcon aria-hidden="true" size={18} />
            {isRemoving ? "Removing..." : "Remove avatar"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
