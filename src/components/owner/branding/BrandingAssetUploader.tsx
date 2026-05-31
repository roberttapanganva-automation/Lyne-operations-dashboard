"use client";

import { useRef, useState } from "react";
import { ImageSquareIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

type BrandingAssetUploaderProps = {
  assetType: "icon" | "logo";
  label: string;
  onChange: (url: string) => void;
  value: string | null;
};

type UploadResponse = {
  assetType: "icon" | "logo";
  path: string;
  publicUrl: string;
};

export function BrandingAssetUploader({
  assetType,
  label,
  onChange,
  value,
}: BrandingAssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("asset_type", assetType);
    formData.append("file", file);

    try {
      const response = await fetch("/api/owner/branding/upload", {
        body: formData,
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<UploadResponse>;

      if (!response.ok || !result.ok) {
        const errorMessage = result.ok ? "Upload failed." : result.error.message;
        setError(errorMessage);
        notify.error("Upload failed", errorMessage);
        return;
      }

      onChange(result.data.publicUrl);
      setSuccess(`${label} uploaded.`);
      notify.success("Upload complete", `${label} uploaded.`);
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Upload failed.";
      setError(errorMessage);
      notify.error("Upload failed", errorMessage);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] bg-cover bg-center text-[var(--ops-text-muted)]"
            style={value ? { backgroundImage: `url("${value}")` } : undefined}
          >
            {value ? null : <ImageSquareIcon aria-hidden="true" size={24} />}
          </div>
          <div>
            <p className="font-semibold text-[var(--ops-text)]">{label}</p>
            <p className="text-sm text-[var(--ops-text-soft)]">
              PNG, JPG, or WebP. {assetType === "icon" ? "Max 2MB." : "Max 5MB."}
            </p>
          </div>
        </div>

        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadFile(file);
            }
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <Button
          className="gap-2"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="secondary"
        >
          <UploadSimpleIcon aria-hidden="true" size={18} weight="regular" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {success ? (
        <p className="mt-3 rounded-lg bg-[var(--ops-success-soft)] p-2 text-sm text-[var(--ops-success)]">
          {success}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-3 rounded-lg bg-[var(--ops-danger-soft)] p-2 text-sm text-[var(--ops-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
