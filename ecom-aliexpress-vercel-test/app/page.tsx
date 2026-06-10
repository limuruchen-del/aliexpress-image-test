"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ImageType = "main" | "scene" | "selling" | "parameter";

type OptimizeResult = {
  productAnalysis?: Record<string, unknown>;
  sellingPoints?: string[];
  painPoints?: string[];
  title240?: string;
  optimizedDescription?: string;
  imageCopy?: Record<string, string[]>;
};

type Result = {
  imageBase64: string;
  prompt: string;
  productAnalysis: Record<string, unknown>;
  referenceStyle: Record<string, unknown>;
  createdAt: string;
  title: string;
  imageType: ImageType;
};

const imageTypeOptions: { value: ImageType; label: string }[] = [
  { value: "main", label: "首图" },
  { value: "scene", label: "场景图" },
  { value: "selling", label: "卖点图" },
  { value: "parameter", label: "参数图" }
];

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

function filePreview(file: File | null) {
  if (!file) return "";
  return URL.createObjectURL(file);
}

function linesToText(value?: string[] | string) {
  if (Array.isArray(value)) return value.join("\n");
  return value || "";
}

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [rawTitle, setRawTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [rawSpecs, setRawSpecs] = useState("");
  const [notes, setNotes] = useState("希望适合速卖通欧区上架，突出真实卖点和买家痛点。");
  const [shippingTag, setShippingTag] = useState("Spain Local Stock");
  const [imageType, setImageType] = useState<ImageType>("main");

  const [optimizedTitle, setOptimizedTitle] = useState("");
  const [optimizedDescription, setOptimizedDescription] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [productAnalysis, setProductAnalysis] = useState<Record<string, unknown> | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);

  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [message, setMessage] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [loading, setLoading] = useState(false);

  const productPreview = useMemo(() => filePreview(productImage), [productImage]);
  const referencePreview = useMemo(() => filePreview(referenceImage), [referenceImage]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setAuthed(Boolean(data.authed)))
      .catch(() => setAuthed(false));
    const saved = localStorage.getItem("ae_image_history");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  function saveHistory(next: Result) {
    const list = [next, ...history].slice(0, 12);
    setHistory(list);
    localStorage.setItem("ae_image_history", JSON.stringify(list));
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("登录中...");
    try {
      await jsonFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      setAuthed(true);
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "登录失败");
    }
  }

  async function handleOptimize() {
    if (!productImage) {
      setMessage("请先上传产品图");
      return;
    }
    if (!rawTitle.trim() && !rawDescription.trim() && !rawSpecs.trim()) {
      setMessage("请至少填写原始标题、描述或参数之一");
      return;
    }
    setOptimizing(true);
    setMessage("正在识别产品、拆分卖点/痛点，并生成240字符标题和优化描述...");
    try {
      const form = new FormData();
      form.set("productImage", productImage);
      form.set("rawTitle", rawTitle);
      form.set("rawDescription", rawDescription);
      form.set("rawSpecs", rawSpecs);
      form.set("notes", notes);
      form.set("shippingTag", shippingTag);
      const data: OptimizeResult = await jsonFetch("/api/optimize", { method: "POST", body: form });
      setOptimizeResult(data);
      setProductAnalysis(data.productAnalysis || null);
      setOptimizedTitle(data.title240 || "");
      setOptimizedDescription(data.optimizedDescription || "");
      setSellingPoints(linesToText(data.sellingPoints));
      setPainPoints(linesToText(data.painPoints));
      setMessage("优化完成。你可以先手动微调标题/描述/卖点，再生成图片。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "优化失败");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productImage) {
      setMessage("请先上传产品图");
      return;
    }
    if (!optimizedTitle.trim() || !optimizedDescription.trim()) {
      setMessage("请先点击 Analyze & Optimize，或手动填写优化后的标题和描述");
      return;
    }
    setLoading(true);
    setMessage("正在根据优化后的标题、描述、卖点和痛点生成速卖通图片。通常需要几十秒...");
    try {
      const form = new FormData();
      form.set("productImage", productImage);
      if (referenceImage) form.set("referenceImage", referenceImage);
      form.set("productTitle", optimizedTitle);
      form.set("productDescription", optimizedDescription);
      form.set("sellingPoints", sellingPoints);
      form.set("painPoints", painPoints);
      form.set("shippingTag", shippingTag);
      form.set("imageType", imageType);
      if (productAnalysis) form.set("productAnalysis", JSON.stringify(productAnalysis));
      const data = await jsonFetch("/api/generate", { method: "POST", body: form });
      const next: Result = {
        ...data,
        createdAt: new Date().toLocaleString(),
        title: optimizedTitle || "未命名产品",
        imageType
      };
      setResult(next);
      saveHistory(next);
      setMessage("生成完成，可以预览或下载。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  if (authed === null) {
    return <main className="shell"><div className="card">加载中...</div></main>;
  }

  if (!authed) {
    return (
      <main className="shell">
        <form className="card login stack" onSubmit={handleLogin}>
          <div>
            <h1>速卖通图片生成测试站</h1>
            <p>输入访问密码后进入。API Key 只在服务器环境变量里使用。</p>
          </div>
          <div>
            <label>访问密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入 APP_PASSWORD" />
          </div>
          <button type="submit">进入测试站</button>
          {message && <div className="status error">{message}</div>}
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="header">
        <div>
          <h1>速卖通内容优化 + 商品图生成</h1>
          <p>上传产品图和原始描述，AI 自动拆分卖点/用户痛点，生成240字符标题和优化描述，再生成 AliExpress 欧区商品图。</p>
        </div>
        <span className="badge">AliExpress Only · Copy + Image</span>
      </div>

      <div className="grid three">
        <section className="card stack">
          <h2>1. 输入产品资料</h2>
          <div>
            <label>产品图 *</label>
            <input type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
            {productPreview && <img className="preview" src={productPreview} alt="产品图预览" style={{ marginTop: 10, maxHeight: 180 }} />}
          </div>
          <div>
            <label>参考图（可选）</label>
            <input type="file" accept="image/*" onChange={(e) => setReferenceImage(e.target.files?.[0] || null)} />
            {referencePreview && <img className="preview" src={referencePreview} alt="参考图预览" style={{ marginTop: 10, maxHeight: 180 }} />}
          </div>
          <div className="row">
            <div>
              <label>图片类型</label>
              <select value={imageType} onChange={(e) => setImageType(e.target.value as ImageType)}>
                {imageTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>本土发货标签</label>
              <input value={shippingTag} onChange={(e) => setShippingTag(e.target.value)} placeholder="Spain Local Stock" />
            </div>
          </div>
          <div>
            <label>原始标题（可选）</label>
            <input value={rawTitle} onChange={(e) => setRawTitle(e.target.value)} placeholder="供应商标题 / 竞品标题" />
          </div>
          <div>
            <label>原始描述 *</label>
            <textarea value={rawDescription} onChange={(e) => setRawDescription(e.target.value)} placeholder="粘贴供应商描述、功能介绍、包装清单等" />
          </div>
          <div>
            <label>产品参数</label>
            <textarea value={rawSpecs} onChange={(e) => setRawSpecs(e.target.value)} placeholder={'例如：\nPower: 1500W\nSize: 30 x 20 x 25 cm\nCapacity: 12KG/24H'} />
          </div>
          <div>
            <label>补充备注</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="比如：突出西班牙发货、适合家庭厨房、不要夸大功能" />
          </div>
          <button type="button" onClick={handleOptimize} disabled={optimizing}>{optimizing ? "优化中..." : "Analyze & Optimize"}</button>
          {message && <div className={`status ${message.includes("完成") ? "success" : message.includes("失败") || message.includes("请") || message.includes("未") ? "error" : ""}`}>{message}</div>}
        </section>

        <form className="card stack" onSubmit={handleGenerate}>
          <h2>2. AI优化结果（可手动修改）</h2>
          <div>
            <label>240字符英文标题</label>
            <textarea className="title-box" value={optimizedTitle} onChange={(e) => setOptimizedTitle(e.target.value)} placeholder="点击 Analyze & Optimize 后自动生成，也可以手动修改" />
            <small>{optimizedTitle.length} characters</small>
          </div>
          <div>
            <label>核心卖点</label>
            <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="AI会自动拆分核心卖点" />
          </div>
          <div>
            <label>用户痛点 / 购买理由</label>
            <textarea value={painPoints} onChange={(e) => setPainPoints(e.target.value)} placeholder="AI会自动拆分用户痛点" />
          </div>
          <div>
            <label>优化后的英文描述</label>
            <textarea className="description-box" value={optimizedDescription} onChange={(e) => setOptimizedDescription(e.target.value)} placeholder="⭐ Features..." />
          </div>
          <div className="actions">
            <button type="submit" disabled={loading}>{loading ? "生成中..." : "Generate Image"}</button>
            <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(`${optimizedTitle}\n\n${optimizedDescription}`)}>复制标题+描述</button>
          </div>
          {optimizeResult?.imageCopy && (
            <div>
              <h3>图片文案建议</h3>
              <pre>{JSON.stringify(optimizeResult.imageCopy, null, 2)}</pre>
            </div>
          )}
          {productAnalysis && (
            <div>
              <h3>产品识别结果</h3>
              <pre>{JSON.stringify(productAnalysis, null, 2)}</pre>
            </div>
          )}
        </form>

        <section className="stack">
          <div className="card">
            <h2>3. 生成结果</h2>
            {!result && <p style={{ color: "var(--muted)" }}>生成后会在这里显示图片、Prompt 和分析结果。</p>}
            {result && (
              <div className="stack">
                <img className="preview" src={`data:image/png;base64,${result.imageBase64}`} alt="生成结果" />
                <div className="actions">
                  <a className="secondary" style={{ textDecoration: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 800 }} href={`data:image/png;base64,${result.imageBase64}`} download={`aliexpress-${Date.now()}.png`}>下载图片</a>
                  <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(result.prompt)}>复制 Prompt</button>
                </div>
                <div>
                  <h3>最终 Prompt</h3>
                  <div className="prompt-box">{result.prompt}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>历史记录</h2>
            {history.length === 0 && <p style={{ color: "var(--muted)" }}>暂无历史记录。</p>}
            <div className="history compact">
              {history.map((item, idx) => (
                <div className="history-item" key={`${item.createdAt}-${idx}`}>
                  <img src={`data:image/png;base64,${item.imageBase64}`} alt={item.title} />
                  <strong>{item.title}</strong>
                  <small>{item.createdAt} · {imageTypeOptions.find((x) => x.value === item.imageType)?.label}</small>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <a href={`data:image/png;base64,${item.imageBase64}`} download={`aliexpress-${idx}.png`}>下载</a>
                    <button className="secondary" type="button" onClick={() => setResult(item)}>查看</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
