import { NextRequest } from "next/server";
import { shippingPriceForState, shippingRegionLabel } from "@/lib/commerce-rules";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ cep: string }> }) {
  const { cep: rawCep } = await params;
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) return Response.json({ error: "invalid_cep", message: "Informe um CEP com 8 números." }, { status: 400 });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { next: { revalidate: 86_400 } });
    if (!response.ok) throw new Error(`viacep_http_${response.status}`);
    const data = await response.json() as { erro?: boolean; cep?: string; logradouro?: string; complemento?: string; bairro?: string; localidade?: string; uf?: string; regiao?: string };
    if (data.erro || !data.localidade || !data.uf) return Response.json({ error: "cep_not_found", message: "CEP não encontrado." }, { status: 404 });

    return Response.json({
      cep: data.cep ?? cep,
      street: data.logradouro ?? "",
      complement: data.complemento ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade,
      state: data.uf,
      region: data.regiao ?? "",
      shippingPrice: shippingPriceForState(data.uf),
      shippingRegion: shippingRegionLabel(data.uf),
    }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
  } catch {
    return Response.json({ error: "cep_service_unavailable", message: "Não foi possível consultar o CEP agora. Preencha o endereço manualmente." }, { status: 503 });
  }
}
