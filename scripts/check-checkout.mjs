import { writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4189";
const debugPort = process.env.CHROME_DEBUG_PORT ?? "9224";
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/checkout`)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let counter = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(JSON.stringify(message.error)));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++counter;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await evaluate(expression)) return true; } catch { /* navigation */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await waitFor(`document.readyState === 'complete' && location.origin === '${new URL(baseUrl).origin}'`);
await evaluate(`(() => {
  localStorage.removeItem('shopping-china-brasil-checkout-v1');
  localStorage.setItem('shopping-china-brasil-cart-v1', JSON.stringify([{
    id: '1071316', slug: 'tenis-nike-io7747400-court-vision-low-next-nature-masculino-1071316',
    title: 'TÊNIS NIKE COURT VISION LOW NEXT NATURE MASCULINO', image: '/assets/shopping-china/logo-mark.webp',
    price: 'R$ 322,56', quantity: 1
  }]));
  location.reload(); return true;
})()`);

const ready = await waitFor("document.body.innerText.includes('Pagamento exclusivamente via PIX') && document.body.innerText.includes('Revisar dados para pagar com PIX')");
await new Promise((resolve) => setTimeout(resolve, 500));
const initial = await evaluate(`({
  pixOnly: document.body.innerText.toLowerCase().includes('única forma disponível') && document.body.innerText.includes('não é possível pagar com cartão'),
  delivery: document.body.innerText.includes('em até 20 dias'),
  total: document.body.innerText.includes('R$ 322,56'),
  inputs: document.querySelectorAll('input, select').length
})`);

const desktop = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile("/tmp/shopping-china-checkout-desktop.png", Buffer.from(desktop.data, "base64"));

await evaluate(`(() => {
  const values = {
    name: 'Cliente Shopping China', email: 'cliente@example.com', cpf: '52998224725', phone: '45999998888',
    cep: '85851000', street: 'Avenida Brasil', number: '1000', complement: 'Apto 12',
    neighborhood: 'Centro', city: 'Foz do Iguaçu', state: 'PR'
  };
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  for (const [name, value] of Object.entries(values)) {
    const field = document.querySelector('[name="' + name + '"]');
    if (field.tagName === 'SELECT') {
      field.value = value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      setter.call(field, value);
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    }
  }
  document.querySelector('[name="accepted"]').click();
  document.querySelector('main form').requestSubmit();
  return true;
})()`);

const submitted = await waitFor("document.body.innerText.includes('Checkout pronto para o PIX')");
const completed = await evaluate(`({
  submitted: document.body.innerText.includes('Nenhuma cobrança foi gerada nesta etapa'),
  draftSaved: !!localStorage.getItem('shopping-china-brasil-checkout-v1'),
  cpfMasked: document.querySelector('[name="cpf"]')?.value,
  phoneMasked: document.querySelector('[name="phone"]')?.value,
  cepMasked: document.querySelector('[name="cep"]')?.value
})`);

await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise((resolve) => setTimeout(resolve, 500));
const mobile = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile("/tmp/shopping-china-checkout-mobile.png", Buffer.from(mobile.data, "base64"));

await evaluate(`(() => {
  localStorage.setItem('shopping-china-brasil-cart-v1', JSON.stringify([{
    id: 'alto-valor', slug: 'produto-alto-valor', title: 'PRODUTO ÚNICO DE ALTO VALOR',
    image: '/assets/shopping-china/logo-mark.webp', price: 'R$ 6.000,00', quantity: 1
  }])); location.reload(); return true;
})()`);
await waitFor("document.body.innerText.includes('Pagamento organizado em 3 lotes')");
const highValue = await evaluate(`({
  pixBatches: [...document.querySelectorAll('span')].filter(node => /^PIX \\d+ de 3$/.test(node.textContent?.trim() ?? '')).length,
  allowed: !document.querySelector('main button[type="submit"]')?.disabled,
  notice: document.body.innerText.includes('Compra de item único liberada')
})`);

await evaluate(`(() => {
  const items = JSON.parse(localStorage.getItem('shopping-china-brasil-cart-v1'));
  items.push({ id: 'segundo-item', slug: 'segundo-item', title: 'SEGUNDO PRODUTO', image: '/assets/shopping-china/logo-mark.webp', price: 'R$ 1.000,00', quantity: 1 });
  localStorage.setItem('shopping-china-brasil-cart-v1', JSON.stringify(items)); location.reload(); return true;
})()`);
await waitFor("document.body.innerText.includes('Pedidos acima de US$ 500 aceitam somente uma unidade')");
const blocked = await evaluate(`({
  blocked: document.querySelector('main button[type="submit"]')?.disabled === true,
  warning: document.body.innerText.includes('Revise o carrinho')
})`);

console.log(JSON.stringify({ ready, initial, submitted, completed, highValue, blocked, screenshots: ["/tmp/shopping-china-checkout-desktop.png", "/tmp/shopping-china-checkout-mobile.png"] }, null, 2));
socket.close();

if (!ready || !initial.pixOnly || !initial.delivery || !initial.total || initial.inputs < 10 || !submitted || !completed.submitted || !completed.draftSaved || completed.cpfMasked !== "529.982.247-25" || completed.phoneMasked !== "(45) 99999-8888" || completed.cepMasked !== "85851-000" || highValue.pixBatches !== 3 || !highValue.allowed || !highValue.notice || !blocked.blocked || !blocked.warning) process.exitCode = 1;
