type LocalInput = {
  rawTitle: string;
  rawDescription: string;
  rawSpecs: string;
  notes: string;
  shippingTag: string;
};

type SellingPoint = {
  title: string;
  detail: string;
  source: string;
  priority: number;
};

type PainPoint = {
  title: string;
  buyerProblem: string;
  productSolution: string;
  matchedSellingPoint: string;
  priority: number;
};

function cleanText(value: string) {
  return (value || "").replace(/\r/g, "\n").replace(/\s+/g, " ").trim();
}

function splitLines(value: string) {
  return (value || "")
    .replace(/\r/g, "\n")
    .split(/\n|\r|•|·|;|；/g)
    .map((x) => x.replace(/^[-*\d.、\s]+/, "").trim())
    .filter(Boolean);
}

function unique(items: string[], max = 12) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const v = item.trim();
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

function titleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferCategory(input: LocalInput) {
  const text = `${input.rawTitle} ${input.rawDescription} ${input.rawSpecs}`.toLowerCase();
  const checks: [RegExp, string][] = [
    [/ice\s*maker|ice\s*machine|ice\s*cube|制冰/, "Portable Ice Maker"],
    [/incubator|egg|孵化|孵蛋/, "Egg Incubator"],
    [/grass\s*trimmer|lawn\s*mower|brush\s*cutter|割草|打草/, "Cordless Grass Trimmer"],
    [/hedge\s*trimmer|绿篱/, "Hedge Trimmer"],
    [/leaf\s*blower|吹叶/, "Cordless Leaf Blower"],
    [/pressure\s*washer|car\s*washer|洗车|清洗机/, "Cordless Pressure Washer"],
    [/gazebo|canopy|tent|帐篷|凉亭/, "Pop Up Canopy Tent"],
    [/welding|welder|焊机/, "Welding Machine"],
    [/impact\s*wrench|electric\s*wrench|扳手/, "Cordless Impact Wrench"],
    [/cat\s*litter|litter\s*box|猫砂/, "Cat Litter Box"],
    [/pet\s*ramp|dog\s*ramp|宠物坡/, "Pet Ramp"],
    [/ice|冰/, "Portable Ice Maker"]
  ];
  for (const [regex, category] of checks) if (regex.test(text)) return category;
  const firstTitle = cleanText(input.rawTitle).split(/[,，|]/)[0]?.trim();
  return firstTitle ? titleCase(firstTitle.slice(0, 46)) : "Ecommerce Product";
}

