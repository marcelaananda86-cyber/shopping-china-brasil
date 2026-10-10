import type { Metadata } from "next";
import "./globals.css";
import categoriesData from "@/public/data/categories.json";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { CategoryData } from "@/lib/shopping-china";

export const metadata: Metadata = {
  title: {
    default: "Shopping China Brasil",
    template: "%s | Shopping China Brasil",
  },
  description: "Catálogo Shopping China em reais, com mais de 27 mil produtos das melhores marcas do mundo.",
  icons: {
    icon: "/assets/shopping-china/logo-mark.webp",
    shortcut: "/assets/shopping-china/logo-mark.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <SiteHeader categories={categoriesData as CategoryData[]} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
