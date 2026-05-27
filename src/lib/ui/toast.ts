"use client";

import { gooeyToast } from "goey-toast";
import type { ReactNode } from "react";

type ToastDescription = ReactNode | string | null | undefined;

type PromiseMessages<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
  description?: {
    loading?: ToastDescription;
    success?: ToastDescription | ((data: T) => ToastDescription);
    error?: ToastDescription | ((error: unknown) => ToastDescription);
  };
};

const defaultToastOptions = {
  preset: "smooth" as const,
  showProgress: true,
  timing: {
    displayDuration: 3500,
  },
};

function normalizeDescription(description?: ToastDescription) {
  if (typeof description === "string") {
    const trimmedDescription = description.trim();
    return trimmedDescription.length > 0 ? trimmedDescription : undefined;
  }

  return description ?? undefined;
}

function safeErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export const notify = {
  success(title: string, description?: ToastDescription) {
    return gooeyToast.success(title, {
      ...defaultToastOptions,
      description: normalizeDescription(description),
    });
  },
  simpleSuccess(title: string, description?: ToastDescription) {
    return gooeyToast.success(title, {
      ...defaultToastOptions,
      description: normalizeDescription(description),
      showProgress: false,
      timing: {
        displayDuration: 2000,
      },
    });
  },
  error(title: string, description?: ToastDescription) {
    return gooeyToast.error(title, {
      ...defaultToastOptions,
      description: normalizeDescription(description ?? "Please try again."),
    });
  },
  warning(title: string, description?: ToastDescription) {
    return gooeyToast.warning(title, {
      ...defaultToastOptions,
      description: normalizeDescription(description),
    });
  },
  info(title: string, description?: ToastDescription) {
    return gooeyToast.info(title, {
      ...defaultToastOptions,
      description: normalizeDescription(description),
    });
  },
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
    const errorMessage = messages.error;
    const successDescription = messages.description?.success;
    const errorDescription = messages.description?.error;

    return gooeyToast.promise(promise, {
      ...defaultToastOptions,
      loading: messages.loading,
      success: messages.success,
      error:
        typeof errorMessage === "function"
          ? (error) => errorMessage(error)
          : () => errorMessage,
      description: messages.description
        ? {
            loading: normalizeDescription(messages.description.loading),
            success:
              typeof successDescription === "function"
                ? (data) =>
                    normalizeDescription(successDescription(data))
                : normalizeDescription(successDescription),
            error:
              typeof errorDescription === "function"
                ? (error) =>
                    normalizeDescription(errorDescription(error))
                : normalizeDescription(errorDescription),
          }
        : undefined,
    });
  },
  update: gooeyToast.update,
  dismiss: gooeyToast.dismiss,
  safeErrorMessage,
};
