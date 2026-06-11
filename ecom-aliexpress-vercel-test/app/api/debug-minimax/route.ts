import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/auth";

export const runtime = "nodejs";

function mask(value?: string) {
  const v = value?.trim() || "";
  if (!v) return { exists: false, prefix: "", suffix: "", length: 0, startsWithSkApi: false };
  return {
    exists: true,
    prefix: v.slice(0, 10),
    suffix: v.slice(-4),
    length: v.length,
    startsWithSkApi: v.startsWith("sk-api")
  };
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const baseUrl = (process.env.MINIMAX_API_BASE_URL || "https://api.minimaxi.com").trim();
  return NextResponse.json({
    minimaxApiKey: mask(process.env.MINIMAX_API_KEY),
    minimaxGroupId: mask(process.env.MINIMAX_GROUP_ID),
    minimaxTextModel: process.env.MINIMAX_TEXT_MODEL || "",
    minimaxImageModel: process.env.MINIMAX_IMAGE_MODEL || "",
    minimaxApiBaseUrl: baseUrl
  });
}
