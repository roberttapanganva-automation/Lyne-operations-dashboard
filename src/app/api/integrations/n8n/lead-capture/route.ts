import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { verifyN8nPayloadSignature } from "@/lib/n8n/signature";
import type { ApiResponse } from "@/types/api";

const n8nLeadCaptureSchema = z
  .object({
    contact_name: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    estimated_value: z.number().min(0).optional(),
    external_id: z.string().trim().optional(),
    next_follow_up_at: z.string().datetime().optional(),
    notes: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    source: z.string().trim().optional(),
    title: z.string().trim().min(1),
    workspace_slug: z.string().trim().optional(),
  })
  .strict();

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const signingSecret = process.env.N8N_SIGNING_SECRET?.trim();
  const rawBody = await request.text();

  if (!signingSecret) {
    return jsonResponse(
      {
        error: {
          code: "N8N_LEAD_CAPTURE_DEFERRED",
          message:
            "Inbound n8n lead capture is deferred until a signing secret and workspace-safe inbound configuration are available.",
        },
        ok: false,
      },
      501,
    );
  }

  const signature = request.headers.get("x-opspilot-signature");

  if (
    !verifyN8nPayloadSignature({
      payload: rawBody,
      secret: signingSecret,
      signature,
    })
  ) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_SIGNATURE",
          message: "The n8n lead capture signature is invalid.",
        },
        ok: false,
      },
      401,
    );
  }

  try {
    n8nLeadCaptureSchema.parse(JSON.parse(rawBody));

    return jsonResponse(
      {
        error: {
          code: "N8N_LEAD_CAPTURE_DEFERRED",
          message:
            "Signed payload accepted, but public lead creation is deferred because this route cannot safely create workspace leads without service-role access or a workspace public-key mapping.",
        },
        ok: false,
      },
      501,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the lead capture payload and try again.",
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Send a valid JSON lead capture payload.",
        },
        ok: false,
      },
      400,
    );
  }
}
