# 速卖通商品图生成测试站（Vercel 在线版）

这是一个适合先上线测试的版本：

- 只做 AliExpress / 速卖通欧区
- 上传产品图 + 参考图
- AI 自动识别产品与参考图风格
- 调用 OpenAI 图片模型生成 1:1 商品图
- 生成结果显示在网页里，并可直接下载
- 不使用数据库，不保存到服务器；历史记录保存在当前浏览器 localStorage

> 这个版本适合先部署成一个可以点击测试的网站。后续要做真正参考库、成品库、多人使用，再接数据库和对象存储。

---

## 需要配置的 Vercel 环境变量

在 Vercel 项目设置中添加：

```env
OPENAI_API_KEY=sk-your-key-here
APP_PASSWORD=your-login-password
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

说明：

- `OPENAI_API_KEY`：你的 OpenAI API Key，只在服务器端使用。
- `APP_PASSWORD`：网页登录密码。
- `OPENAI_VISION_MODEL`：用于产品图和参考图识别。
- `OPENAI_IMAGE_MODEL`：用于生成图片。如果你的账号支持 `gpt-image-2`，可以改成 `gpt-image-2`。

---

## 部署方式

推荐用 GitHub + Vercel：

1. 把这个项目上传到 GitHub 仓库。
2. 登录 Vercel。
3. New Project → Import Git Repository。
4. 选择该仓库。
5. 添加上面的环境变量。
6. 点击 Deploy。

部署完成后，Vercel 会给你一个 `*.vercel.app` 的测试网址。

---

## 使用流程

1. 打开测试网址。
2. 输入 `APP_PASSWORD` 登录。
3. 上传产品图。
4. 上传参考图。
5. 填写标题、描述、卖点、本土发货标签。
6. 选择图片类型：首图 / 场景图 / 卖点图 / 参数图。
7. 点击生成。
8. 下载生成图。

---

## 当前限制

- 当前版本不是真正数据库参考库，参考图需要每次上传。
- 历史记录只保存在当前浏览器，换电脑或清浏览器缓存后会丢失。
- 图片文字可能需要后期微调。
- 产品保真度取决于原图清晰度和图片模型效果。

