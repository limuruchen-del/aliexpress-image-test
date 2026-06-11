export function getMiniMaxKey() {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error("MINIMAX_API_KEY 未配置，请在 Vercel 环境变量里添加。");
  }
  return key;
}

export async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mime: file.type || "image/png"
  };
}

export function compactText(text: string, max = 1450) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function callMiniMaxVisionJson(prompt: string, image: File, maxTokens = 6000) {
  const { base64, mime } = await fileToBase64(image);
  const model = process.env.MINIMAX_TEXT_MODEL || "MiniMax-M3";
  const res = await fetch("https://api.minimaxi.com/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getMiniMaxKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mime,
                data: base64
              }
            }
          ]
        }
      ]
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `MiniMax 文本/视觉接口失败：${res.status}`);
  }
  const blocks = Array.isArray(data.content) ? data.content : [];
  const text = blocks
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text || "")
    .join("\n") || data.output_text || JSON.stringify(data);
  return text;
}

export async function callMiniMaxImage(input: {
  prompt: string;
  productImage?: File | null;
  referenceImage?: File | null;
}) {
  const model = process.env.MINIMAX_IMAGE_MODEL || "image-01";
  const body: any = {
    model,
    prompt: compactText(input.prompt, 1450),
    aspect_ratio: "1:1",
    response_format: "base64",
    n: 1,
    prompt_optimizer: true,
    aigc_watermark: false
  };

  const refs: any[] = [];
  if (input.productImage) {
    const { base64, mime } = await fileToBase64(input.productImage);
    refs.push({ type: "character", image_file: `data:${mime};base64,${base64}` });
  }
  if (input.referenceImage) {
    const { base64, mime } = await fileToBase64(input.referenceImage);
    refs.push({ type: "character", image_file: `data:${mime};base64,${base64}` });
  }
  if (refs.length) body.subject_reference = refs;

  const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getMiniMaxKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.base_resp?.status_code) {
    throw new Error(data?.base_resp?.status_msg || data?.error?.message || data?.message || `MiniMax 图片接口失败：${res.status}`);
  }

  const b64 = data?.data?.image_base64?.[0] || data?.data?.images?.[0]?.b64_json || data?.data?.image || data?.data?.base64?.[0];
  if (b64) return { imageBase64: b64, raw: data };

  const url = data?.data?.image_urls?.[0];
  if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error("MiniMax 返回了图片 URL，但下载图片失败");
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return { imageBase64: buffer.toString("base64"), raw: data };
  }

  throw new Error("MiniMax 没有返回图片，请检查模型、余额或内容安全限制。");
}
