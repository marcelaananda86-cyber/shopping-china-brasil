"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Copy,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  PackageCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import { formatMoney, priceToNumber, useCart, type CartItem } from "@/components/cart-provider";
import { HardLink } from "@/components/hard-link";
import { useExchangeRate } from "@/components/exchange-rate-provider";
import { calculatePixBatches, estimateUsd, isHighValueOrderAllowed, operationalLimitBrl, shippingPriceForState, shippingRegionLabel } from "@/lib/commerce-rules";

type CheckoutDraft = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  accepted: boolean;
};

type PixPayment = {
  batch_number: number;
  batch_count: number;
  amount_cents: number;
  provider_transaction_id: string;
  status: "pending" | "paid" | "cancelled" | "refunded";
  pix_copy_paste: string;
  pix_qr_code_base64: string;
  invoice_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
};

type PixOrder = {
  id: string;
  status: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  created_at: string;
  payments: PixPayment[];
};

const STORAGE_KEY = "shopping-china-brasil-checkout-v1";
const PIX_ATTEMPT_KEY = "shopping-china-brasil-pix-attempt-v1";
const PIX_ORDER_KEY = "shopping-china-brasil-pix-order-v1";
const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const fieldClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#002055] outline-none transition placeholder:text-slate-300 focus:border-[#002055] focus:ring-4 focus:ring-blue-950/5";

