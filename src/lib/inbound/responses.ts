import { NextResponse } from "next/server";

export type InboundApiErrorCode =
  | "bad_request"
  | "forbidden"
  | "invalid_content_type"
  | "rate_limited"
  | "request_too_large"
  | "server_error"
  | "unauthorized"
  | "validation_error";

export type InboundApiErrorBody = {
  error: InboundApiErrorCode;
  message: string;
  ok: false;
};

export type InboundApiSuccessBody<T> = {
  data: T;
  ok: true;
};

export function inboundSuccess<T>(data: T, status = 200) {
  return NextResponse.json<InboundApiSuccessBody<T>>(
    {
      data,
      ok: true,
    },
    { status },
  );
}

export function inboundError(
  error: InboundApiErrorCode,
  message: string,
  status: number,
) {
  return NextResponse.json<InboundApiErrorBody>(
    {
      error,
      message,
      ok: false,
    },
    { status },
  );
}
