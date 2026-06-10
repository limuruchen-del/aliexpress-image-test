import { NextResponse } from "next/server";
import { isPasswordValid, setAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!isPasswordValid(String(body.password || ""))) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }
  await setAuthCookie();
  return NextResponse.json({ ok: true });
}