function categoryDefaults(category: string) {
  const c = category.toLowerCase();
  if (c.includes("ice maker")) {
    return {
      scenarios: ["home kitchen", "office", "party", "RV", "camping", "small gatherings"],
      selling: [
        ["Fast Ice Making", "Makes fresh ice quickly for daily drinks and small gatherings"],
        ["Compact Countertop Design", "Fits neatly on kitchen counters, bars, offices and RV spaces"],
        ["Easy Daily Cleaning", "Simple cleaning helps reduce daily maintenance work"],
        ["Portable Use", "Convenient for home, office, party and outdoor scenarios"],
        ["Practical Ice Storage", "Keeps ice ready for drinks, coffee, juice and cocktails"]
      ],
      pain: [
        ["No More Waiting for Ice", "Need fresh ice quickly for cold drinks", "Fast output helps prepare ice in minutes", "Fast Ice Making"],
        ["Fits Small Countertops", "Limited kitchen or office counter space", "Compact body is easier to place and store", "Compact Countertop Design"],
        ["Easy to Maintain", "Daily cleaning can be troublesome", "Simple cleaning design reduces maintenance effort", "Easy Daily Cleaning"],
        ["Ready for Gatherings", "Ice may run out during parties or meals", "Convenient ice supply for small gatherings", "Portable Use"]
      ]
    };
  }
  if (c.includes("trimmer") || c.includes("mower") || c.includes("blower") || c.includes("washer") || c.includes("wrench")) {
    return {
      scenarios: ["home garden", "garage", "yard", "outdoor work", "car cleaning", "DIY maintenance"],
      selling: [
        ["Cordless Convenience", "Easy to move without cable restrictions"],
        ["Efficient Performance", "Designed for practical daily cleaning, trimming or maintenance tasks"],
        ["Lightweight Handling", "Comfortable to carry and use for routine work"],
        ["Practical Accessory Set", "Useful accessories help cover different working needs"],
        ["Easy Storage", "Compact tool body is easier to store after use"]
      ],
      pain: [
        ["Less Effort for Daily Work", "Manual work can be tiring and slow", "Efficient motorized design helps save effort", "Efficient Performance"],
        ["Move Freely Outdoors", "Cable tools limit working range", "Cordless design improves mobility", "Cordless Convenience"],
        ["Ready for Multiple Tasks", "Different tasks often need different accessories", "Accessory set supports more use cases", "Practical Accessory Set"],
        ["Easy to Store", "Large tools take up too much space", "Compact design supports easier storage", "Easy Storage"]
      ]
    };
  }
  if (c.includes("canopy") || c.includes("tent")) {
    return {
      scenarios: ["garden", "patio", "camping", "market stall", "outdoor party", "family gathering"],
      selling: [
        ["Outdoor Shelter", "Provides shade and cover for outdoor activities"],
        ["Easy Setup", "Designed for convenient assembly and daily outdoor use"],
        ["Large Usable Space", "Suitable for family gatherings, markets and garden use"],
        ["Practical Sidewalls", "Side panels help create a more comfortable outdoor area"],
        ["Portable Storage", "Can be packed away when not in use"]
      ],
      pain: [
        ["Create Shade Outdoors", "Outdoor sun or light rain can interrupt activities", "Shelter design creates a more comfortable space", "Outdoor Shelter"],
        ["Set Up More Easily", "Complicated tents take too much time", "Convenient structure supports faster setup", "Easy Setup"],
        ["Room for More Uses", "Small shelters may not cover enough area", "Large space supports gatherings and stalls", "Large Usable Space"]
      ]
    };
  }
  return {
    scenarios: ["home", "office", "daily use", "outdoor", "small business"],
    selling: [
      ["Practical Design", "Designed for convenient everyday use"],
      ["Easy to Use", "Simple operation makes it suitable for daily needs"],
      ["Space-Saving Structure", "Compact body is easier to place and store"],
      ["Useful for Multiple Scenarios", "Suitable for home, office and other practical scenes"],
      ["Reliable Everyday Choice", "A practical option for routine use"]
    ],
    pain: [
      ["Simplify Daily Use", "Daily tasks can be inconvenient without the right product", "Practical design helps improve convenience", "Practical Design"],
      ["Save Space", "Large products can be hard to place", "Compact design is easier to use and store", "Space-Saving Structure"],
      ["Use It in More Places", "Single-use products may not fit different scenarios", "Multi-scene design expands usage options", "Useful for Multiple Scenarios"]
    ]
  };
}

function extractSpecs(rawSpecs: string, rawDescription: string) {
  const lines = splitLines(`${rawSpecs}\n${rawDescription}`);
  const specLike = lines.filter((line) => {
    const l = line.toLowerCase();
    return /\d/.test(line) || l.includes("voltage") || l.includes("power") || l.includes("size") || l.includes("capacity") || l.includes("weight") || l.includes("material") || l.includes("color") || l.includes("dimension") || l.includes("rpm") || l.includes("mah") || l.includes("kg") || l.includes("cm") || l.includes("min");
  });
  return unique(specLike.map((x) => x.replace(/\s+/g, " ").slice(0, 70)), 8);
}

function extractUserSelling(rawSellingText: string, rawDescription: string) {
  const lines = splitLines(`${rawSellingText}\n${rawDescription}`);
  const featureWords = ["fast", "automatic", "portable", "compact", "clean", "easy", "adjustable", "quiet", "powerful", "large", "self", "capacity", "size", "lightweight", "cordless", "included", "design", "function"];
  return unique(lines.filter((line) => featureWords.some((w) => line.toLowerCase().includes(w))).map((x) => x.slice(0, 86)), 7);
}

