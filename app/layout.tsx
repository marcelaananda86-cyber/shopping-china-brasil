import type { Metadata } from "next";
import "./globals.css";
import categoriesData from "@/public/data/categories.json";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartProvider } from "@/components/cart-provider";
import { CartDrawer } from "@/components/cart-drawer";
import { ImportRulesBanner } from "@/components/import-rules-banner";
import type { CategoryData } from "@/lib/shopping-china";
import { ExchangeRateProvider } from "@/components/exchange-rate-provider";
import { getSourceExchangeRate } from "@/lib/exchange-rate";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const exchangeRate = await getSourceExchangeRate();
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ExchangeRateProvider initial={exchangeRate}><CartProvider>
          <SiteHeader categories={categoriesData as CategoryData[]} />
          <ImportRulesBanner />
          {children}
          <SiteFooter />
          <CartDrawer />
        </CartProvider></ExchangeRateProvider>
      </body>
    </html>
  );
}
