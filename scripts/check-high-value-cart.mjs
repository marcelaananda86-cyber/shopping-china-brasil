import { writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4189";
const debugPort = process.env.CHROME_DEBUG_PORT ?? "9223";
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/carrinho`)}`, { method: "PUT" }).then((response) => response.json());
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
    try {
      if (await evaluate(expression)) return true;
    } catch {
      // Navigation briefly replaces the execution context.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await waitFor(`document.readyState === 'complete' && location.origin === '${new URL(baseUrl).origin}'`);
await evaluate(`(() => {
  localStorage.setItem('shopping-china-brasil-cart-v1', JSON.stringify([{
    id: 'teste-alto-valor',
    slug: 'iphone-18-teste-fluxo',
    title: 'IPHONE 18 — TESTE DO FLUXO DE ALTO VALOR',
    image: '/assets/shopping-china/logo-mark.webp',
    price: 'R$ 6.000,00',
    quantity: 1
  }]));
  location.reload();
  return true;
})()`);

const ready = await waitFor("document.body.innerText.includes('PIX em lotes habilitado') && document.body.innerText.includes('Finalizar pedido')");
await new Promise((resolve) => setTimeout(resolve, 600));
const state = await evaluate(`({
  ready: document.body.innerText.includes('PIX em lotes habilitado'),
  finalizesNormally: document.body.innerText.includes('Finalizar pedido'),
  analysisRemoved: !document.body.innerText.toLowerCase().includes('análise'),
  pixBatches: [...document.querySelectorAll('span')].filter(node => /^PIX \\d+ de \\d+$/.test(node.textContent?.trim() ?? '')).length,
  values: [...document.querySelectorAll('strong')].map(node => node.textContent?.trim()).filter(text => text === 'R$ 2.000,00')
})`);

const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile("/tmp/shopping-china-high-value-cart.png", Buffer.from(screenshot.data, "base64"));
console.log(JSON.stringify({ ...state, screenshot: "/tmp/shopping-china-high-value-cart.png" }, null, 2));
socket.close();

if (!ready || !state.finalizesNormally || !state.analysisRemoved || state.pixBatches !== 3 || state.values.length < 3) process.exitCode = 1;
