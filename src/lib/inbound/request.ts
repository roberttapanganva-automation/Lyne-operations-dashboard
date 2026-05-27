import { createHash } from "crypto";

type JsonBodyReadSuccess<T> = {
  data: T;
  ok: true;
};

type JsonBodyReadFailure = {
  error: "invalid_content_type" | "bad_request" | "request_too_large";
  message: string;
  ok: false;
  status: 400 | 413 | 415;
};

type ReadInboundJsonBodyOptions<T> = {
  allowEmptyObject?: boolean;
  maxBytes: number;
  transform?: (value: unknown) => T;
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getInboundRequestFingerprint(request: Request, route: string) {
  const forwardedFor =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for") ??
    "";
  const ip = forwardedFor.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const rawFingerprint = `${route}|${ip}|${userAgent}|${acceptLanguage}`;

  return hashValue(rawFingerprint);
}

export async function readInboundJsonBody<T = Record<string, unknown>>(
  request: Request,
  options: ReadInboundJsonBodyOptions<T>,
): Promise<JsonBodyReadSuccess<T> | JsonBodyReadFailure> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      error: "invalid_content_type",
      message: "Send an application/json request body.",
      ok: false,
      status: 415,
    };
  }

  const contentLengthHeader = request.headers.get("content-length");
  const parsedContentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : Number.NaN;

  if (
    Number.isFinite(parsedContentLength) &&
    parsedContentLength > options.maxBytes
  ) {
    return {
      error: "request_too_large",
      message: "Request body is too large.",
      ok: false,
      status: 413,
    };
  }

  let rawText = "";

  try {
    rawText = await request.text();
  } catch {
    return {
      error: "bad_request",
      message: "We could not read the request body.",
      ok: false,
      status: 400,
    };
  }

  if (Buffer.byteLength(rawText, "utf8") > options.maxBytes) {
    return {
      error: "request_too_large",
      message: "Request body is too large.",
      ok: false,
      status: 413,
    };
  }

  if (rawText.trim().length === 0) {
    if (options.allowEmptyObject) {
      const emptyObject = {} as T;

      return {
        data: options.transform ? options.transform(emptyObject) : emptyObject,
        ok: true,
      };
    }

    return {
      error: "bad_request",
      message: "Send a valid JSON request body.",
      ok: false,
      status: 400,
    };
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;

    return {
      data: options.transform ? options.transform(parsed) : (parsed as T),
      ok: true,
    };
  } catch {
    return {
      error: "bad_request",
      message: "We could not read the request body as JSON.",
      ok: false,
      status: 400,
    };
  }
}
