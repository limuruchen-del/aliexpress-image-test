export type ImageType = "main" | "scene" | "selling" | "parameter";

export const imageTypeLabel: Record<ImageType, string> = {
  main: "AliExpress main image / 首图",
  scene: "AliExpress lifestyle scene image / 场景图",
  selling: "AliExpress feature selling-point image / 卖点图",
  parameter: "AliExpress specification parameter image / 参数图"
};

export const referenceAnalyzePrompt = `你是一个速卖通欧区电商图片风格分析助手。

请分析用户上传的参考图片，提取可复用的视觉风格信息，输出结构化 JSON。

要求：
1. 识别该图属于哪种图片类型：首图、场景图、卖点图、参数图、详情图。
2. 提取构图方式、背景风格、产品占比、文字布局、色彩风格、卖点表达方式。
3. 只分析视觉风格，不复制品牌、Logo、水印、人物、竞品文案。
4. 输出适合后续商品图生成使用的 JSON。
5. 输出必须是纯 JSON，不要包含 markdown 代码块。

输出字段：
{
  "image_type": "",
  "layout": "",
  "background": "",
  "product_ratio": "",
  "text_layout": "",
  "color_style": "",
  "selling_point_style": "",
  "lighting": "",
  "composition_rules": [],
  "avoid": []
}`;

export const productAnalyzePrompt = `你是一个跨境电商产品识别助手。

请根据上传的产品图，识别产品信息，并输出 JSON。

要求：
1. 识别产品类别、颜色、材质、结构、配件、适合场景、核心卖点。
2. 特别指出生成图片时必须保留的产品特征。
3. 提醒可能出错的地方，如比例错误、结构变形、配件缺失等。
4. 输出必须是纯 JSON，不要包含 markdown 代码块。

输出 JSON：
{
  "product_category": "",
  "main_color": "",
  "material": "",
  "shape_structure": "",
  "visible_accessories": [],
  "possible_use_scenes": [],
  "core_selling_points": [],
  "must_keep": [],
  "risks": []
}`;

export function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return { raw: cleaned };
  }
}

export function buildFinalPrompt(input: {
  imageType: ImageType;
  productAnalysis: Record<string, unknown>;
  referenceStyle?: Record<string, unknown> | null;
  productTitle: string;
  productDescription: string;
  sellingPoints: string;
  painPoints?: string;
  shippingTag: string;
}) {
  const typeRules: Record<ImageType, string> = {
    main: `Main image rules:\n- Product should occupy about 65%-75% of the image.\n- Clean white/light gray gradient background with professional shadow.\n- Reserve upper-left corner for logo placement.\n- Show no more than 3 concise English selling points.\n- Focus on click-through rate, search relevance and conversion value.`,
    scene: `Scene image rules:\n- Place the product in a realistic European home, kitchen, garden, garage, office, RV or outdoor setting that matches the product usage.\n- Natural warm lighting, real-life scale and perspective.\n- No people, no messy background, no floating object.\n- Scene should immediately explain the buyer pain point and usage reason.`,
    selling: `Selling-point image rules:\n- Show 3-4 concise English feature callouts from the optimized selling points.\n- Use clean labels, lines or small info cards pointing to real product functions.\n- Make text large and readable on mobile.\n- Do not invent functions or accessories.`,
    parameter: `Parameter image rules:\n- Show key specs, size, capacity, package or usage information in a clean layout.\n- Use simple English labels and clear hierarchy.\n- Do not overcrowd the image.\n- Keep the product as the visual center.`
  };

  const referenceBlock = input.referenceStyle && Object.keys(input.referenceStyle).length
    ? `Reference style JSON:\n${JSON.stringify(input.referenceStyle, null, 2)}\n\nUse the reference image only for layout, lighting, background style, composition, and selling-point presentation.`
    : `No reference image was provided. Use a clean, professional AliExpress Europe e-commerce layout based on the selected image type.`;

  return `Create a high-converting AliExpress EU product image based on the uploaded product photo.

Target platform: AliExpress Europe
Image type: ${imageTypeLabel[input.imageType]}

Optimized AliExpress title:
${input.productTitle || "N/A"}

Optimized product description:
${input.productDescription || "N/A"}

Selling points to emphasize:
${input.sellingPoints || "N/A"}

Customer pain points / purchase reasons:
${input.painPoints || "N/A"}

Shipping/local stock tag:
${input.shippingTag || "N/A"}

Product analysis JSON:
${JSON.stringify(input.productAnalysis, null, 2)}

${referenceBlock}

${typeRules[input.imageType]}

Strict requirements:
1. Keep the uploaded product appearance, structure, color, proportions, and key details unchanged as much as possible.
2. Make the image suitable for AliExpress European buyers.
3. Clean, professional, conversion-oriented, visually attractive.
4. Avoid distorted perspective, floating products, fake accessories, messy composition, and inconsistent shadows.
5. Do not copy any brand logo, watermark, person, exact protected text, or exact competitor design.
6. Use clean and readable English text only when needed.
7. Output a square 1:1 AliExpress-ready product image.`;
}
