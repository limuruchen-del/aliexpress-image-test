import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/auth";
import { extractJson } from "../../../lib/prompts";
import { callMiniMaxVisionJson } from "../../../lib/minimax";

export const runtime = "nodejs";

function buildPlanPrompt(input: {
  rawTitle: string;
  rawDescription: string;
  rawSpecs: string;
  notes: string;
  shippingTag: string;
}) {
  return `You are an AliExpress Europe listing strategist and e-commerce image set planner.

The user provides one product image plus raw product information. Your task is NOT to generate images. Your task is to create a complete image generation plan for a unified AliExpress image set: 3 main images + 7 detail images.

Return ONLY valid JSON. No markdown. No explanations.

Raw title:\n${input.rawTitle || "N/A"}

Raw description:\n${input.rawDescription || "N/A"}

Raw specs:\n${input.rawSpecs || "N/A"}

Seller notes:\n${input.notes || "N/A"}

Shipping/local stock tag:\n${input.shippingTag || "N/A"}

Rules:
1. Analyze the uploaded product image and product information.
2. Generate one AliExpress English title around 220-240 characters.
3. Generate optimized English description with sections: ⭐ Features, ⚠ Specifications, 📦 Package Includes, ⭐ Why Choose This Product.
4. Extract 5-8 real selling points and 4-6 buyer pain points.
5. Plan exactly 10 image tasks: main_1, main_2, main_3, detail_1, detail_2, detail_3, detail_4, detail_5, detail_6, detail_7.
6. The 7 detail images must work as a coherent visual set, not random isolated images.
7. Each image must have a different role: features, scenario, detail, usage, specs, extended info, summary.
8. Do not invent certifications, unsupported specs, fake accessories or false functions.
9. Avoid words like best, ultimate, guaranteed, certified unless provided.
10. Use short mobile-readable English copy for image text.

Fixed task definitions:
- main_1: high_ctr_main, search-page hero image, large product, core keyword, 2-3 strongest advantages, optional shipping tag.
- main_2: scene_main, realistic usage scene, buyer purchase reason, product clearly visible.
- main_3: selling_point_main, product plus 3-4 feature cards.
- detail_1: overview_features, unified overview page with 3-4 strongest features.
- detail_2: core_feature_scene, visualize the strongest single selling point in a scene or effect.
- detail_3: pain_point_solution, convert buyer pain point into product solution.
- detail_4: detail_structure, close-up real structure/details/accessories/functions. Do not invent details.
- detail_5: specification_image, 3-5 useful specs in clean layout.
- detail_6: extended_info, choose one subtype: multi_scene_usage, size_chart, color_options, usage_steps, comparison_advantage, care_instructions, package_contents, installation_steps, brewing_guide.
- detail_7: closing_summary, final purchase confidence with 3-4 strongest reasons.

Return exactly this JSON structure:
{
  "version": "1.0",
  "platform": "AliExpress",
  "language": "en",
  "listing_mode": "full_listing_set",
  "template_mode": "",
  "set_name": "3_main_7_detail",
  "product_context": {
    "product_category": "",
    "product_name": "",
    "main_color": "",
    "material": "",
    "shape_structure": "",
    "visible_accessories": [],
    "use_scenarios": [],
    "key_specs": [],
    "must_keep_features": [],
    "risks": []
  },
  "copy_assets": {
    "raw_title": "${input.rawTitle.replace(/"/g, "'")}",
    "raw_description": "",
    "raw_specs": "",
    "notes": "",
    "shipping_tag": "${input.shippingTag.replace(/"/g, "'")}",
    "optimized_title_240": "",
    "optimized_description": "",
    "selling_points": [],
    "pain_points": [],
    "target_audience": [],
    "core_purchase_reasons": []
  },
  "visual_system": {
    "overall_style": "",
    "color_style": "",
    "background_style": "",
    "lighting_style": "",
    "font_style": "modern clean sans-serif",
    "text_density": "medium",
    "logo_reserved": true,
    "consistency_rules": []
  },
  "generation_strategy": {
    "generate_anchor_first": true,
    "anchor_image_slot": "main_1",
    "batch_after_anchor": false,
    "output_ratio": "1:1",
    "output_size": "1024x1024",
    "image_count": 10
  },
  "image_tasks": [
    {"slot_id":"main_1","order":1,"group":"main","task_type":"high_ctr_main","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"main_2","order":2,"group":"main","task_type":"scene_main","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"main_3","order":3,"group":"main","task_type":"selling_point_main","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_1","order":4,"group":"detail","task_type":"overview_features","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_2","order":5,"group":"detail","task_type":"core_feature_scene","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_3","order":6,"group":"detail","task_type":"pain_point_solution","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_4","order":7,"group":"detail","task_type":"detail_structure","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_5","order":8,"group":"detail","task_type":"specification_image","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_6","order":9,"group":"detail","task_type":"extended_info","extended_info_subtype":"","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]},
    {"slot_id":"detail_7","order":10,"group":"detail","task_type":"closing_summary","title":"","goal":"","layout_role":"","focus_selling_points":[],"focus_pain_points":[],"focus_specs":[],"focus_scene":"","visual_direction":"","must_show":[],"optional_show":[],"copy_blocks":[],"layout_rules":[],"negative_rules":[]}
  ]
}`;
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
      return NextResponse.json({ error: "请上传产品图" }, { status: 400 });
    }
    if (!rawTitle.trim() && !rawDescription.trim() && !rawSpecs.trim()) {
      return NextResponse.json({ error: "请填写标题、描述或参数" }, { status: 400 });
    }

    const outputText = await callMiniMaxVisionJson(
      buildPlanPrompt({ rawTitle, rawDescription, rawSpecs, notes, shippingTag }),
      productImage,
      9000
    );
    return NextResponse.json(extractJson(outputText));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "套图规划失败" }, { status: 500 });
  }
}
