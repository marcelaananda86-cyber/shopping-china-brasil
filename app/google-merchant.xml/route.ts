export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/site-config";

// Catálogo liberado em lotes revisados para preservar a qualidade da conta.
// O primeiro lote de 50 produtos foi aprovado antes desta expansão.
const CURATED_PRODUCT_IDS = [
  "1036065", "980834", "789059", "1051791", "883438", "920977", "1039430", "860483", "906073", "1034852",
  "760395", "1070861", "721923", "893318", "847358", "949030", "1011529", "1011790", "1070868", "1058857",
  "801561", "1072916", "717490", "601887", "601888", "773142", "1095239", "1094969", "1070157", "1073108",
  "1090272", "1060084", "1069492", "1025207", "801824", "813141", "789057", "30946", "770943", "700074",
  "815977", "888584", "795888", "716822", "799359", "779789", "624288", "825156", "915866", "796259",
  // Produtos de alta intenção de compra no Brasil.
  "948625", "883614", "1011080", "1031749", "953327", "773395", "991475", "788272", "911471", "979927",
  "979928", "1012524", "945169", "1091835", "971716", "1002945", "964050", "963832", "940475", "886623",
  "880321", "823928", "1080569", "825306", "1003638", "1026814",
  // Segunda expansão: produtos principais com alta procura, sem acessórios.
  "943235", "882589", "1068352", "945167", "1051827", "1019113", "979965", "978040", "1056217",
  "1066162", "968119", "1029045", "1024793", "1058671", "864735", "968317", "876209", "726226",
  "920430", "973043", "985372", "1010193", "942508", "908912", "991593", "1070663", "1100171",
  // Terceira expansão: 100 produtos de alta procura com preço de até R$ 500.
  // Perfumes de marcas reconhecidas.
  "864670", "588600", "966667", "377578", "765072", "1072618", "597929", "983600", "918518", "990251",
  "883106", "781864", "828166", "1102326", "436006", "944501", "1072619", "1000668", "992952", "1001177",
  "5286", "355241", "62156", "480727", "985227",
  // Áudio de consumo, incluindo JBL, Logitech, Razer e Corsair.
  "1073421", "1061568", "1061564", "915231", "1058677", "1058686", "633685", "979929", "1028554", "1028557",
  "1046247", "1046245", "1015713", "863649", "849654",
  // Games, controles e periféricos.
  "1019021", "987342", "1057687", "1112023", "976886", "958897", "773394", "804207", "807927", "1116094",
  "1052900", "843534", "904875", "941582", "864087", "793076", "697776", "732282", "855024", "880588",
  // Tecnologia e acessórios de marcas reconhecidas.
  "872892", "766820", "768246", "969847", "892903", "1015807", "1067985", "863409", "849657", "716422",
  "708304", "806008", "784517", "1015927", "1071788", "905450", "997366",
  // Eletroportáteis e cuidados pessoais.
  "954619", "1053406", "1097812", "906465", "739954", "833814", "850992", "1067705", "1003746", "1076028",
  "925179", "1080568", "1055702", "893120", "1002787",
  // Beleza e cuidados capilares.
  "923506", "753898", "831685", "981352", "628354", "810827", "621720", "1067720",
] as const;

