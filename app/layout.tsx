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
import { organizationSchema, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Shopping China Brasil",
    template: "%s | Shopping China Brasil",
  },
  description: "Catálogo Shopping China em reais, com mais de 27 mil produtos das melhores marcas do mundo.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Shopping China Brasil",
    url: "/",
    title: "Shopping China Brasil",
    description: "Eletrônicos, perfumes, casa e milhares de produtos originais com entrega no Brasil.",
    images: [{ url: "/assets/shopping-china/logo-footer.webp", alt: "Shopping China Brasil" }],
  },
  robots: { index: true, follow: true },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()).replace(/</g, "\\u003c") }} />
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
