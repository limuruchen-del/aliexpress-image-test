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

type ImageTask = {
  slot_id: string;
  order: number;
  group: string;
  task_type: string;
  title: string;
  goal?: string;
  copy_blocks?: string[];
  [key: string]: any;
};

type ListingPlan = {
  copy_assets?: {
    optimized_title_240?: string;
    optimized_description?: string;
    selling_points?: string[];
    pain_points?: string[];
    [key: string]: any;
  };
  product_context?: Record<string, unknown>;
  visual_system?: Record<string, unknown>;
  image_tasks?: ImageTask[];
  [key: string]: any;
};

type Result = {
  imageBase64: string;
  prompt: string;
  productAnalysis?: Record<string, unknown>;
  referenceStyle?: Record<string, unknown>;
  createdAt: string;
  title: string;
  imageType?: ImageType;
};

type SetImageResult = {
  slotId: string;
  title: string;
  imageBase64: string;
  prompt: string;
  imageTask: ImageTask;
  createdAt: string;
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

function downloadBase64(filename: string, base64: string) {
  const a = document.createElement("a");
  a.href = `data:image/png;base64,${base64}`;
  a.download = filename;
  a.click();
}

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [rawTitle, setRawTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [rawSpecs, setRawSpecs] = useState("");
  const [notes, setNotes] = useState("希望适合速卖通欧区上架，突出真实卖点和买家痛点。副图要像一套完整详情图，不是随机单图。");
  const [shippingTag, setShippingTag] = useState("Spain Local Stock");
  const [imageType, setImageType] = useState<ImageType>("main");

  const [optimizedTitle, setOptimizedTitle] = useState("");
  const [optimizedDescription, setOptimizedDescription] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [productAnalysis, setProductAnalysis] = useState<Record<string, unknown> | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);

  const [listingPlan, setListingPlan] = useState<ListingPlan | null>(null);
  const [setImages, setSetImages] = useState<SetImageResult[]>([]);
  const [setProgress, setSetProgress] = useState("");
  const [currentSlot, setCurrentSlot] = useState("");

  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [message, setMessage] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [generatingSet, setGeneratingSet] = useState(false);
  const [loading, setLoading] = useState(false);

  const productPreview = useMemo(() => filePreview(productImage), [productImage]);
  const referencePreview = useMemo(() => filePreview(referenceImage), [referenceImage]);
  const tasks = listingPlan?.image_tasks || [];

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
    if (!productImage) return setMessage("请先上传产品图");
    if (!rawTitle.trim() && !rawDescription.trim() && !rawSpecs.trim()) return setMessage("请至少填写原始标题、描述或参数之一");
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
      setMessage("优化完成。你可以微调标题/描述/卖点，再生成单张或整套图。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "优化失败");
    } finally {
      setOptimizing(false);
    }
  }

  async function handlePlanSet() {
    if (!productImage) return setMessage("请先上传产品图");
    if (!rawTitle.trim() && !rawDescription.trim() && !rawSpecs.trim()) return setMessage("请至少填写原始标题、描述或参数之一");
    setPlanning(true);
    setMessage("正在规划 3张主图 + 7张副图套图任务...");
    try {
      const form = new FormData();
      form.set("productImage", productImage);
      form.set("rawTitle", rawTitle || optimizedTitle);
      form.set("rawDescription", rawDescription || optimizedDescription);
      form.set("rawSpecs", rawSpecs);
      form.set("notes", notes);
      form.set("shippingTag", shippingTag);
      const plan: ListingPlan = await jsonFetch("/api/plan-listing-set", { method: "POST", body: form });
      setListingPlan(plan);
      setSetImages([]);
      const copy = plan.copy_assets || {};
      setOptimizedTitle(copy.optimized_title_240 || optimizedTitle);
      setOptimizedDescription(copy.optimized_description || optimizedDescription);
      setSellingPoints(linesToText(copy.selling_points) || sellingPoints);
      setPainPoints(linesToText(copy.pain_points) || painPoints);
      setProductAnalysis(plan.product_context || productAnalysis);
      setMessage(`套图规划完成：${plan.image_tasks?.length || 0} 张图片任务。下一步点击 Generate Full Listing Set。`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "套图规划失败");
    } finally {
      setPlanning(false);
    }
  }

  async function generateOneSetImage(task: ImageTask, plan: ListingPlan) {
    if (!productImage) throw new Error("请先上传产品图");
    const form = new FormData();
    form.set("productImage", productImage);
    if (referenceImage) form.set("referenceImage", referenceImage);
    form.set("plan", JSON.stringify(plan));
    form.set("imageTask", JSON.stringify(task));
    form.set("shippingTag", shippingTag);
    const data = await jsonFetch("/api/generate-set-image", { method: "POST", body: form });
    return {
      ...data,
      createdAt: new Date().toLocaleString()
    } as SetImageResult;
  }

  async function handleGenerateFullSet() {
    if (!productImage) return setMessage("请先上传产品图");
    if (!listingPlan || !tasks.length) return setMessage("请先点击 Plan Full Listing Set 生成套图任务");
    setGeneratingSet(true);
    setSetImages([]);
    setMessage("开始按顺序生成整套图片：生成一张，再生成下一张。请保持页面打开。");
    const done: SetImageResult[] = [];
    try {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setCurrentSlot(task.slot_id);
        setSetProgress(`${i + 1}/${tasks.length} 正在生成 ${task.slot_id} · ${task.title || task.task_type}`);
        const image = await generateOneSetImage(task, listingPlan);
        done.push(image);
        setSetImages([...done]);
      }
      setSetProgress(`10/10 已完成整套图片`);
      setMessage("整套图片生成完成。可以逐张下载，或不满意的单张重新生成。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "整套生成失败");
    } finally {
      setGeneratingSet(false);
      setCurrentSlot("");
    }
  }

  async function handleRegenerateTask(task: ImageTask) {
    if (!listingPlan) return;
    setGeneratingSet(true);
    setCurrentSlot(task.slot_id);
    setSetProgress(`正在重新生成 ${task.slot_id}`);
    try {
      const image = await generateOneSetImage(task, listingPlan);
      setSetImages((prev) => [image, ...prev.filter((x) => x.slotId !== task.slot_id)].sort((a, b) => (a.imageTask.order || 0) - (b.imageTask.order || 0)));
      setMessage(`${task.slot_id} 重新生成完成`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "单张重生成失败");
    } finally {
      setGeneratingSet(false);
      setCurrentSlot("");
    }
  }

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productImage) return setMessage("请先上传产品图");
    if (!optimizedTitle.trim() || !optimizedDescription.trim()) return setMessage("请先点击 Analyze & Optimize，或手动填写优化后的标题和描述");
    setLoading(true);
    setMessage("正在根据优化后的标题、描述、卖点和痛点生成单张速卖通图片...");
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
      const next: Result = { ...data, createdAt: new Date().toLocaleString(), title: optimizedTitle || "未命名产品", imageType };
      setResult(next);
      saveHistory(next);
      setMessage("单张生成完成，可以预览或下载。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  if (authed === null) return <main className="shell"><div className="card">加载中...</div></main>;

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
          <h1>速卖通整套图生成器</h1>
          <p>上传产品图和描述，先规划 3 张主图 + 7 张副图，再按顺序一张一张生成，副图按特点、细节、使用、参数形成完整套图。</p>
        </div>
        <span className="badge">3 Main + 7 Detail · Sequential</span>
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
            <label>参考图（可选，用于套图风格）</label>
            <input type="file" accept="image/*" onChange={(e) => setReferenceImage(e.target.files?.[0] || null)} />
            {referencePreview && <img className="preview" src={referencePreview} alt="参考图预览" style={{ marginTop: 10, maxHeight: 180 }} />}
          </div>
          <div className="row">
            <div>
              <label>单张图片类型</label>
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" onClick={handleOptimize} disabled={optimizing || planning || generatingSet}>{optimizing ? "优化中..." : "Analyze & Optimize"}</button>
            <button type="button" className="secondary" onClick={handlePlanSet} disabled={planning || generatingSet}>{planning ? "规划中..." : "Plan Full Listing Set"}</button>
          </div>
          {message && <div className={`status ${message.includes("完成") ? "success" : message.includes("失败") || message.includes("请") || message.includes("未") || message.includes("缺少") ? "error" : ""}`}>{message}</div>}
        </section>

        <form className="card stack" onSubmit={handleGenerate}>
          <h2>2. 文案和套图规划</h2>
          <div>
            <label>240字符英文标题</label>
            <textarea className="title-box" value={optimizedTitle} onChange={(e) => setOptimizedTitle(e.target.value)} placeholder="点击 Analyze 或 Plan 后自动生成，也可以手动修改" />
            <small>{optimizedTitle.length} characters</small>
          </div>
          <div>
            <label>核心卖点</label>
            <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} />
          </div>
          <div>
            <label>用户痛点 / 购买理由</label>
            <textarea value={painPoints} onChange={(e) => setPainPoints(e.target.value)} />
          </div>
          <div>
            <label>优化后的英文描述</label>
            <textarea className="description-box" value={optimizedDescription} onChange={(e) => setOptimizedDescription(e.target.value)} />
          </div>
          <div className="actions">
            <button type="submit" disabled={loading || generatingSet}>{loading ? "生成中..." : "Generate Single Image"}</button>
            <button type="button" className="secondary" onClick={handleGenerateFullSet} disabled={generatingSet || !listingPlan}>{generatingSet ? "整套生成中..." : "Generate Full Listing Set"}</button>
            <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(listingPlan, null, 2))}>复制套图JSON</button>
          </div>
          {setProgress && <div className="status success">{setProgress}</div>}
          {tasks.length > 0 && (
            <div>
              <h3>10张图任务清单</h3>
              <div className="task-list">
                {tasks.map((task) => {
                  const generated = setImages.find((x) => x.slotId === task.slot_id);
                  return (
                    <div className={`task-item ${currentSlot === task.slot_id ? "active" : ""}`} key={task.slot_id}>
                      <strong>{task.order}. {task.slot_id} · {task.title || task.task_type}</strong>
                      <small>{task.task_type} · {generated ? "已生成" : "待生成"}</small>
                      <p>{task.goal}</p>
                      <div className="actions">
                        <button type="button" className="secondary" disabled={generatingSet} onClick={() => handleRegenerateTask(task)}>重生成这张</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        <section className="stack">
          <div className="card">
            <h2>3. 整套图片结果</h2>
            {setImages.length === 0 && <p style={{ color: "var(--muted)" }}>点击 Generate Full Listing Set 后，这里会逐张显示 3主图 + 7副图。</p>}
            <div className="set-grid">
              {setImages.map((img) => (
                <div className="set-card" key={img.slotId}>
                  <img className="preview" src={`data:image/png;base64,${img.imageBase64}`} alt={img.title} />
                  <strong>{img.imageTask.order}. {img.slotId}</strong>
                  <small>{img.title}</small>
                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => downloadBase64(`${img.slotId}.png`, img.imageBase64)}>下载</button>
                    <button type="button" className="secondary" onClick={() => navigator.clipboard.writeText(img.prompt)}>复制Prompt</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>单张生成结果</h2>
            {!result && <p style={{ color: "var(--muted)" }}>单张生成后会在这里显示。</p>}
            {result && (
              <div className="stack">
                <img className="preview" src={`data:image/png;base64,${result.imageBase64}`} alt="生成结果" />
                <div className="actions">
                  <button type="button" className="secondary" onClick={() => downloadBase64(`aliexpress-${Date.now()}.png`, result.imageBase64)}>下载图片</button>
                  <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(result.prompt)}>复制 Prompt</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
