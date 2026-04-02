import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "6789";
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    console.error("ADMIN_SECRET env var is not set");
    return NextResponse.json({ error: "服务器未配置 ADMIN_SECRET" }, { status: 500 });
  }

  if (pin !== adminPin) {
    return NextResponse.json({ error: "PIN 错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("pl_admin", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  return res;
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pl_admin", "", { maxAge: 0, path: "/" });
  return res;
}
