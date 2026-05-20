import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function sanitizeNamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getAccountInitials({
  email,
  fullName,
}: {
  email?: string | null;
  fullName?: string | null;
}) {
  const fromName = fullName ? sanitizeNamePart(fullName) : "";

  if (fromName) {
    return fromName;
  }

  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  const fromEmail = emailName ? sanitizeNamePart(emailName) : "";

  return fromEmail || "OP";
}

export async function resolveAccountAvatarUrl({
  avatarPath,
  supabase,
}: {
  avatarPath?: string | null;
  supabase: SupabaseServerClient;
}) {
  if (!avatarPath) {
    return null;
  }

  if (/^https?:\/\//i.test(avatarPath)) {
    return avatarPath;
  }

  const { data } = supabase.storage.from("user-avatars").getPublicUrl(avatarPath);
  return data.publicUrl;
}

export function getAvatarExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}