function buildSellingPoints(input: LocalInput, category: string, keySpecs: string[]) {
  const defaults = categoryDefaults(category);
  const user = extractUserSelling(input.notes, `${input.rawDescription}\n${input.rawSpecs}`);
  const points: SellingPoint[] = [];

  user.slice(0, 4).forEach((line, index) => {
    const title = line.length > 34 ? line.slice(0, 34).replace(/[,.;:]?\s+\S*$/, "") : line;
    points.push({ title: titleCase(title), detail: line, source: "description", priority: index + 1 });
  });

  defaults.selling.forEach(([title, detail], index) => {
    points.push({ title, detail, source: "category_template", priority: 5 + index });
  });

  keySpecs.slice(0, 2).forEach((spec, index) => {
    points.push({ title: spec.slice(0, 32), detail: `Key specification: ${spec}`, source: "specs", priority: 3 + index });
  });

  const seen = new Set<string>();
  return points.filter((p) => {
    const key = p.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function buildPainPoints(category: string, sellingPoints: SellingPoint[]) {
  const defaults = categoryDefaults(category);
  const pain: PainPoint[] = defaults.pain.map(([title, buyerProblem, productSolution, matchedSellingPoint], index) => ({
    title,
    buyerProblem,
    productSolution,
    matchedSellingPoint,
    priority: index + 1
  }));

  if (pain.length < 4) {
    sellingPoints.slice(0, 3).forEach((sp, index) => pain.push({
      title: `${sp.title} for Daily Use`,
      buyerProblem: "Customers need a practical solution for daily use",
      productSolution: sp.detail,
      matchedSellingPoint: sp.title,
      priority: 5 + index
    }));
  }
  return pain.slice(0, 6);
}

function buildTitle(category: string, keySpecs: string[], sellingPoints: SellingPoint[], scenarios: string[], shippingTag: string) {
  const parts = [
    category,
    keySpecs.slice(0, 2).join(" "),
    sellingPoints.slice(0, 3).map((p) => p.title).join(" "),
    `for ${scenarios.slice(0, 4).map(titleCase).join(" ")}`,
    shippingTag ? shippingTag : "AliExpress EU"
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return parts.length > 240 ? parts.slice(0, 237).replace(/\s+\S*$/, "") + "..." : parts;
}

function buildDescription(category: string, keySpecs: string[], sellingPoints: SellingPoint[], painPoints: PainPoint[], scenarios: string[]) {
  const features = sellingPoints.slice(0, 6).map((p, i) => `${i + 1}. ${p.title}\n${p.detail}.`).join("\n\n");
  const specs = keySpecs.length ? keySpecs.slice(0, 8).map((s) => `- ${s}`).join("\n") : `- Product Name: ${category}\n- Use Scenes: ${scenarios.slice(0, 4).join(", ")}`;
  const why = painPoints.slice(0, 3).map((p) => `- ${p.productSolution}`).join("\n");
  return `⭐ Features\n\n${features}\n\n⚠ Specifications\n\n${specs}\n\n📦 Package Includes\n\n- 1 × ${category}\n- Accessories as shown in the product information\n\n⭐ Why Choose This Product\n\n${why}`;
}

export function buildLocalCopy(input: LocalInput) {
  const category = inferCategory(input);
  const defaults = categoryDefaults(category);
  const keySpecs = extractSpecs(input.rawSpecs, input.rawDescription);
  const sellingPoints = buildSellingPoints(input, category, keySpecs);
  const painPoints = buildPainPoints(category, sellingPoints);
  const useScenarios = unique(defaults.scenarios, 6);
  const title240 = buildTitle(category, keySpecs, sellingPoints, useScenarios, input.shippingTag);
  const optimizedDescription = buildDescription(category, keySpecs, sellingPoints, painPoints, useScenarios);

  return {
    productAnalysis: {
      productCategory: category,
      mainColor: "Based on uploaded product image",
      material: "Refer to product description and visible product surface",
      shapeStructure: "Keep the original product structure and proportions unchanged",
      visibleAccessories: [],
      useScenarios,
      keySpecs
    },
    sellingPoints: sellingPoints.map((p) => p.title),
    painPoints: painPoints.map((p) => p.title),
    title240,
    optimizedDescription,
    imageCopy: {
      mainImageText: [category, sellingPoints[0]?.title || "Practical Design", input.shippingTag].filter(Boolean).slice(0, 3),
      sceneImageText: [painPoints[0]?.title || "Made for Everyday Use", `For ${useScenarios.slice(0, 2).join(" & ")}`].filter(Boolean),
      sellingImageText: sellingPoints.slice(0, 4).map((p) => p.title),
      parameterImageText: keySpecs.slice(0, 5)
    },
    structured: {
      productCategory: category,
      sellingPointObjects: sellingPoints,
      painPointObjects: painPoints,
      keySpecs,
      useScenarios
    }
  };
}

function taskPrompt(task: any, plan: any) {
  const copy = plan.copy_assets;
  return `Create one square 1:1 AliExpress Europe ecommerce product image. Image ${task.order}/10, ${task.slot_id}. Role: ${task.title}. Goal: ${task.goal}. Use the uploaded product image as the product reference and keep the product appearance, structure, color, proportions and details unchanged. Product: ${plan.product_context.product_name}. Optimized title: ${copy.optimized_title_240}. Focus selling points: ${(task.focus_selling_points || []).join(", ")}. Focus pain points: ${(task.focus_pain_points || []).join(", ")}. Specs: ${(task.focus_specs || []).join(", ")}. Scene: ${task.focus_scene || "clean ecommerce background"}. Text blocks to use: ${(task.copy_blocks || []).join(" | ")}. Visual direction: ${task.visual_direction}. Requirements: clean commercial AliExpress EU style, consistent typography, readable short English text, product clearly visible, no fake functions, no fake accessories, no people, no messy layout, no watermark.`;
}

export function buildLocalPlan(input: LocalInput) {
  const copyResult = buildLocalCopy(input);
  const structured = copyResult.structured;
  const category = structured.productCategory;
  const selling = structured.sellingPointObjects;
  const pain = structured.painPointObjects;
  const specs = structured.keySpecs;
  const scenes = structured.useScenarios;

  const plan: any = {
    version: "local-1.0",
    platform: "AliExpress",
    language: "en",
    listing_mode: "full_listing_set_local",
    template_mode: "functional_product",
    set_name: "3_main_7_detail",
    product_context: {
      product_category: category,
      product_name: category,
      main_color: "follow uploaded product image",
      material: "follow product description and uploaded product image",
      shape_structure: "keep original product shape and structure",
      visible_accessories: [],
      use_scenarios: scenes,
      key_specs: specs,
      must_keep_features: ["original product appearance", "original color", "original proportions", "visible details from uploaded image"],
      risks: ["do not distort product", "do not invent accessories", "do not change structure", "avoid unreadable text"]
    },
    copy_assets: {
      raw_title: input.rawTitle,
      raw_description: input.rawDescription,
      raw_specs: input.rawSpecs,
      notes: input.notes,
      shipping_tag: input.shippingTag,
      optimized_title_240: copyResult.title240,
      optimized_description: copyResult.optimizedDescription,
      selling_points: selling.map((p) => p.title),
      pain_points: pain.map((p) => p.title),
      target_audience: scenes.slice(0, 5).map(titleCase),
      core_purchase_reasons: pain.slice(0, 4).map((p) => p.productSolution)
    },
    visual_system: {
      overall_style: "clean, commercial, professional AliExpress EU product image set",
      color_style: "product-led colors with consistent light background and clean accent blocks",
      background_style: "clean ecommerce background for main images, realistic matching scenes for detail images",
      lighting_style: "soft commercial lighting with natural shadows",
      font_style: "bold clean sans-serif",
      text_density: "medium",
      logo_reserved: true,
      consistency_rules: ["same typography", "same spacing rhythm", "short English text", "clear product visibility", "coherent full image set"]
    },
    generation_strategy: {
      generate_anchor_first: true,
      anchor_image_slot: "main_1",
      batch_after_anchor: false,
      output_ratio: "1:1",
      output_size: "1024x1024",
      image_count: 10
    },
    image_tasks: []
  };

  const topSelling = selling.slice(0, 4).map((p) => p.title);
  const topSpecs = specs.slice(0, 5);
  const topPain = pain.slice(0, 4).map((p) => p.title);
  const scene = scenes.slice(0, 4).join(" / ");

  plan.image_tasks = [
    {
      slot_id: "main_1", order: 1, group: "main", task_type: "high_ctr_main", title: "High CTR Main Image", goal: "Attract clicks on AliExpress search page", layout_role: "hero product image",
      focus_selling_points: topSelling.slice(0, 2), focus_pain_points: [], focus_specs: topSpecs.slice(0, 2), focus_scene: "clean ecommerce search result background",
      visual_direction: "large product hero image, clean light background, high product visibility, 2-3 short text labels",
      must_show: ["full product", "clean shadow", "clear product shape"], optional_show: [input.shippingTag, "small product-related props"].filter(Boolean),
      copy_blocks: [category, topSelling[0] || "Practical Design", input.shippingTag].filter(Boolean).slice(0, 3),
      layout_rules: ["product occupies about 65%-75%", "reserve upper-left logo area", "text must be large and readable"], negative_rules: ["no people", "no clutter", "no fake accessories"]
    },
    {
      slot_id: "main_2", order: 2, group: "main", task_type: "scene_main", title: "Lifestyle Scene Main Image", goal: "Show the product in a realistic buyer usage scene", layout_role: "scene-driven main image",
      focus_selling_points: topSelling.slice(0, 2), focus_pain_points: topPain.slice(0, 1), focus_specs: [], focus_scene: scene,
      visual_direction: "realistic European usage scene with product clearly visible and natural scale",
      must_show: ["product in real scene", "natural shadow", "clean composition"], optional_show: scenes.slice(0, 2),
      copy_blocks: [topPain[0] || "Made for Everyday Use", `For ${scenes.slice(0, 2).join(" & ")}`],
      layout_rules: ["scene supports product usage", "product remains hero", "no messy background"], negative_rules: ["no people", "no wrong scale", "no floating product"]
    },
    {
      slot_id: "main_3", order: 3, group: "main", task_type: "selling_point_main", title: "Selling Point Main Image", goal: "Summarize the strongest 3-4 product advantages", layout_role: "feature-led main image",
      focus_selling_points: topSelling, focus_pain_points: [], focus_specs: [], focus_scene: "clean feature layout",
      visual_direction: "product with 3-4 clean feature cards, mobile-readable layout",
      must_show: ["product body", "feature cards", "clear hierarchy"], optional_show: [], copy_blocks: topSelling,
      layout_rules: ["keep text concise", "feature cards around product", "balanced spacing"], negative_rules: ["no excessive text", "no fake icons"]
    },
    {
      slot_id: "detail_1", order: 4, group: "detail", task_type: "overview_features", title: "Feature Overview", goal: "Show the product's strongest advantages as a complete overview", layout_role: "overview detail image",
      focus_selling_points: topSelling, focus_pain_points: [], focus_specs: [], focus_scene: "clean overview page",
      visual_direction: "unified detail page with product and 3-4 feature modules", must_show: ["product", "3-4 feature modules"], optional_show: [], copy_blocks: ["Feature Overview", ...topSelling.slice(0, 4)],
      layout_rules: ["looks like one set with other images", "clear section title"], negative_rules: ["no random unrelated props"]
    },
    {
      slot_id: "detail_2", order: 5, group: "detail", task_type: "core_feature_scene", title: "Core Feature Scene", goal: "Visualize the strongest selling point through a scene", layout_role: "single-feature conversion image",
      focus_selling_points: topSelling.slice(0, 1), focus_pain_points: topPain.slice(0, 1), focus_specs: topSpecs.slice(0, 1), focus_scene: scenes[0] || "daily use scene",
      visual_direction: "scene-based image focused on one strongest feature and its buyer benefit", must_show: ["product", "visual expression of core feature"], optional_show: [], copy_blocks: [topSelling[0] || "Practical Design", topPain[0] || "Easy Daily Use"],
      layout_rules: ["one message only", "feature should be obvious"], negative_rules: ["no multiple competing messages"]
    },
    {
      slot_id: "detail_3", order: 6, group: "detail", task_type: "pain_point_solution", title: "Pain Point Solution", goal: "Turn buyer pain point into purchase reason", layout_role: "pain-point driven detail image",
      focus_selling_points: topSelling.slice(0, 2), focus_pain_points: topPain.slice(0, 2), focus_specs: [], focus_scene: scenes[0] || "buyer usage scene",
      visual_direction: "buyer problem solved visually with product, clear before/benefit feeling without direct competitor attack", must_show: ["product", "clear buyer benefit"], optional_show: [], copy_blocks: topPain.slice(0, 2),
      layout_rules: ["buyer language", "simple visual storytelling"], negative_rules: ["no aggressive competitor claims", "no exaggerated promises"]
    },
    {
      slot_id: "detail_4", order: 7, group: "detail", task_type: "detail_structure", title: "Functional Details", goal: "Show real product details and structure", layout_role: "detail close-up image",
      focus_selling_points: topSelling.slice(1, 4), focus_pain_points: [], focus_specs: [], focus_scene: "close-up product detail layout",
      visual_direction: "close-up detail layout with callout labels based only on visible or described details", must_show: ["real product details", "callout labels", "original structure"], optional_show: [], copy_blocks: topSelling.slice(1, 4),
      layout_rules: ["detail crops must look real", "labels point to plausible product areas"], negative_rules: ["do not invent buttons", "do not invent ports", "do not invent accessories"]
    },
    {
      slot_id: "detail_5", order: 8, group: "detail", task_type: "specification_image", title: "Key Specs", goal: "Show the most useful specs clearly", layout_role: "specification detail image",
      focus_selling_points: [], focus_pain_points: [], focus_specs: topSpecs, focus_scene: "clean parameter layout",
      visual_direction: "clean specification layout with product and 3-5 key spec cards", must_show: ["product", "key spec cards"], optional_show: [], copy_blocks: topSpecs.length ? topSpecs : ["Key Specs", category],
      layout_rules: ["do not overload", "specs must be readable", "use only provided specs"], negative_rules: ["no invented numbers", "no fake certifications"]
    },
    {
      slot_id: "detail_6", order: 9, group: "detail", task_type: "extended_info", extended_info_subtype: "multi_scene_usage", title: "Multiple Use Scenarios", goal: "Expand use cases and buyer audience", layout_role: "supporting information image",
      focus_selling_points: topSelling.slice(0, 2), focus_pain_points: [], focus_specs: [], focus_scene: scene,
      visual_direction: "multi-scene usage layout with product as center and scenario labels around it", must_show: ["product", "multiple scenario labels"], optional_show: scenes.slice(0, 4), copy_blocks: scenes.slice(0, 4).map(titleCase),
      layout_rules: ["show broad use cases", "keep product central"], negative_rules: ["no unrelated scenario"]
    },
    {
      slot_id: "detail_7", order: 10, group: "detail", task_type: "closing_summary", title: "Why Choose This Product", goal: "Wrap up the strongest reasons to buy", layout_role: "final persuasion image",
      focus_selling_points: topSelling, focus_pain_points: topPain.slice(0, 2), focus_specs: [], focus_scene: "clean final summary background",
      visual_direction: "final summary image with product and strongest benefits, polished ending page", must_show: ["product", "3-4 strongest benefits"], optional_show: [], copy_blocks: ["Why Choose This Product", ...topSelling.slice(0, 3)],
      layout_rules: ["feels like final page", "high trust and clean layout"], negative_rules: ["do not repeat too much text", "no exaggerated claims"]
    }
  ];

  plan.image_tasks = plan.image_tasks.map((task: any) => ({ ...task, prompt: taskPrompt(task, plan) }));
  return plan;
}
