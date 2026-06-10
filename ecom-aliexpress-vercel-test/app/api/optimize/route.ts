import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAuthed } from "../../../lib/auth";
import { extractJson } from "../../../lib/prompts";

export const runtime = "nodejs";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 未配置，请在 Vercel 环境变量里添加。 ");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function buildOptimizePrompt(input: {
  rawTitle: string;
  rawDescription: string;
  rawSpecs: string;
  notes: string;
  shippingTag: string;
}) {
  return `You are an AliExpress Europe listing optimization expert.

Analyze the uploaded product image and the seller-provided product information, then create practical listing content for AliExpress.

Seller raw title:
${input.rawTitle || "N/A"}

Seller raw description:
${input.rawDescription || "N/A"}

Raw specifications:
${input.rawSpecs || "N/A"}

Seller notes / priorities:
${input.notes || "N/A"}

Local stock / delivery tag:
${input.shippingTag || "N/A"}

Return ONLY valid JSON. Do not include markdown code fences.

JSON schema:
{
  "productAnalysis": {
    "productCategory": "",
    "mainColor": "",
    "material": "",
    "shapeStructure": "",
    "visibleAccessories": [],
    "useScenarios": [],
    "keySpecs": []
  },
  "sellingPoints": [
    "5-8 concise English selling points based on real visible/product info"
  ],
  "painPoints": [
    "4-6 customer pain points or purchase reasons"
  ],
  "title240": "One AliExpress English title around 220-240 characters. Start with the core product keyword. Include main specs, functions, use scenarios and search-friendly terms. Avoid keyword stuffing and exaggerated claims.",
  "optimizedDescription": "AliExpress English description using exactly these sections: ⭐ Features, ⚠ Specifications, 📦 Package Includes, ⭐ Why Choose This Product. Use clear concise English and avoid unsupported claims.",
  "imageCopy": {
    "mainImageText": ["up to 3 short English text labels for main image"],
    "sceneImageText": ["up to 3 short English scene/pain-point labels"],
    "sellingImageText": ["3-4 concise feature labels"],
    "parameterImageText": ["3-5 concise spec labels"]
  }
}

Rules:
1. Do not invent certifications, materials, accessories, power, capacity, sizes or functions not present in the provided information.
2. If a spec is unclear, avoid exact numeric claims.
3. Write for European AliExpress buyers.
4. Prefer practical purchase reasons over exaggerated marketing.
5. Keep the title within 240 characters if possible.`;
}

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

    const imageUrl = await fileToDataUrl(productImage);
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
    const client = getClient();
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildOptimizePrompt({ rawTitle, rawDescription, rawSpecs, notes, shippingTag }) },
            { type: "input_image", image_url: imageUrl }
          ]
        }
      ]
    });

    const outputText = (response as any).output_text || JSON.stringify((response as any).output || "");
    const data = extractJson(outputText);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "优化失败" },
      { status: 500 }
    );
  }
}
