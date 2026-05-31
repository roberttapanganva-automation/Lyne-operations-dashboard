"use client";

export const ACCOUNT_UPDATED_EVENT = "opspilot:account-updated";

export type AccountUpdatedDetail = {
  avatarUrl?: string | null;
  fullName?: string | null;
};

export function dispatchAccountUpdated(detail: AccountUpdatedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AccountUpdatedDetail>(ACCOUNT_UPDATED_EVENT, {
      detail,
    }),
  );
}
