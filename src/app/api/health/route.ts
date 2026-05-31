import { NextResponse } from "next/server";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";

export function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      app: DEFAULT_BRAND.appName,
      status: "healthy",
    },
  });
}
