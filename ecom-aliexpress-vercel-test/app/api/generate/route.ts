import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/auth";
import { callMiniMaxImage } from "../../../lib/minimax";
import { buildLocalCopy } from "../../../lib/localPlanner";

export const runtime = "nodejs";

type ImageType = "main" | "scene" | "selling" | "parameter";

function buildSinglePrompt(input: {
  imageType: ImageType;
  productTitle: string;
  productDescription: string;
  sellingPoints: string;
  painPoints: string;
  shippingTag: string;
  productAnalysis: string;
}) {
  const typeRules: Record<ImageType, string> = {
    main: "High CTR AliExpress main image, large product, clean light background, 2-3 concise feature labels, product occupies about 65%-75%.",
    scene: "Realistic lifestyle scene image for AliExpress EU buyers, product clearly visible in a natural usage environment, warm commercial lighting.",
    selling: "Feature selling-point image, product plus 3-4 concise feature callouts, clean mobile-readable layout.",
    parameter: "Specification image, product plus 3-5 key specification cards, clean hierarchy and readable English text."
  };

  return `Create one square 1:1 AliExpress Europe ecommerce product image.

Image type: ${input.imageType}
Visual rule: ${typeRules[input.imageType] || typeRules.main}

Product title:
${input.productTitle || "N/A"}

Product description:
${input.productDescription || "N/A"}

Selling points:
${input.sellingPoints || "N/A"}

Buyer pain points:
${input.painPoints || "N/A"}

Product analysis / context:
${input.productAnalysis || "N/A"}

Shipping/local stock tag:
${input.shippingTag || "N/A"}

Strict requirements:
1. Use the uploaded product image as the product reference.
2. Keep product appearance, structure, color, proportions and key details unchanged as much as possible.
3. Use clean AliExpress EU commercial style.
4. Make the product clearly visible and prominent.
5. Use short readable English text only.
6. Do not invent accessories, certifications, buttons, ports, functions or specifications.
7. Avoid messy layout, distorted perspective, watermark, fake logo and unreadable text.
8. Output a polished 1024x1024 ecommerce-ready image.`;
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
    const painPoints = String(form.get("painPoints") || "");
    const shippingTag = String(form.get("shippingTag") || "");
    const productAnalysisText = String(form.get("productAnalysis") || "");

    if (!(productImage instanceof File) || productImage.size === 0) {
      return NextResponse.json({ error: "请上传产品图" }, { status: 400 });
    }

    const fallbackCopy = !productTitle || !productDescription
      ? buildLocalCopy({ rawTitle: productTitle, rawDescription: productDescription, rawSpecs: "", notes: sellingPoints, shippingTag })
      : null;

    const prompt = buildSinglePrompt({
      imageType,
      productTitle: productTitle || fallbackCopy?.title240 || "AliExpress Product",
      productDescription: productDescription || fallbackCopy?.optimizedDescription || "",
      sellingPoints: sellingPoints || fallbackCopy?.sellingPoints?.join("\n") || "",
      painPoints: painPoints || fallbackCopy?.painPoints?.join("\n") || "",
      shippingTag,
      productAnalysis: productAnalysisText
    });

    const imageResult = await callMiniMaxImage({
      prompt,
      productImage,
      referenceImage: referenceImage instanceof File && referenceImage.size > 0 ? referenceImage : null
    });

    return NextResponse.json({
      imageBase64: imageResult.imageBase64,
      prompt,
      productAnalysis: productAnalysisText ? { raw: productAnalysisText } : {},
      referenceStyle: {}
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MiniMax 单张生成失败" },
      { status: 500 }
    );
  }
}
