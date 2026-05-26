import { NextResponse } from "next/server";
import { getReportsOverview } from "@/lib/reports/queries";
import type { ApiResponse } from "@/types/api";
import type { ReportsOverview } from "@/lib/reports/types";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await getReportsOverview(searchParams.get("range"));

  if (result.status === "forbidden") {
    return jsonResponse<ReportsOverview>(
      {
        error: {
          code: "REPORTS_FORBIDDEN",
          message: result.message,
        },
        ok: false,
      },
      403,
    );
  }

  if (result.status === "unauthenticated") {
    return jsonResponse<ReportsOverview>(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to view reports.",
        },
        ok: false,
      },
      401,
    );
  }

  if (result.status === "unavailable") {
    return jsonResponse<ReportsOverview>(
      {
        error: {
          code: "REPORTS_UNAVAILABLE",
          message: result.message,
        },
        ok: false,
      },
      500,
    );
  }

  if (result.status === "ready") {
    return jsonResponse({
      data: result.data,
      ok: true,
    });
  }

  return jsonResponse<ReportsOverview>(
    {
      error: {
        code: "REPORTS_UNAVAILABLE",
        message: "Reports could not be loaded.",
      },
      ok: false,
    },
    500,
  );
}
