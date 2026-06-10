import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { isAuthed } from "@/lib/auth";
import {
  buildFinalPrompt,
  extractJson,
  ImageType,
  productAnalyzePrompt,
  referenceAnalyzePrompt
} from "@/lib/prompts";

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

async function analyzeImage(client: OpenAI, file: File, prompt: string) {
  const imageUrl = await fileToDataUrl(file);
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageUrl }
        ]
      }
    ]
  });
  const outputText = (response as any).output_text || JSON.stringify((response as any).output || "");
  return extractJson(outputText);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const productImage = form.get("productImage");
    const referenceImage = form.get("referenceImage");
    const imageType = String(form.get("imageType") || "main") as ImageType;
    const productTitle = String(form.get("productTitle") || "");
    const productDescription = String(form.get("productDescription") || "");
    const sellingPoints = String(form.get("sellingPoints") || "");
    const shippingTag = String(form.get("shippingTag") || "");

    if (!(productImage instanceof File) || productImage.size === 0) {
      return NextResponse.json({ error: "请上传产品图" }, { status: 400 });
    }
    if (!(referenceImage instanceof File) || referenceImage.size === 0) {
      return NextResponse.json({ error: "请上传参考图" }, { status: 400 });
    }

    const client = getClient();
    const [productAnalysis, referenceStyle] = await Promise.all([
      analyzeImage(client, productImage, productAnalyzePrompt),
      analyzeImage(client, referenceImage, referenceAnalyzePrompt)
    ]);

    const prompt = buildFinalPrompt({
      imageType,
      productAnalysis,
      referenceStyle,
      productTitle,
      productDescription,
      sellingPoints,
      shippingTag
    });

    const productBuffer = Buffer.from(await productImage.arrayBuffer());
    const referenceBuffer = Buffer.from(await referenceImage.arrayBuffer());
    const productFile = await toFile(productBuffer, productImage.name || "product.png", {
      type: productImage.type || "image/png"
    });
    const referenceFile = await toFile(referenceBuffer, referenceImage.name || "reference.png", {
      type: referenceImage.type || "image/png"
    });

    const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const result = await (client.images.edit as any)({
      model: imageModel,
      image: [productFile, referenceFile],
      prompt,
      size: "1024x1024",
      quality: "medium"
    });

    const imageBase64 = result?.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("图片模型没有返回 base64 图片，请检查模型名、API 权限或返回格式。 ");
    }

    return NextResponse.json({
      imageBase64,
      prompt,
      productAnalysis,
      referenceStyle
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成失败" },
      { status: 500 }
    );
  }
}
