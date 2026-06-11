import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/auth";
import { callMiniMaxImage } from "../../../lib/minimax";

export const runtime = "nodejs";

function buildSetImagePrompt(input: {
  plan: any;
  imageTask: any;
  shippingTag: string;
}) {
  const plan = input.plan || {};
  const task = input.imageTask || {};
  const copy = plan.copy_assets || {};
  const product = plan.product_context || {};
  const visual = plan.visual_system || {};

  return `Create one square 1:1 AliExpress Europe e-commerce product image for a complete listing image set.

This is image ${task.order || ""}/10.
Slot ID: ${task.slot_id || ""}
Task type: ${task.task_type || ""}
Image title: ${task.title || ""}
Goal: ${task.goal || ""}
Layout role: ${task.layout_role || ""}

Product context:
${JSON.stringify(product, null, 2)}

Optimized AliExpress title:
${copy.optimized_title_240 || "N/A"}

Optimized description:
${copy.optimized_description || "N/A"}

Full selling points:
${JSON.stringify(copy.selling_points || [], null, 2)}

Buyer pain points / purchase reasons:
${JSON.stringify(copy.pain_points || [], null, 2)}

This image should focus on:
Selling points: ${JSON.stringify(task.focus_selling_points || [], null, 2)}
Pain points: ${JSON.stringify(task.focus_pain_points || [], null, 2)}
Specs: ${JSON.stringify(task.focus_specs || [], null, 2)}
Scene: ${task.focus_scene || "N/A"}

Image text / copy blocks to use:
${JSON.stringify(task.copy_blocks || [], null, 2)}

Visual direction:
${task.visual_direction || "N/A"}

Must show:
${JSON.stringify(task.must_show || [], null, 2)}

Optional show:
${JSON.stringify(task.optional_show || [], null, 2)}

Layout rules:
${JSON.stringify(task.layout_rules || [], null, 2)}

Negative rules:
${JSON.stringify(task.negative_rules || [], null, 2)}

Overall visual system:
${JSON.stringify(visual, null, 2)}

Shipping/local stock tag:
${input.shippingTag || copy.shipping_tag || "N/A"}

Strict requirements:
1. Keep the uploaded product appearance, structure, color, proportions and key details unchanged as much as possible.
2. This is part of a 10-image set, so keep typography, lighting, spacing and visual rhythm consistent with a clean AliExpress detail page style.
3. The detail images should feel like a coherent set, not random single posters.
4. Use short, readable English text only. Avoid overcrowding.
5. Do not invent certifications, specifications, accessories, buttons, parts, materials or functions.
6. Do not copy any brand logo, watermark, person, exact protected text, or competitor design from reference images.
7. Make the product clearly visible. Even scene images must keep the product as the hero.
8. Avoid distorted perspective, floating products, fake accessories, messy composition, inconsistent shadows and unreadable text.
9. Output a polished square 1024x1024 AliExpress-ready image.`;
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const productImage = form.get("productImage");
    const referenceImage = form.get("referenceImage");
    const planText = String(form.get("plan") || "");
    const imageTaskText = String(form.get("imageTask") || "");
    const shippingTag = String(form.get("shippingTag") || "");

    if (!(productImage instanceof File) || productImage.size === 0) {
      return NextResponse.json({ error: "请上传产品图" }, { status: 400 });
    }
    if (!planText || !imageTaskText) {
      return NextResponse.json({ error: "缺少套图规划或图片任务" }, { status: 400 });
    }

    const plan = JSON.parse(planText);
    const imageTask = JSON.parse(imageTaskText);
    const prompt = buildSetImagePrompt({ plan, imageTask, shippingTag });
    const imageResult = await callMiniMaxImage({
      prompt,
      productImage,
      referenceImage: referenceImage instanceof File && referenceImage.size > 0 ? referenceImage : null
    });

    return NextResponse.json({
      imageBase64: imageResult.imageBase64,
      prompt,
      imageTask,
      slotId: imageTask.slot_id,
      title: imageTask.title || imageTask.slot_id
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "套图单张生成失败" }, { status: 500 });
  }
}