const MERCHANT_TITLE_OVERRIDES: Record<string, string> = {
  "948625": "Apple iPhone 16 128 GB Rosa com SIM",
  "883614": "Apple iPhone 15 128 GB Azul com SIM",
  "1011080": "Apple iPhone 17 256 GB Verde-Sálvia",
  "1031749": "Console Sony PlayStation 5 Slim Digital 825 GB Branco",
  "953327": "Console Sony PlayStation 5 Pro Digital 2 TB Branco",
  "773395": "Controle Sony DualSense para PS5 Preto Meia-Noite",
  "991475": "Console Nintendo Switch 2 256 GB",
  "788272": "Console Nintendo Switch OLED 64 GB Branco",
  "911471": "Caixa de Som JBL PartyBox Stage 320",
  "979927": "Caixa de Som Bluetooth JBL Charge 6 Vermelha",
  "979928": "Caixa de Som Bluetooth JBL Flip 7 Preta",
  "1012524": "Fone de Ouvido Apple AirPods Pro 3 Branco",
  "945169": "Fone de Ouvido Apple AirPods 4 com ANC Branco",
  "1091835": "Apple Watch SE 3 GPS 44 mm Estelar",
  "971716": "Samsung Galaxy S25 Ultra 5G 256 GB 12 GB RAM Titânio Preto",
  "1002945": "Samsung Galaxy Watch8 Classic 46 mm Preto",
  "964050": "Xiaomi Redmi Note 14 Pro 5G 256 GB 8 GB RAM Verde-Coral",
  "963832": "Amazon Kindle Paperwhite 12ª Geração 16 GB 7 Polegadas Verde-Jade",
  "940475": "Câmera de Ação GoPro Hero 13 Preta",
  "886623": "Câmera DJI Osmo Pocket 3 Creator Combo Preta",
  "880321": "Relógio Garmin Forerunner 265 GPS Preto",
  "823928": "Fone de Ouvido Sony WH-1000XM5 Bluetooth Preto",
  "1080569": "Fritadeira Air Fryer Electrolux EAF90 12 L 220 V Grafite",
  "825306": "Cafeteira Dolce Gusto Genio S Touch 800 ml 220 V",
  "1003638": "Smart TV Samsung Q7F 50 Polegadas 4K QLED Preta",
  "1026814": "Xiaomi Poco F8 Pro 5G 512 GB 12 GB RAM Preto",
  "943235": "Apple iPhone 16 Pro Max 256 GB Titânio-Deserto eSIM",
  "882589": "Apple iPhone 15 Pro 512 GB Branco eSIM",
  "1068352": "Apple iPhone 17 Pro Max 256 GB Azul",
  "945167": "Fone de Ouvido Apple AirPods 4 Branco",
  "1051827": "Notebook Apple MacBook Air 13 Polegadas M5 16 GB RAM 512 GB SSD Prata",
  "1019113": "Notebook Apple MacBook Pro 14 Polegadas M5 24 GB RAM 1 TB SSD Prata",
  "979965": "Tablet Apple iPad 11 Polegadas A16 128 GB Amarelo",
  "978040": "Tablet Apple iPad Mini 7 8,3 Polegadas 128 GB Estelar",
  "1056217": "Notebook Acer Aspire Go 15 Ryzen 7 16 GB RAM 512 GB SSD 15,6 Polegadas",
  "1066162": "Notebook Dell 15 Intel Core i7 16 GB RAM 512 GB SSD 15,6 Polegadas Preto",
  "968119": "Samsung Galaxy S25 Ultra 5G 512 GB 12 GB RAM Titânio Prata",
  "1029045": "Xiaomi Redmi Note 15 Pro 5G 256 GB 8 GB RAM Preto",
  "1024793": "Xiaomi Poco F8 Pro 256 GB 12 GB RAM Preto",
  "1058671": "Caixa de Som Bluetooth JBL Go 5 Branca",
  "864735": "Fone de Ouvido Bluetooth JBL Tune 720 Preto",
  "968317": "Smart TV LG UT7300 43 Polegadas 4K UHD",
  "876209": "Smart TV TCL S5400 32 Polegadas Full HD HDR",
  "726226": "Console Nintendo Switch Lite 32 GB Turquesa",
  "920430": "Console Microsoft Xbox Series X 1 TB Preto Versão Japonesa",
  "973043": "Amazon Kindle Paperwhite Signature Edition 12ª Geração 16 GB 7 Polegadas Preto",
  "985372": "Câmera 360 GoPro Max 5,6K Preta",
  "1010193": "Drone DJI Mini 5 Pro",
  "942508": "Câmera DJI Osmo Action 5 Pro Adventure Combo Preta",
  "908912": "Relógio Garmin Venu 3 GPS Preto",
  "991593": "Monitor Gamer Samsung Odyssey G5 27 Polegadas QHD 165 Hz",
  "1070663": "Monitor Gamer Dell SE2426HG 23,8 Polegadas 240 Hz",
  "1100171": "Fritadeira Air Fryer Midea 12 L 220 V Cinza",
  "1072618": "Perfume Paco Rabanne Phantom In Red Parfum 100 ml",
  "990251": "Perfume Carolina Herrera 212 VIP Black Elixir Eau de Parfum 100 ml",
  "436006": "Perfume Prada Luna Rossa Pour Homme Eau de Toilette 50 ml",
  "5286": "Perfume Paco Rabanne Pour Homme Eau de Toilette 100 ml",
  "1073421": "Fone de Ouvido Bluetooth JBL Tune 680 NC Branco",
  "1061568": "Fone de Ouvido Bluetooth JBL Tune 730 Azul",
  "1061564": "Fone de Ouvido Bluetooth JBL Tune 530 Bege",
  "915231": "Caixa de Som Bluetooth JBL Clip 5 Vermelha",
  "1058677": "Caixa de Som Bluetooth JBL Go 5 Laranja",
  "1058686": "Caixa de Som Bluetooth JBL Go 5 Amarela",
  "979929": "Caixa de Som Bluetooth JBL Flip 7 Vermelha",
  "849654": "Fone de Ouvido Bluetooth Logitech Zone Vibe 100 Rosa",
  "1019021": "Controle Sony DualSense para PS5 Edição Limitada God of War 20º Aniversário",
  "958897": "Controle Sony DualSense Chroma Pearl para PS5",
  "773394": "Controle Sony DualSense Cosmic Red para PS5",
  "804207": "Controle Sony DualSense Starlight Blue para PS5",
  "807927": "Controle Sony DualSense Galactic Purple para PS5",
  "904875": "Controle Sony DualSense Sterling Silver para PS5",
  "872892": "Amazon Echo Show 5 3ª Geração Grafite",
  "766820": "Localizador Apple AirTag com 4 Unidades",
  "768246": "Localizador Apple AirTag com 1 Unidade",
  "969847": "SSD M.2 Kingston NV3 500 GB PCIe 4.0",
  "892903": "Cartão de Memória SanDisk Ultra SD 512 GB 150 MB/s",
  "863409": "Webcam Logitech Brio 500 Full HD Preta",
  "849657": "Webcam Logitech Brio 500 Full HD Branca",
  "716422": "Webcam Logitech C930e Full HD Preta",
  "708304": "Webcam Logitech C922 Pro Stream Full HD",
  "806008": "Teclado Bluetooth Logitech MX Keys Mini Rosa",
  "784517": "Mouse Apple Magic Mouse 2 Prata",
  "1071788": "Carregador Portátil Xiaomi Magnético 5.000 mAh",
  "905450": "Carregador Apple Dual USB-C 35 W Branco",
  "997366": "Carregador Portátil Xiaomi 20.000 mAh Cinza-Escuro",
  "954619": "Kit Máquina de Cortar Cabelo Wahl Legend",
  "1067705": "Secador de Cabelo Mondial by Juliette Ultrassônico 220 V",
  "893120": "Escova Secadora Mondial Tourmaline Íon Preta e Rosa Bivolt",
  "1067720": "Escova Secadora Mondial by Juliette Quatro Elementos Bivolt",
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return new Response("Catálogo temporariamente indisponível", { status: 503 });

  const params = new URLSearchParams({
    select: "id,slug,title,description,brand,gtin,mpn,condition,image_url,additional_image_urls,price_cents,currency,availability,google_product_category,updated_at",
    availability: "eq.in_stock",
    price_cents: "gt.0",
    brand: "not.is.null",
    description: "not.eq.",
    id: `in.(${CURATED_PRODUCT_IDS.join(",")})`,
    limit: String(CURATED_PRODUCT_IDS.length),
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/merchant_products?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 900 },
  });
  if (!response.ok) return new Response("Catalog feed is temporarily unavailable", { status: 503 });

  const products = await response.json() as MerchantProduct[];
  const eligibleProducts = products
    .filter(isMerchantEligible)
    .sort((left, right) => CURATED_PRODUCT_IDS.indexOf(left.id as (typeof CURATED_PRODUCT_IDS)[number]) - CURATED_PRODUCT_IDS.indexOf(right.id as (typeof CURATED_PRODUCT_IDS)[number]));
  const items = eligibleProducts.map((product) => {
    const title = merchantProductTitle(product);
    const description = merchantDescription(product, title);
    const optional = [
      product.brand ? `<g:brand>${xml(product.brand)}</g:brand>` : "",
      product.gtin ? `<g:gtin>${xml(product.gtin)}</g:gtin>` : "",
      product.mpn ? `<g:mpn>${xml(product.mpn)}</g:mpn>` : "",
      product.google_product_category ? `<g:google_product_category>${xml(product.google_product_category)}</g:google_product_category>` : "",
      `<g:custom_label_0>${product.price_cents <= 50_000 ? "ate_500" : "acima_500"}</g:custom_label_0>`,
      !product.gtin && !product.mpn ? "<g:identifier_exists>no</g:identifier_exists>" : "",
      ...(product.additional_image_urls ?? []).slice(0, 10).map((_, index) =>
        `<g:additional_image_link>${xml(merchantImageUrl(product.id, index + 1))}</g:additional_image_link>`
      ),
    ].join("");
    return `<item><g:id>SCB-${xml(product.id)}</g:id><title>${xml(title.slice(0, 150))}</title><description>${xml(description.slice(0, 5000))}</description><link>${xml(`${SITE_URL}/produto/${product.slug}`)}</link><g:image_link>${xml(merchantImageUrl(product.id))}</g:image_link><g:availability>${xml(product.availability)}</g:availability><g:price>${(product.price_cents / 100).toFixed(2)} ${xml(product.currency)}</g:price><g:condition>${xml(product.condition)}</g:condition>${optional}</item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Shopping China Brasil</title><link>${xml(SITE_URL)}</link><description>Catálogo Shopping China Brasil</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
}

type MerchantProduct = { id: string; slug: string; title: string; description: string; brand: string | null; gtin: string | null; mpn: string | null; condition: string; image_url: string; additional_image_urls: string[]; price_cents: number; currency: string; availability: string; google_product_category: string | null; updated_at: string };
function xml(value: string) { return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!); }

function merchantImageUrl(productId: string, index = 0) {
  return `${SITE_URL}/merchant-image/${encodeURIComponent(productId)}/${index}`;
}

function merchantProductTitle(product: MerchantProduct) {
  return MERCHANT_TITLE_OVERRIDES[product.id] ?? merchantTitle(product.title);
}

const preservedMerchantTerms = new Set([
  "3D", "4K", "5G", "8K", "A16", "AI", "AM", "AMD", "AMOLED", "CPU", "DDR4", "DDR5", "GB", "GHz",
  "GPS", "GPU", "HD", "HDMI", "HDR", "Hz", "iPad", "iPhone", "LED", "MP", "OLED", "PC", "PS4", "PS5",
  "RAM", "RJ45", "SSD", "TB", "TV", "UHD", "USB", "USB-C", "Wi-Fi", "Xbox",
]);

function merchantTitle(value: string) {
  const decoded = decodeHtml(value);
  const letters = decoded.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  const uppercaseLetters = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "");
  value = translateMerchantTitle(decoded);
  if (!letters || uppercaseLetters.length / letters.length < 0.75) return value;

  return value.toLocaleLowerCase("pt-BR").replace(/\b[\p{L}\p{N}][\p{L}\p{N}-]*\b/gu, (word, offset) => {
    const preserved = [...preservedMerchantTerms].find((term) => term.toLocaleLowerCase("pt-BR") === word);
    if (preserved) return preserved;
    if (offset > 0 && /^(a|as|com|da|das|de|do|dos|e|em|para|por)$/.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
}

function translateMerchantTitle(value: string) {
  const translations: Array<[RegExp, string]> = [
    [/\bSKY BLUE\b/gi, "Azul-Céu"], [/\bLITTLE KID\b/gi, "Infantil"], [/\bBODY BLACK\b/gi, "Corpo Preto"],
    [/\bJUEGO\b/gi, "Jogo"], [/\bCONSOLA\b/gi, "Console"], [/\bCONTROL\b/gi, "Controle"],
    [/\bCÁMARA\b/gi, "Câmera"], [/\bCAMARA\b/gi, "Câmera"], [/\bCARGADOR\b/gi, "Carregador"],
    [/\bIMPRESORA\b/gi, "Impressora"], [/\bSEÑUELO\b/gi, "Isca"], [/\bPILAS\b/gi, "Pilhas"],
    [/\bRECARGABLES\b/gi, "Recarregáveis"], [/\bFUNDA\b/gi, "Capa"], [/\bCON\b/gi, "com"],
    [/\bINFLABLE\b/gi, "Inflável"], [/\bFLOTADOR\b/gi, "Boia"], [/\bABEJITA\b/gi, "Abelhinha"],
    [/\bJUGUETE\b/gi, "Brinquedo"], [/\bBAÑO\b/gi, "Banho"], [/\bRIÑONERA\b/gi, "Pochete"],
    [/\bPASTELERIA\b/gi, "Confeitaria"], [/\bNECESER\b/gi, "Nécessaire"], [/\bBOLSO\b/gi, "Bolsa"],
    [/\bELÉCTRICO\b/gi, "Elétrico"], [/\bWIRELESS\b/gi, "Sem Fio"], [/\bRUNNING\b/gi, "Corrida"],
    [/\bCHARCOAL\b/gi, "Grafite"], [/\bGRAPHITE\b/gi, "Grafite"], [/\bBLK\b/gi, "Preto"],
    [/\bROSE\b/gi, "Rosa"], [/\bFOR MEN\b/gi, "Masculino"], [/\bPOUR HOMME\b/gi, "Masculino"],
    [/\bAURICULAR(?:ES)?\b/gi, "Fone de Ouvido"], [/\bINALÁMBRICOS?\b/gi, "Sem Fio"],
    [/\bINALAMBRICOS?\b/gi, "Sem Fio"], [/\bPARLANTE\b/gi, "Caixa de Som"], [/\bSPEAKER\b/gi, "Caixa de Som"],
    [/\bSOPORTE\b/gi, "Suporte"], [/\bESTUCHE\b/gi, "Capa"], [/\bPROTECTOR\b/gi, "Protetor"],
    [/\bNEGRO\b/gi, "Preto"], [/\bBLACK\b/gi, "Preto"], [/\bWHITE\b/gi, "Branco"],
    [/\bBLUE\b/gi, "Azul"], [/\bPINK\b/gi, "Rosa"], [/\bSILVER\b/gi, "Prata"],
    [/\bGRAY\b/gi, "Cinza"], [/\bGREY\b/gi, "Cinza"], [/\bRED\b/gi, "Vermelho"],
    [/\bPURPLE\b/gi, "Roxo"], [/\bGREEN\b/gi, "Verde"], [/\bYELLOW\b/gi, "Amarelo"],
    [/\bORANGE\b/gi, "Laranja"], [/\bDORADO\b/gi, "Dourado"], [/\bMARRÓN\b/gi, "Marrom"], [/\bBROWN\b/gi, "Marrom"],
    [/\bFEMENINO\b/gi, "Feminino"], [/\bMASCULINO\b/gi, "Masculino"],
    [/\bMEMORIA\b/gi, "Memória"], [/\bACONDICIONADOR\b/gi, "Condicionador"],
    [/\bMASCARA\b/gi, "Máscara"], [/\bSERUM\b/gi, "Sérum"],
  ];
  return translations.reduce((title, [pattern, replacement]) => title.replace(pattern, replacement), value)
    .replace(/\s+/g, " ").trim();
}

function merchantDescription(product: MerchantProduct, title: string) {
  const current = translateMerchantTitle(decodeHtml(product.description ?? "")).replace(/\s+/g, " ").trim();
  if (current.length >= 250) return current;

  let categoryCopy = "Produto selecionado para quem procura qualidade, procedência e especificações claramente identificadas";
  if (/iPhone|Galaxy|Redmi|Poco/i.test(title)) categoryCopy = "Smartphone indicado para comunicação, aplicativos, fotos, vídeos e uso diário";
  else if (/PlayStation|Nintendo Switch|Xbox/i.test(title)) categoryCopy = "Console desenvolvido para jogos, entretenimento e acesso ao catálogo compatível da plataforma";
  else if (/JBL|Fone de Ouvido|AirPods/i.test(title)) categoryCopy = "Equipamento de áudio indicado para música, chamadas e entretenimento";
  else if (/Watch|Garmin|Relógio/i.test(title)) categoryCopy = "Relógio inteligente indicado para notificações, atividades e acompanhamento da rotina";
  else if (/Kindle/i.test(title)) categoryCopy = "Leitor digital desenvolvido para leitura confortável e armazenamento de livros eletrônicos";
  else if (/MacBook|Notebook|iPad|Tablet/i.test(title)) categoryCopy = "Computador portátil indicado para estudos, trabalho, navegação, produtividade e entretenimento";
  else if (/Monitor/i.test(title)) categoryCopy = "Monitor indicado para computadores, jogos, produtividade e reprodução de conteúdo compatível";
  else if (/Drone/i.test(title)) categoryCopy = "Drone indicado para captação aérea de fotos e vídeos conforme os recursos do modelo";
  else if (/Câmera|GoPro|DJI/i.test(title)) categoryCopy = "Equipamento de imagem indicado para fotografias, vídeos e criação de conteúdo";
  else if (/TV/i.test(title)) categoryCopy = "Televisor inteligente indicado para filmes, séries, jogos e aplicativos de streaming compatíveis";
  else if (/Fritadeira|Cafeteira/i.test(title)) categoryCopy = "Eletrodoméstico indicado para facilitar o preparo diário com as características elétricas informadas no anúncio";

  return `${title}. ${categoryCopy}. Produto novo e original da marca ${product.brand}, disponível em estoque. A capacidade, a cor, a versão, a voltagem e o modelo correspondem exatamente às informações apresentadas no título. Consulte a página do produto para ver fotos, descrição completa, especificações técnicas, conteúdo da embalagem e condições de entrega antes de finalizar a compra.`;
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ");
}

const restrictedProductPattern = /\b(cigarro|cigarette|tabaco|tobacco|vape|vaper|charuto|cachimbo|narguile|arma|pistola|revolver|rifle|municao|munição|cartucho de arma|adulto|erotico|erótico)\b/i;
function isMerchantEligible(product: MerchantProduct) {
  const title = merchantProductTitle(product);
  return Boolean(
    product.id && product.slug && product.title && product.brand && product.image_url &&
    merchantDescription(product, title).length >= 250 &&
    product.price_cents > 0 && product.currency === "BRL" && product.availability === "in_stock" &&
    !restrictedProductPattern.test(title),
  );
}
