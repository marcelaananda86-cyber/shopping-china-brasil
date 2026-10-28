export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shoppingchinabrasil.com").replace(/\/$/, "");

export const STORE = {
  name: "Shopping China Brasil",
  legalName: "VENTURIO S.A.",
  email: "sac@shoppingchinacde.com.py",
  phone: "+595 61 597 7000",
  whatsapp: "+595 981 701 701",
  address: {
    streetAddress: "Avda. Luis Maria Argaña, Shopping China Importados",
    addressLocality: "Ciudad del Este",
    addressRegion: "Alto Paraná",
    addressCountry: "PY",
  },
} as const;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const RETURN_POLICY_ID = `${SITE_URL}/politicas/trocas-e-devolucoes#politica-de-devolucao`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": ORGANIZATION_ID,
    name: STORE.name,
    legalName: STORE.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/shopping-china/logo-footer.webp`,
    email: STORE.email,
    telephone: STORE.phone,
    address: { "@type": "PostalAddress", ...STORE.address },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: STORE.email,
      telephone: STORE.phone,
      availableLanguage: ["Portuguese", "Spanish"],
    },
    sameAs: [
      "https://www.shoppingchina.com.br/",
      "https://www.instagram.com/shoppingchinaparaguay/",
    ],
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      "@id": RETURN_POLICY_ID,
      applicableCountry: "BR",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      returnPolicyCountry: "BR",
    },
  };
}

export const SHIPPING_ZONES = [
  { states: ["PR", "SC", "RS"], price: 49.9 },
  { states: ["DF", "ES", "GO", "MG", "MS", "MT", "RJ", "SP"], price: 79.9 },
  { states: ["AC", "AL", "AP", "AM", "BA", "CE", "MA", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO"], price: 94.9 },
] as const;

export function offerShippingDetails() {
  return SHIPPING_ZONES.map((zone) => ({
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: zone.price.toFixed(2),
      currency: "BRL",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "BR",
      addressRegion: zone.states,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 20, unitCode: "DAY" },
    },
  }));
}
