import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProSpec - 原型与需求分享平台",
  description: "产品经理上传原型文件，分享给开发团队，支持HTML直接预览",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
