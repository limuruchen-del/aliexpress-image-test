import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "速卖通图片生成测试站",
  description: "AliExpress product image generator online test"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
