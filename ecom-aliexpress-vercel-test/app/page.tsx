"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ImageType = "main" | "scene" | "selling" | "parameter";

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

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [shippingTag, setShippingTag] = useState("Spain Local Stock");
  const [imageType, setImageType] = useState<ImageType>("main");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [message, setMessage] = useState("");
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

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productImage || !referenceImage) {
      setMessage("请同时上传产品图和参考图");
      return;
    }
    setLoading(true);
    setMessage("正在识别产品和参考图，然后生成速卖通商品图。首张图通常需要几十秒...");
    try {
      const form = new FormData();
      form.set("productImage", productImage);
      form.set("referenceImage", referenceImage);
      form.set("productTitle", productTitle);
      form.set("productDescription", productDescription);
      form.set("sellingPoints", sellingPoints);
      form.set("shippingTag", shippingTag);
      form.set("imageType", imageType);
      const data = await jsonFetch("/api/generate", { method: "POST", body: form });
      const next: Result = {
        ...data,
        createdAt: new Date().toLocaleString(),
        title: productTitle || "未命名产品",
        imageType
      };
      setResult(next);
      saveHistory(next);
      setMessage("生成完成，可以预览或下载。 ");
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
          <h1>速卖通商品图生成测试站</h1>
          <p>上传产品图 + 参考图，自动生成 AliExpress 欧区风格商品图。当前在线测试版不依赖数据库，结果保存在本浏览器历史记录里。</p>
        </div>
        <span className="badge">AliExpress Only · 1:1 Square</span>
      </div>

      <div className="grid">
        <form className="card stack" onSubmit={handleGenerate}>
          <h2>出图设置</h2>
          <div>
            <label>产品图</label>
            <input type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
            {productPreview && <img className="preview" src={productPreview} alt="产品图预览" style={{ marginTop: 10, maxHeight: 180 }} />}
          </div>
          <div>
            <label>参考图</label>
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
            <label>产品标题</label>
            <input value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="Portable Ice Maker 12KG..." />
          </div>
          <div>
            <label>产品描述</label>
            <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="填写产品用途、参数、场景等" />
          </div>
          <div>
            <label>核心卖点</label>
            <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder={'例如：\n12KG / 24H\n9 Ice Cubes in 6-8 Min\nSelf Cleaning'} />
          </div>
          <button type="submit" disabled={loading}>{loading ? "生成中..." : "生成 1 张速卖通图"}</button>
          {message && <div className={`status ${message.includes("完成") ? "success" : message.includes("失败") || message.includes("请") || message.includes("未") ? "error" : ""}`}>{message}</div>}
        </form>

        <section className="stack">
          <div className="card">
            <h2>生成结果</h2>
            {!result && <p style={{ color: "var(--muted)" }}>生成后会在这里显示图片、Prompt 和分析结果。</p>}
            {result && (
              <div className="result-grid">
                <div className="stack">
                  <img className="preview" src={`data:image/png;base64,${result.imageBase64}`} alt="生成结果" />
                  <div className="actions">
                    <a
                      className="secondary"
                      style={{ textDecoration: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 800 }}
                      href={`data:image/png;base64,${result.imageBase64}`}
                      download={`aliexpress-${Date.now()}.png`}
                    >下载图片</a>
                    <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(result.prompt)}>复制 Prompt</button>
                  </div>
                </div>
                <div className="stack">
                  <div>
                    <h3>最终 Prompt</h3>
                    <div className="prompt-box">{result.prompt}</div>
                  </div>
                  <div>
                    <h3>产品识别</h3>
                    <pre>{JSON.stringify(result.productAnalysis, null, 2)}</pre>
                  </div>
                  <div>
                    <h3>参考图风格</h3>
                    <pre>{JSON.stringify(result.referenceStyle, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>本浏览器历史记录</h2>
            {history.length === 0 && <p style={{ color: "var(--muted)" }}>暂无历史记录。</p>}
            <div className="history">
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
