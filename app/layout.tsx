import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "../components/sw-register";

export const metadata: Metadata = {
  title: "MoriBox | Premium Gunpla Store",
  description:
    "Cửa hàng mô hình Gunpla chính hãng Bandai. Mua sắm trực tuyến các dòng PG, MG, RG, HG, EG, SD đẳng cấp thế giới.",
  keywords: ["gunpla", "gundam", "mô hình", "bandai", "PG", "MG", "RG", "HG", "MoriBox"],
  openGraph: {
    title: "MoriBox | Premium Gunpla Store",
    description: "Mua sắm mô hình Gunpla chính hãng Bandai, PG, MG, RG, HG, EG, SD.",
    type: "website",
    locale: "vi_VN",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoriBox",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8f9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement,l=localStorage,t=l.getItem('moribox-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){d.dataset.theme='dark'}var z=l.getItem('moribox-text-size');if(z==='sm'||z==='lg'){d.dataset.text=z}if(l.getItem('moribox-reduce-motion')==='1'){d.dataset.motion='reduce'}if(l.getItem('moribox-lang')==='en'){d.lang='en'}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