export function CheckoutPageContent({ initialCustomer }: { initialCustomer: Omit<CheckoutDraft, "cpf" | "accepted"> }) {
  const { items, hydrated, subtotal, hasUnknownPrices } = useCart();
  const exchangeRate = useExchangeRate();
  const [draft, setDraft] = useState<CheckoutDraft>(() => emptyDraft(initialCustomer));
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDraft, string>>>({});
  const [pixOrder, setPixOrder] = useState<PixOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [cepLookup, setCepLookup] = useState<{ status: "idle" | "loading" | "success" | "error"; message: string }>({ status: "idle", message: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<CheckoutDraft>;
          setDraft((current) => ({ ...current, ...parsed, accepted: false }));
        }
        const orderId = window.localStorage.getItem(PIX_ORDER_KEY);
        if (orderId) void loadPixOrder(orderId, setPixOrder);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cep = digits(draft.cep);
    if (cep.length !== 8) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCepLookup({ status: "loading", message: "Buscando endereço…" });
      try {
        const response = await fetch(`/api/cep/${cep}`, { signal: controller.signal });
        const address = await response.json() as { street?: string; neighborhood?: string; city?: string; state?: string; message?: string };
        if (!response.ok || !address.city || !address.state) throw new Error(address.message ?? "CEP não encontrado.");
        setDraft((current) => ({
          ...current,
          street: address.street || current.street,
          neighborhood: address.neighborhood || current.neighborhood,
          city: address.city ?? current.city,
          state: address.state ?? current.state,
        }));
        setErrors((current) => ({ ...current, cep: undefined, street: undefined, neighborhood: undefined, city: undefined, state: undefined }));
        setCepLookup({ status: "success", message: `Endereço encontrado em ${address.city}/${address.state}.` });
      } catch (error) {
        if ((error as Error).name !== "AbortError") setCepLookup({ status: "error", message: error instanceof Error ? error.message : "CEP não encontrado." });
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [draft.cep]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const highValueOrderAllowed = isHighValueOrderAllowed(subtotal, itemCount, exchangeRate.usdBrl);
  const aboveOperationalLimit = subtotal > operationalLimitBrl(exchangeRate.usdBrl);
  const shippingPrice = shippingPriceForState(draft.state);
  const shippingRegion = shippingRegionLabel(draft.state);
  const orderTotal = subtotal + (shippingPrice ?? 0);
  const pixBatches = useMemo(() => calculatePixBatches(orderTotal), [orderTotal]);
  const canContinue = items.length > 0 && !hasUnknownPrices && highValueOrderAllowed && shippingPrice !== null;

  if (!hydrated) return <div className="h-[720px] animate-pulse rounded-[28px] bg-slate-100" />;
  if (!items.length) return <EmptyCheckout />;

  function update<K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) {
    setApiError("");
    if (key === "cep") setCepLookup({ status: "idle", message: "" });
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !canContinue) {
      const first = Object.keys(nextErrors)[0];
      if (first) document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, accepted: false }));
    setSubmitting(true);
    setApiError("");
    try {
      const sessionResponse = await fetch("/api/auth/guest", { method: "POST" });
      if (!sessionResponse.ok) {
        const sessionResult = await sessionResponse.json() as { message?: string };
        throw new Error(sessionResult.message ?? "Não foi possível iniciar o checkout. Tente novamente.");
      }
      const response = await fetch("/api/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: getPixAttemptKey(items, draft),
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          customer: { name: draft.name, email: draft.email, phone: draft.phone, document: draft.cpf },
          shipping: { street: draft.street, number: draft.number, complement: draft.complement, neighborhood: draft.neighborhood, city: draft.city, state: draft.state, zipCode: draft.cep },
          utm: readUtm(),
        }),
      });
      const result = await response.json() as { success?: boolean; order?: PixOrder; message?: string; error?: string };
      if (response.status === 401) {
        throw new Error("Sua sessão segura expirou. Tente gerar o PIX novamente.");
      }
      if (!response.ok || !result.order) throw new Error(result.message ?? "Não foi possível gerar o PIX. Tente novamente.");
      setPixOrder(result.order);
      window.localStorage.setItem(PIX_ORDER_KEY, result.order.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível gerar o PIX. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshStatus() {
    if (!pixOrder) return;
    setRefreshing(true);
    const updated = await fetchPixOrder(pixOrder.id);
    if (updated) setPixOrder(updated);
    setRefreshing(false);
  }

  return <form onSubmit={submit} noValidate>
    <div className="mb-6 flex flex-col justify-between gap-5 rounded-[28px] bg-[#002055] px-6 py-6 text-white shadow-xl shadow-blue-950/10 md:flex-row md:items-center md:px-8">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Checkout seguro</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">Finalize sua compra</h1><p className="mt-2 text-sm text-white/65">Confira seus dados, a entrega e o pagamento antes de continuar.</p></div>
      <div className="flex items-center gap-2 text-xs font-semibold text-white/75"><LockKeyhole size={17} className="text-[#fcb92c]" /> Ambiente protegido</div>
    </div>

    <CheckoutSteps prepared={Boolean(pixOrder)} />

    {pixOrder ? <PixPaymentPanel order={pixOrder} refreshing={refreshing} onRefresh={refreshStatus} /> : <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-5">
        <CheckoutSection icon={<UserRound />} eyebrow="Seus dados" title="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" name="name" value={draft.name} error={errors.name} autoComplete="name" onChange={(value) => update("name", value)} />
            <Field label="E-mail" name="email" value={draft.email} error={errors.email} type="email" autoComplete="email" onChange={(value) => update("email", value)} />
            <Field label="CPF" name="cpf" value={draft.cpf} error={errors.cpf} inputMode="numeric" placeholder="000.000.000-00" autoComplete="off" onChange={(value) => update("cpf", maskCpf(value))} />
            <Field label="Celular / WhatsApp" name="phone" value={draft.phone} error={errors.phone} inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel" onChange={(value) => update("phone", maskPhone(value))} />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#168c45]" /> Seus dados serão usados para identificação do pedido, documentação fiscal e atualizações da entrega.</p>
        </CheckoutSection>

        <CheckoutSection icon={<MapPin />} eyebrow="Onde entregar" title="Endereço de entrega">
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2"><Field label="CEP" name="cep" value={draft.cep} error={errors.cep} inputMode="numeric" placeholder="00000-000" autoComplete="postal-code" onChange={(value) => update("cep", maskCep(value))} />{cepLookup.message ? <span className={`mt-1.5 block text-[11px] ${cepLookup.status === "error" ? "text-[#bd0811]" : cepLookup.status === "success" ? "text-[#168c45]" : "text-slate-400"}`}>{cepLookup.message}</span> : null}</div>
            <div className="sm:col-span-4"><Field label="Rua / Avenida" name="street" value={draft.street} error={errors.street} autoComplete="address-line1" onChange={(value) => update("street", value)} /></div>
            <div className="sm:col-span-2"><Field label="Número" name="number" value={draft.number} error={errors.number} autoComplete="address-line2" onChange={(value) => update("number", value)} /></div>
            <div className="sm:col-span-4"><Field label="Complemento (opcional)" name="complement" value={draft.complement} autoComplete="address-line3" onChange={(value) => update("complement", value)} /></div>
            <div className="sm:col-span-3"><Field label="Bairro" name="neighborhood" value={draft.neighborhood} error={errors.neighborhood} onChange={(value) => update("neighborhood", value)} /></div>
            <div className="sm:col-span-2"><Field label="Cidade" name="city" value={draft.city} error={errors.city} autoComplete="address-level2" onChange={(value) => update("city", value)} /></div>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-1">UF<select name="state" value={draft.state} onChange={(event) => update("state", event.target.value)} className={`${fieldClass} appearance-none px-3`} autoComplete="address-level1"><option value="">UF</option>{states.map((state) => <option key={state}>{state}</option>)}</select>{errors.state ? <span className="mt-1 block text-[11px] text-[#bd0811]">{errors.state}</span> : null}</label>
          </div>
        </CheckoutSection>

        <CheckoutSection icon={<Truck />} eyebrow="Prazo estimado" title="Forma de entrega">
          <div className="flex items-start gap-4 rounded-2xl border-2 border-[#002055] bg-[#f6f9ff] p-4 md:p-5">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[5px] border-[#002055] bg-white" />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#002055]">Entrega Shopping China Brasil</strong><strong className="text-sm text-[#168c45]">{shippingPrice === null ? "Informe o CEP" : formatMoney(shippingPrice)}</strong></div><p className="mt-1 text-xs leading-5 text-slate-500">{shippingPrice === null ? "O valor será calculado automaticamente conforme a região do CEP." : `${shippingRegion}: frete fixo com entrega em até 20 dias após a confirmação do pagamento.`}</p></div>
          </div>
        </CheckoutSection>

        <CheckoutSection icon={<Banknote />} eyebrow="Pagamento" title="Pague com PIX">
          <div className="overflow-hidden rounded-2xl border-2 border-[#168c45] bg-white">
            <div className="flex flex-col gap-4 bg-[#f1fbf5] p-5 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#168c45] text-white"><QrCode size={28} /></span>
              <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#002055]">PIX</h3><span className="rounded-full bg-[#168c45] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Única forma disponível</span></div><p className="mt-1 text-xs leading-5 text-slate-500">Aprovação rápida, pagamento protegido e confirmação vinculada ao seu pedido.</p></div>
              <CheckCircle2 className="hidden text-[#168c45] sm:block" />
            </div>
            <div className="border-t border-green-100 p-5">
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" /><p><strong>Pagamento exclusivamente via PIX.</strong> Por questões e regras fiscais aplicáveis à operação, no momento não é possível pagar com cartão, boleto ou outros meios.</p></div>
              {pixBatches.length > 1 && highValueOrderAllowed ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#002055]">Pagamento organizado em {pixBatches.length} lotes</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{pixBatches.map((batch, index) => <div key={`${batch}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs"><span className="font-semibold text-slate-500">PIX {index + 1} de {pixBatches.length}</span><strong className="text-[#002055]">{formatMoney(batch)}</strong></div>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">Os lotes são uma forma de pagamento. Produtos e frete permanecem registrados no valor total de {formatMoney(orderTotal)}.</p></div> : <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Pagamento único por PIX</span><strong className="text-[#002055]">{formatMoney(orderTotal)}</strong></div>}
            </div>
          </div>
        </CheckoutSection>

        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-5 text-xs leading-5 ${errors.accepted ? "border-red-300" : "border-slate-200"}`}><input name="accepted" type="checkbox" checked={draft.accepted} onChange={(event) => update("accepted", event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#002055]" /><span className="text-slate-600">Li e aceito os <HardLink href="/termos" className="font-bold text-[#002055] underline">Termos de uso</HardLink>, a <HardLink href="/politicas/privacidade" className="font-bold text-[#002055] underline">Política de privacidade</HardLink> e as condições de entrega e pagamento via PIX.</span></label>
        {errors.accepted ? <p className="-mt-3 text-xs text-[#bd0811]">{errors.accepted}</p> : null}
        {apiError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-[#bd0811]"><strong>Não foi possível gerar o PIX.</strong><br />{apiError}</div> : null}
      </div>

      <OrderSummary
        aboveOperationalLimit={aboveOperationalLimit}
        canContinue={canContinue}
        estimatedUsd={estimateUsd(subtotal, exchangeRate.usdBrl)}
        shippingPrice={shippingPrice}
        shippingRegion={shippingRegion}
        total={orderTotal}
        prepared={false}
        submitting={submitting}
      />
    </div>}
  </form>;
}

function CheckoutSteps({ prepared }: { prepared: boolean }) {
  const steps = ["Carrinho", "Identificação", "Entrega", "PIX"];
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6"><div className="flex items-center">{steps.map((step, index) => <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none"><div className="flex min-w-0 flex-col items-center gap-1.5"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 || prepared ? "bg-[#168c45] text-white" : index === 1 ? "bg-[#002055] text-white" : "bg-slate-100 text-slate-400"}`}>{index === 0 || prepared ? <Check size={15} /> : index + 1}</span><span className="hidden text-[10px] font-semibold text-slate-500 sm:block">{step}</span></div>{index < steps.length - 1 ? <span className={`mx-2 h-0.5 min-w-4 flex-1 ${prepared || index === 0 ? "bg-[#168c45]" : "bg-slate-200"}`} /> : null}</div>)}</div></div>;
}

function CheckoutSection({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3fa] text-[#bd0811]">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd0811]">{eyebrow}</p><h2 className="mt-0.5 text-xl font-bold text-[#002055]">{title}</h2></div></div>{children}</section>;
}

function Field({ label, name, value, error, onChange, ...props }: { label: string; name: keyof CheckoutDraft; value: string; error?: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange">) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input {...props} name={name} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} ${error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`} />{error ? <span className="mt-1 block text-[11px] text-[#bd0811]">{error}</span> : null}</label>;
}

function OrderSummary({ aboveOperationalLimit, canContinue, estimatedUsd, shippingPrice, shippingRegion, total, prepared, submitting }: { aboveOperationalLimit: boolean; canContinue: boolean; estimatedUsd: number; shippingPrice: number | null; shippingRegion: string; total: number; prepared: boolean; submitting: boolean }) {
  const { items, subtotal, hasUnknownPrices } = useCart();
  return <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.09)] lg:sticky lg:top-36">
    <div className="border-b border-slate-100 px-6 py-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd0811]">Sua compra</p><h2 className="mt-1 text-xl font-bold text-[#002055]">Resumo do pedido</h2></div>
    <div className="max-h-[330px] space-y-4 overflow-y-auto px-6 py-5">{items.map((item) => <div key={item.id} className="flex gap-3"><span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5"><img src={item.image} alt="" className="h-full w-full object-contain" /><span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#002055] px-1 text-[10px] font-bold text-white">{item.quantity}</span></span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-semibold uppercase leading-5 text-[#002055]">{item.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{priceToNumber(item.price) === null ? "Sob consulta" : formatMoney((priceToNumber(item.price) ?? 0) * item.quantity)}</p></div></div>)}</div>
    <div className="border-t border-slate-100 px-6 py-5"><div className="space-y-3 text-sm"><div className="flex justify-between text-slate-500"><span>Produtos</span><span>{formatMoney(subtotal)}</span></div><div className="flex justify-between gap-3 text-slate-500"><span>Frete <small className="block text-[10px] text-slate-400">{shippingRegion}</small></span><span>{shippingPrice === null ? "Informe o CEP" : formatMoney(shippingPrice)}</span></div><div className="flex justify-between text-xs text-slate-400"><span>Entrega estimada</span><span>Em até 20 dias</span></div><div className="flex justify-between text-xs text-slate-400"><span>Produtos em dólar referencial</span><span>US$ {estimatedUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div></div><div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-5"><strong className="text-[#002055]">Total</strong><strong className="text-2xl text-[#002055]">{shippingPrice === null ? "—" : formatMoney(total)}</strong></div></div>
    <div className="px-6 pb-6">
      {!canContinue ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-[#bd0811]"><strong>Revise o pedido.</strong> {hasUnknownPrices ? "Há um item sem preço confirmado." : shippingPrice === null ? "Informe um CEP válido para calcular o frete." : "Pedidos acima de US$ 500 aceitam somente uma unidade de um produto."}</div> : null}
      {aboveOperationalLimit && canContinue ? <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-[#002055]"><strong>Compra de item único liberada.</strong> O pagamento será exibido em lotes de PIX.</div> : null}
      <button type="submit" disabled={!canContinue || prepared || submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#bd0811] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-950/15 transition hover:bg-[#97070e] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{submitting ? <><LoaderCircle size={18} className="animate-spin" /> Gerando PIX seguro…</> : prepared ? <><CheckCircle2 size={18} /> PIX gerado</> : <><QrCode size={18} /> Gerar PIX e finalizar pedido</>}</button>
      <HardLink href="/carrinho" className="mt-3 flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#002055] hover:text-[#bd0811]"><ArrowLeft size={15} /> Voltar ao carrinho</HardLink>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5"><p className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={16} className="text-[#168c45]" /> Dados protegidos durante o checkout</p><p className="flex items-center gap-2 text-xs text-slate-500"><PackageCheck size={16} className="text-[#168c45]" /> Produtos originais e pedido rastreável</p><p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={16} className="text-[#168c45]" /> Entrega no Brasil em até 20 dias</p></div>
    </div>
  </aside>;
}

function PixPaymentPanel({ order, refreshing, onRefresh }: { order: PixOrder; refreshing: boolean; onRefresh: () => void }) {
  const paid = order.status === "paid";
  const sortedPayments = [...order.payments].sort((a, b) => a.batch_number - b.batch_number);
  return <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.09)]">
    <div className={`flex flex-col gap-4 p-6 sm:flex-row sm:items-center md:p-8 ${paid ? "bg-[#f1fbf5]" : "bg-[#eef3fa]"}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${paid ? "bg-[#168c45]" : "bg-[#002055]"}`}>{paid ? <BadgeCheck size={29} /> : <QrCode size={29} />}</span>
      <div className="flex-1"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Pedido {order.id}</p><h2 className="mt-1 text-2xl font-bold text-[#002055]">{paid ? "Pagamento confirmado" : "Pague o PIX para confirmar o pedido"}</h2><p className="mt-1 text-sm text-slate-500">{paid ? "Recebemos todos os pagamentos. Seu pedido seguirá para preparação." : `${sortedPayments.length} pagamento${sortedPayments.length > 1 ? "s" : ""} PIX — ${formatMoney(order.subtotal_cents / 100)} em produtos + ${formatMoney(order.shipping_cents / 100)} de frete.`}</p></div>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-[#002055] hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Atualizar status</button>
    </div>
    {!paid ? <div className="grid gap-5 p-5 md:p-8 lg:grid-cols-2">{sortedPayments.map((payment) => <PixPaymentCard key={payment.provider_transaction_id} payment={payment} />)}</div> : null}
    <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 text-center text-xs leading-5 text-slate-500">O pedido é confirmado somente quando todos os PIX constarem como pagos. Você pode acompanhar o andamento em <HardLink href="/conta" className="font-bold text-[#002055] underline">Minha conta</HardLink>.</div>
  </section>;
}

function PixPaymentCard({ payment }: { payment: PixPayment }) {
  const [copied, setCopied] = useState(false);
  const qrSource = payment.pix_qr_code_base64?.startsWith("data:") ? payment.pix_qr_code_base64 : payment.pix_qr_code_base64 ? `data:image/png;base64,${payment.pix_qr_code_base64}` : "";
  async function copyCode() {
    await navigator.clipboard.writeText(payment.pix_copy_paste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return <article className="rounded-3xl border border-slate-200 p-5 text-center">
    <div className="flex items-center justify-between gap-3 text-left"><span className="rounded-full bg-[#002055] px-3 py-1.5 text-[11px] font-bold text-white">PIX {payment.batch_number} de {payment.batch_count}</span><strong className="text-lg text-[#002055]">{formatMoney(payment.amount_cents / 100)}</strong></div>
    {qrSource ? <img src={qrSource} alt={`QR Code do PIX ${payment.batch_number}`} className="mx-auto mt-5 h-52 w-52 rounded-2xl border border-slate-200 bg-white p-2" /> : <div className="mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><QrCode size={52} /></div>}
    <p className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-left font-mono text-[10px] leading-4 text-slate-500">{payment.pix_copy_paste}</p>
    <button type="button" onClick={copyCode} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#168c45] px-5 py-3 text-sm font-bold text-white hover:bg-[#117239]">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Código copiado" : "Copiar código PIX"}</button>
    {payment.invoice_url ? <a href={payment.invoice_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#002055] hover:text-[#bd0811]">Abrir fatura <ExternalLink size={13} /></a> : null}
    {payment.expires_at ? <p className="mt-3 text-[11px] text-slate-400">Válido até {new Date(payment.expires_at).toLocaleString("pt-BR")}</p> : null}
  </article>;
}

function EmptyCheckout() {
  return <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-20 text-center shadow-sm"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CreditCard size={34} /></span><h1 className="mt-5 text-3xl font-bold text-[#002055]">Seu checkout está vazio</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Adicione produtos ao carrinho antes de preencher os dados de entrega e pagamento.</p><HardLink href="/" className="mt-6 inline-flex rounded-full bg-[#002055] px-7 py-3.5 text-sm font-bold text-white">Explorar produtos</HardLink></div>;
}

function emptyDraft(customer: Omit<CheckoutDraft, "cpf" | "accepted">): CheckoutDraft {
  return { ...customer, cpf: "", accepted: false };
}

function validate(draft: CheckoutDraft) {
  const errors: Partial<Record<keyof CheckoutDraft, string>> = {};
  if (draft.name.trim().split(/\s+/).length < 2) errors.name = "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) errors.email = "Informe um e-mail válido.";
  if (!isValidCpf(draft.cpf)) errors.cpf = "Informe um CPF válido.";
  if (!/^\d{10,11}$/.test(digits(draft.phone))) errors.phone = "Informe um celular com DDD.";
  if (digits(draft.cep).length !== 8) errors.cep = "Informe um CEP válido.";
  if (draft.street.trim().length < 3) errors.street = "Informe a rua ou avenida.";
  if (!draft.number.trim()) errors.number = "Informe o número.";
  if (draft.neighborhood.trim().length < 2) errors.neighborhood = "Informe o bairro.";
  if (draft.city.trim().length < 2) errors.city = "Informe a cidade.";
  if (!draft.state) errors.state = "Selecione a UF.";
  if (!draft.accepted) errors.accepted = "Aceite os termos para continuar.";
  return errors;
}

function isValidCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let index = 0; index < digit; index += 1) sum += Number(cpf[index]) * (digit + 1 - index);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(cpf[digit])) return false;
  }
  return true;
}

function digits(value: string) { return value.replace(/\D/g, ""); }
function maskCpf(value: string) { return digits(value).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
function maskCep(value: string) { return digits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
function maskPhone(value: string) { const raw = digits(value).slice(0, 11); return raw.length > 10 ? raw.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : raw.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); }

function getPixAttemptKey(items: CartItem[], draft: CheckoutDraft) {
  const signature = [
    items.map((item) => `${item.id}:${item.quantity}`).sort().join("|"),
    digits(draft.cep), draft.number.trim(), draft.complement.trim(), draft.cpf,
  ].join("::");
  try {
    const saved = JSON.parse(window.localStorage.getItem(PIX_ATTEMPT_KEY) ?? "null") as { signature?: string; key?: string } | null;
    if (saved?.signature === signature && saved.key) return saved.key;
  } catch { /* A new attempt replaces invalid local data. */ }
  const key = crypto.randomUUID();
  window.localStorage.setItem(PIX_ATTEMPT_KEY, JSON.stringify({ signature, key }));
  return key;
}

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
    .map((key) => [key, params.get(key)?.slice(0, 200) ?? ""])
    .filter(([, value]) => Boolean(value)));
}

async function fetchPixOrder(orderId: string) {
  try {
    const response = await fetch(`/api/checkout/pix?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const result = await response.json() as { order?: PixOrder };
    return response.ok && result.order ? result.order : null;
  } catch { return null; }
}

async function loadPixOrder(orderId: string, apply: React.Dispatch<React.SetStateAction<PixOrder | null>>) {
  const order = await fetchPixOrder(orderId);
  if (order) apply(order);
  else window.localStorage.removeItem(PIX_ORDER_KEY);
}
