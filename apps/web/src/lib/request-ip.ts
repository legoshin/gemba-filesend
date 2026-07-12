import { NextRequest } from "next/server";

/**
 * Client IP from the first x-forwarded-for hop. On Vercel this header is set
 * and overwritten at the edge with the real client IP, so it is not
 * client-spoofable in production. See README.md "Deployment Requirement:
 * Trusted Proxy" for the non-Vercel caveat (WR-05).
 */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
