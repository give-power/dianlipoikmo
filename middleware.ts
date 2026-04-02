import { NextRequest, NextResponse } from "next/server";

// Worker-facing POST paths — no admin auth required
const WORKER_PATHS = [
  "/api/checkin",
  "/api/reports",
  "/api/corrections",
  "/api/worker/chat",
  "/api/upload",
  "/api/auth/admin",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // GET requests are public (read-only)
  if (method === "GET") return NextResponse.next();

  // Worker-facing POST paths are exempt from admin auth
  const isWorkerPath = WORKER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isWorkerPath) return NextResponse.next();

  // All other write operations require admin cookie
  const token = req.cookies.get("pl_admin")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "未授权，请先登录管理后台" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
