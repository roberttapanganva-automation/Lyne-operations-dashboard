import { getAccountInitials } from "@/lib/account/avatar";

type AccountAvatarProps = {
  avatarUrl?: string | null;
  className?: string;
  email?: string | null;
  fullName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const sizeClasses = {
  lg: "h-16 w-16 text-lg",
  md: "h-10 w-10 text-sm",
  sm: "h-9 w-9 text-sm",
  xs: "h-8 w-8 text-xs",
  xl: "h-24 w-24 text-2xl",
} as const;

export function AccountAvatar({
  avatarUrl,
  className = "",
  email,
  fullName,
  size = "md",
}: AccountAvatarProps) {
  const initials = getAccountInitials({ email, fullName });

  if (avatarUrl) {
    return (
      <span
        aria-label={fullName ?? email ?? "Account avatar"}
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ops-card-soft)] ${sizeClasses[size]} ${className}`}
        role="img"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={fullName ?? email ?? "Account avatar"}
          className="h-full w-full object-cover"
          src={avatarUrl}
        />
      </span>
    );
  }

  return (
    <span
      aria-label={fullName ?? email ?? "Account avatar"}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--ops-primary-soft)] font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))] ${sizeClasses[size]} ${className}`}
      role="img"
    >
      {initials}
    </span>
  );
}
