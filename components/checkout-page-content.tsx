"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeGenerator from "qrcode";
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
  const { items, hydrated, subtotal, hasUnknownPrices, clearCart } = useCart();
  const exchangeRate = useExchangeRate();
  const [draft, setDraft] = useState<CheckoutDraft>(() => emptyDraft(initialCustomer));
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDraft, string>>>({});
  const [pixOrder, setPixOrder] = useState<PixOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [statusError, setStatusError] = useState("");
  const [apiError, setApiError] = useState("");
  const [cepLookup, setCepLookup] = useState<{ status: "idle" | "loading" | "success" | "error"; message: string }>({ status: "idle", message: "" });
  const clearCartRef = useRef(clearCart);
  const pendingOrderId = pixOrder?.status === "pending_payment" ? pixOrder.id : null;

  useEffect(() => { clearCartRef.current = clearCart; }, [clearCart]);

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
    if (!pendingOrderId) return;
    let active = true;
    const check = async () => {
      const updated = await fetchPixOrder(pendingOrderId);
      if (!active) return;
      setLastStatusCheck(new Date());
      if (updated) {
        setPixOrder(updated);
        setStatusError("");
      } else {
        setStatusError("Não foi possível consultar o pagamento agora. Tentaremos novamente automaticamente.");
      }
    };
    const firstCheck = window.setTimeout(check, 3500);
    const interval = window.setInterval(check, 7000);
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pendingOrderId]);

  useEffect(() => {
    if (pixOrder?.status !== "paid") return;
    clearCartRef.current();
    window.localStorage.removeItem(PIX_ATTEMPT_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [pixOrder?.status]);

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
  if (!items.length && !pixOrder) return <EmptyCheckout />;

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
    setLastStatusCheck(new Date());
    if (updated) {
      setPixOrder(updated);
      setStatusError("");
    } else {
      setStatusError("Não foi possível atualizar agora. Confira sua conexão e tente novamente.");
    }
    setRefreshing(false);
  }

  function restartPayment() {
    window.localStorage.removeItem(PIX_ORDER_KEY);
    window.localStorage.removeItem(PIX_ATTEMPT_KEY);
    setPixOrder(null);
    setStatusError("");
    setLastStatusCheck(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <form onSubmit={submit} noValidate>
    <div className="mb-6 flex flex-col justify-between gap-5 rounded-[28px] bg-[#002055] px-6 py-6 text-white shadow-xl shadow-blue-950/10 md:flex-row md:items-center md:px-8">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Checkout seguro</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">Finalize sua compra</h1><p className="mt-2 text-sm text-white/65">Confira seus dados, a entrega e o pagamento antes de continuar.</p></div>
      <div className="flex items-center gap-2 text-xs font-semibold text-white/75"><LockKeyhole size={17} className="text-[#fcb92c]" /> Ambiente protegido</div>
    </div>

    <CheckoutSteps prepared={Boolean(pixOrder)} />

    {pixOrder ? <PixPaymentPanel order={pixOrder} refreshing={refreshing} lastStatusCheck={lastStatusCheck} statusError={statusError} onRefresh={refreshStatus} onRestart={restartPayment} /> : <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_400px]">
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
  return <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 md:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef3fa] text-[#bd0811] sm:h-11 sm:w-11">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd0811]">{eyebrow}</p><h2 className="mt-0.5 text-lg font-bold text-[#002055] sm:text-xl">{title}</h2></div></div>{children}</section>;
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

function PixPaymentPanel({ order, refreshing, lastStatusCheck, statusError, onRefresh, onRestart }: { order: PixOrder; refreshing: boolean; lastStatusCheck: Date | null; statusError: string; onRefresh: () => void; onRestart: () => void }) {
  const paid = order.status === "paid";
  const sortedPayments = [...order.payments].sort((a, b) => a.batch_number - b.batch_number);
  const paidCount = sortedPayments.filter((payment) => payment.status === "paid").length;
  const interrupted = ["cancelled", "refunded"].includes(order.status) || sortedPayments.some((payment) => ["cancelled", "refunded"].includes(payment.status));
  const progress = sortedPayments.length ? Math.round((paidCount / sortedPayments.length) * 100) : 0;

  return <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.09)] sm:rounded-[30px]">
    <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-7 md:p-8 ${paid ? "bg-[#eaf9f0]" : "bg-gradient-to-r from-[#eef3fa] to-white"}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${paid ? "bg-[#168c45] shadow-green-950/15" : interrupted ? "bg-amber-600 shadow-amber-950/15" : "bg-[#002055] shadow-blue-950/15"}`}>{paid ? <BadgeCheck size={30} /> : interrupted ? <AlertTriangle size={28} /> : <QrCode size={29} />}</span>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#bd0811]">Pedido {order.id}</p><h2 className="mt-1 text-2xl font-bold leading-tight text-[#002055] sm:text-3xl">{paid ? "Pagamento confirmado" : interrupted ? "Pagamento interrompido" : "Seu PIX está pronto"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{paid ? "Pagamento identificado com sucesso. Seu pedido entrou em preparação e a confirmação será enviada ao e-mail informado." : interrupted ? "Um dos códigos não está mais disponível. Veja abaixo como continuar com segurança." : "Escaneie o QR Code ou copie o código PIX. A confirmação acontece automaticamente nesta tela."}</p></div>
      {!paid && !interrupted ? <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-[#002055] shadow-sm transition hover:border-[#002055] hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Verificando…" : "Verificar pagamento"}</button> : null}
    </div>

    {paid ? <PaymentConfirmed order={order} /> : interrupted ? <PaymentInterrupted paidCount={paidCount} onRestart={onRestart} /> : <div className="grid items-start gap-6 p-4 sm:p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">{sortedPayments.map((payment) => <PixPaymentCard key={payment.provider_transaction_id} payment={payment} />)}</div>
      <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6 xl:sticky xl:top-36">
        <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#bd0811]">Status do pedido</p>
        <div className="mt-3 flex items-end justify-between gap-4"><div><strong className="text-lg text-[#002055]">Aguardando pagamento</strong><p className="mt-1 text-xs leading-5 text-slate-500">A consulta à operadora é automática.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Clock3 size={20} /></span></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#168c45] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500"><span>{paidCount} de {sortedPayments.length} PIX confirmado{paidCount === 1 ? "" : "s"}</span><span>{progress}%</span></div>

        <div className="mt-6 border-t border-slate-200 pt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#002055]">Como pagar</p><ol className="mt-4 space-y-4">{[
          "Abra o aplicativo do seu banco e escolha pagar com PIX.",
          "Escaneie o QR Code ou use a opção PIX Copia e Cola.",
          "Confira o valor e conclua. Não feche esta tela até a confirmação.",
        ].map((item, index) => <li key={item} className="flex gap-3 text-xs leading-5 text-slate-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#002055] text-[10px] font-bold text-white">{index + 1}</span><span>{item}</span></li>)}</ol></div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm"><div className="flex justify-between text-xs text-slate-500"><span>Produtos</span><span>{formatMoney(order.subtotal_cents / 100)}</span></div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>Entrega</span><span>{formatMoney(order.shipping_cents / 100)}</span></div><div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4"><strong className="text-sm text-[#002055]">Total</strong><strong className="text-xl text-[#002055]">{formatMoney(order.total_cents / 100)}</strong></div></div>
        <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-slate-500"><RefreshCw size={14} className="shrink-0 text-[#168c45]" /> {lastStatusCheck ? `Última verificação às ${lastStatusCheck.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "A primeira verificação será feita em instantes."}</p>
        {statusError ? <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">{statusError}</p> : null}
      </aside>
    </div>}

    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-center text-xs leading-5 text-slate-500">{paid ? <>Acompanhe a preparação e o rastreamento em <HardLink href="/conta" className="font-bold text-[#002055] underline">Minha conta</HardLink>.</> : interrupted ? <>Não faça outro pagamento para este pedido sem seguir a orientação exibida acima.</> : <>Não é necessário enviar comprovante. Assim que a operadora confirmar todos os PIX, o pedido será atualizado automaticamente.</>}</div>
  </section>;
}

function PaymentInterrupted({ paidCount, onRestart }: { paidCount: number; onRestart: () => void }) {
  const hasPartialPayment = paidCount > 0;
  return <div className="p-5 sm:p-7 md:p-8"><div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center sm:p-8"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-600 text-white"><AlertTriangle size={30} /></span><h3 className="mt-5 text-2xl font-bold text-[#002055]">{hasPartialPayment ? "Precisamos conferir seu pedido" : "Gere um novo pagamento"}</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{hasPartialPayment ? "Parte do pedido já possui pagamento identificado. Para evitar cobrança duplicada, fale com o atendimento e informe o número do pedido antes de realizar outro PIX." : "Nenhum valor foi confirmado e o código anterior foi cancelado ou expirou. Você pode voltar ao checkout e emitir um novo PIX com segurança."}</p><div className="mt-6 flex flex-wrap justify-center gap-3">{hasPartialPayment ? <HardLink href="/contato" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#002055] px-6 py-3 text-sm font-bold text-white">Falar com o atendimento</HardLink> : <button type="button" onClick={onRestart} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#bd0811] px-6 py-3 text-sm font-bold text-white hover:bg-[#97070e]">Gerar um novo PIX</button>}<HardLink href="/conta" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-[#002055]">Ver meus pedidos</HardLink></div></div></div>;
}

function PaymentConfirmed({ order }: { order: PixOrder }) {
  return <div className="grid gap-6 p-5 sm:p-7 md:p-8 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="rounded-3xl border border-green-200 bg-[#f1fbf5] p-6 sm:p-8"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#168c45] text-white shadow-lg shadow-green-950/15"><CheckCircle2 size={34} /></span><h3 className="mt-5 text-2xl font-bold text-[#002055]">Tudo certo com seu pagamento</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Recebemos a confirmação da operadora. Agora vamos separar e conferir os produtos antes do envio. Você também receberá no e-mail informado a confirmação com os itens, valores e dados do pedido.</p><div className="mt-6 flex flex-wrap gap-3"><HardLink href="/conta" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#002055] px-6 py-3 text-sm font-bold text-white hover:bg-[#bd0811]">Acompanhar meu pedido</HardLink><HardLink href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-[#002055] hover:border-[#002055]">Continuar comprando</HardLink></div></div>
    <aside className="rounded-3xl border border-slate-200 p-6"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#bd0811]">Resumo confirmado</p><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Pedido</dt><dd className="font-bold text-[#002055]">{order.id}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Pagamento</dt><dd className="font-bold text-[#168c45]">PIX confirmado</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Entrega estimada</dt><dd className="font-bold text-[#002055]">Em até 20 dias</dd></div><div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-4"><dt className="font-bold text-[#002055]">Total pago</dt><dd className="text-xl font-bold text-[#002055]">{formatMoney(order.total_cents / 100)}</dd></div></dl><p className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><PackageCheck size={17} className="mt-0.5 shrink-0 text-[#168c45]" /> Você poderá consultar o status e o código de rastreamento na área da conta.</p></aside>
  </div>;
}

function PixPaymentCard({ payment }: { payment: PixPayment }) {
  const [copied, setCopied] = useState(false);
  const [generatedQr, setGeneratedQr] = useState("");
  const [providerQrFailed, setProviderQrFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const providerQr = normalizeProviderQr(payment.pix_qr_code_base64);
  const qrSource = providerQr && !providerQrFailed ? providerQr : generatedQr;
  const expiresAt = payment.expires_at ? new Date(payment.expires_at).getTime() : null;
  const expired = Boolean(expiresAt && expiresAt <= now && payment.status === "pending");

  useEffect(() => {
    let active = true;
    if (!payment.pix_copy_paste) return;
    QRCodeGenerator.toDataURL(payment.pix_copy_paste, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 640,
      color: { dark: "#002055", light: "#ffffff" },
    }).then((value) => { if (active) setGeneratedQr(value); }).catch(() => { if (active) setGeneratedQr(""); });
    return () => { active = false; };
  }, [payment.pix_copy_paste]);

  useEffect(() => {
    if (!expiresAt || payment.status !== "pending") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, payment.status]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(payment.pix_copy_paste);
    } catch {
      const input = document.createElement("textarea");
      input.value = payment.pix_copy_paste;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (payment.status === "paid") return <article className="flex flex-col gap-4 rounded-3xl border border-green-200 bg-[#f1fbf5] p-5 sm:flex-row sm:items-center"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#168c45] text-white"><CheckCircle2 size={24} /></span><div className="flex-1"><p className="text-xs font-bold uppercase tracking-[.13em] text-[#168c45]">PIX {payment.batch_number} de {payment.batch_count} confirmado</p><p className="mt-1 text-sm text-slate-500">Pagamento identificado pela operadora.</p></div><strong className="text-xl text-[#002055]">{formatMoney(payment.amount_cents / 100)}</strong></article>;

  if (["cancelled", "refunded"].includes(payment.status)) return <article className="rounded-3xl border border-red-200 bg-red-50 p-5"><div className="flex items-center gap-3"><AlertTriangle className="text-[#bd0811]" /><div><p className="font-bold text-[#bd0811]">Este PIX não está mais disponível</p><p className="mt-1 text-xs text-slate-600">Entre em contato com o atendimento informando o pedido para receber orientação.</p></div></div></article>;

  return <article className={`rounded-3xl border bg-white p-4 shadow-sm sm:p-6 ${expired ? "border-amber-300" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#002055] px-3 py-1.5 text-[11px] font-bold text-white">PIX {payment.batch_number} de {payment.batch_count}</span><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor deste PIX</p><strong className="text-xl text-[#002055]">{formatMoney(payment.amount_cents / 100)}</strong></div></div>
    <div className="mt-5 grid items-center gap-5 sm:grid-cols-[230px_minmax(0,1fr)] sm:gap-7">
      <div className="mx-auto w-full max-w-[230px]">
        <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-inner">{qrSource ? <img src={qrSource} onError={() => setProviderQrFailed(true)} alt={`QR Code para pagar o PIX ${payment.batch_number}`} className="h-full w-full object-contain" /> : <div className="flex h-full w-full animate-pulse items-center justify-center rounded-xl bg-slate-100 text-slate-400"><QrCode size={54} /></div>}</div>
        <p className={`mt-3 text-center text-[11px] font-semibold ${expired ? "text-amber-700" : "text-slate-500"}`}>{expiresAt ? expired ? "Prazo do PIX encerrado" : `Expira em ${formatRemainingTime(expiresAt - now)}` : "Pagamento disponível por tempo limitado"}</p>
      </div>
      <div className="min-w-0"><h3 className="text-lg font-bold text-[#002055]">Pague pelo aplicativo do seu banco</h3><p className="mt-2 text-xs leading-5 text-slate-500">No celular, toque em copiar e cole o código na área PIX do banco. Em outro dispositivo, aponte a câmera para o QR Code.</p><div className="mt-4 max-h-24 overflow-y-auto break-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-4 text-slate-500">{payment.pix_copy_paste}</div><button type="button" onClick={copyCode} disabled={!payment.pix_copy_paste || expired} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#168c45] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#117239] disabled:cursor-not-allowed disabled:bg-slate-300">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Código PIX copiado" : "Copiar código PIX"}</button>{payment.invoice_url ? <a href={payment.invoice_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-[#002055] hover:text-[#bd0811]">Abrir página do pagamento <ExternalLink size={13} /></a> : null}</div>
    </div>
    {expired ? <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Este código atingiu o prazo informado pela operadora.</strong> Não tente pagá-lo. Fale com o atendimento para emitir um novo pagamento.</p> : null}
  </article>;
}

function normalizeProviderQr(value: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(trimmed)) return trimmed;
  if (trimmed.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) return `data:image/png;base64,${trimmed.replace(/\s/g, "")}`;
  return "";
}

function formatRemainingTime(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
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
