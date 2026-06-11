import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/auth";
import { buildLocalCopy } from "../../../lib/localPlanner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const productImage = form.get("productImage");
    const rawTitle = String(form.get("rawTitle") || "");
    const rawDescription = String(form.get("rawDescription") || "");
    const rawSpecs = String(form.get("rawSpecs") || "");
    const notes = String(form.get("notes") || "");
    const shippingTag = String(form.get("shippingTag") || "");

    if (!(productImage instanceof File) || productImage.size === 0) {
      return NextResponse.json({ error: "请先上传产品图" }, { status: 400 });
    }
    if (!rawDescription.trim() && !rawSpecs.trim() && !rawTitle.trim()) {
      return NextResponse.json({ error: "请至少填写原始描述、参数或标题之一" }, { status: 400 });
    }

    const data = buildLocalCopy({ rawTitle, rawDescription, rawSpecs, notes, shippingTag });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "本地优化失败" },
      { status: 500 }
    );
  }
}
