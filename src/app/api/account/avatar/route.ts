import { NextResponse } from "next/server";
import { getAvatarExtension, resolveAccountAvatarUrl } from "@/lib/account/avatar";
import { revalidateAccountPages } from "@/lib/cache/revalidate-app";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";

type ProfileAvatarRow = {
  avatar_url: string | null;
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 2 * 1024 * 1024;

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getUploadErrorMessage(details: string | null | undefined) {
  const normalizedDetails = details?.toLowerCase() ?? "";

  if (
    normalizedDetails.includes("bucket") &&
    (normalizedDetails.includes("not found") ||
      normalizedDetails.includes("does not exist"))
  ) {
    return "Avatar bucket is not configured.";
  }

  if (
    normalizedDetails.includes("mime") ||
    normalizedDetails.includes("content type") ||
    normalizedDetails.includes("file size")
  ) {
    return "Only JPG, PNG, or WEBP images under 2MB are allowed.";
  }

  if (normalizedDetails.includes("row-level security")) {
    return "We could not upload your avatar with the current storage permissions.";
  }

  return "We could not upload your avatar.";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to upload an avatar.",
        },
        ok: false,
      },
      401,
    );
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    return jsonResponse(
      {
        error: {
          code: "AVATAR_MISSING",
          message: "Select an avatar image to upload.",
        },
        ok: false,
      },
      400,
    );
  }

  if (!allowedMimeTypes.has(avatar.type)) {
    return jsonResponse(
      {
        error: {
          code: "AVATAR_TYPE_INVALID",
          message: "Only JPG, PNG, or WEBP images under 2MB are allowed.",
        },
        ok: false,
      },
      400,
    );
  }

  if (avatar.size > maxFileSize) {
    return jsonResponse(
      {
        error: {
          code: "AVATAR_TOO_LARGE",
          message: "Only JPG, PNG, or WEBP images under 2MB are allowed.",
        },
        ok: false,
      },
      400,
    );
  }

  const extension = getAvatarExtension(avatar.type);

  if (!extension) {
    return jsonResponse(
      {
        error: {
          code: "AVATAR_TYPE_INVALID",
          message: "Only JPG, PNG, or WEBP images under 2MB are allowed.",
        },
        ok: false,
      },
      400,
    );
  }

  const {
    data: currentProfile,
    error: currentProfileError,
  } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileAvatarRow>();

  if (currentProfileError) {
    return jsonResponse(
      {
        error: {
          code: "PROFILE_READ_FAILED",
          details: currentProfileError.message,
          message: "We could not prepare your avatar update.",
        },
        ok: false,
      },
      500,
    );
  }

  const avatarPath = `${user.id}/avatar.${extension}`;
  const previousAvatarPath =
    currentProfile?.avatar_url && !/^https?:\/\//i.test(currentProfile.avatar_url)
      ? currentProfile.avatar_url
      : null;

  if (previousAvatarPath && previousAvatarPath !== avatarPath) {
    await supabase.storage.from("user-avatars").remove([previousAvatarPath]);
  }

  const { error: uploadError } = await supabase.storage
    .from("user-avatars")
    .upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: true,
    });

  if (uploadError) {
    return jsonResponse(
      {
        error: {
          code: "AVATAR_UPLOAD_FAILED",
          details: uploadError.message,
          message: getUploadErrorMessage(uploadError.message),
        },
        ok: false,
      },
      500,
    );
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      avatar_url: avatarPath,
      id: user.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    await supabase.storage.from("user-avatars").remove([avatarPath]);

    return jsonResponse(
      {
        error: {
          code: "PROFILE_UPDATE_FAILED",
          details: profileError.message,
          message:
            "We uploaded the avatar, but could not save it to your profile.",
        },
        ok: false,
      },
      500,
    );
  }

  const avatarUrl = await resolveAccountAvatarUrl({
    avatarPath,
    supabase,
  });

  revalidateAccountPages();

  return jsonResponse({
    data: {
      avatar_url: avatarUrl,
    },
    ok: true,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to remove your avatar.",
        },
        ok: false,
      },
      401,
    );
  }

  const { data: profile, error: profileReadError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileAvatarRow>();

  if (profileReadError) {
    return jsonResponse(
      {
        error: {
          code: "PROFILE_READ_FAILED",
          details: profileReadError.message,
          message: "We could not load your avatar settings.",
        },
        ok: false,
      },
      500,
    );
  }

  if (profile?.avatar_url && !/^https?:\/\//i.test(profile.avatar_url)) {
    const { error: removeError } = await supabase.storage
      .from("user-avatars")
      .remove([profile.avatar_url]);

    if (removeError) {
      return jsonResponse(
        {
          error: {
            code: "AVATAR_REMOVE_FAILED",
            details: removeError.message,
            message: "We could not remove your avatar.",
          },
          ok: false,
        },
        500,
      );
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      avatar_url: null,
      id: user.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    return jsonResponse(
      {
        error: {
          code: "PROFILE_UPDATE_FAILED",
          details: profileError.message,
          message: "We could not clear the avatar from your profile.",
        },
        ok: false,
      },
      500,
    );
  }

  revalidateAccountPages();

  return jsonResponse({
    data: {
      avatar_url: null,
    },
    ok: true,
  });
}
