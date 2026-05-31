"use client";

import { GooeyToaster } from "goey-toast";

export function AppToaster() {
  return (
    <GooeyToaster
      closeButton="top-left"
      position="top-right"
      showProgress
      theme="light"
    />
  );
}
