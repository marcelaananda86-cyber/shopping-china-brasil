import { writeFileSync } from "node:fs";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4189";
const debugPort = process.env.CHROME_DEBUG_PORT ?? "9226";
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then((response) => response.json());
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
    if (await evaluate(expression)) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1680, height: 850, deviceScaleFactor: 1, mobile: false });
await waitFor("document.readyState === 'complete' && document.querySelectorAll('button[aria-label^=\"Ir para banner\"]').length === 3");

const slides = [];
for (let index = 0; index < 3; index += 1) {
  await evaluate(`document.querySelectorAll('button[aria-label^="Ir para banner"]')[${index}].click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 850));
  const state = await evaluate(`(() => {
    const hero = document.querySelector('section[aria-label="Destaques Shopping China"]');
    const active = [...hero.querySelectorAll('article')].find((article) => article.getAttribute('aria-hidden') === 'false');
    const image = active?.querySelector('picture:last-of-type img');
    const action = active?.querySelector('a[href="/categoria/eletronicos"]');
    const heroRect = hero?.getBoundingClientRect();
    const actionRect = action?.getBoundingClientRect();
    return {
      index: ${index},
      heroHeight: Math.round(heroRect?.height ?? 0),
      imageLoaded: Boolean(image?.complete && image?.naturalWidth > 0),
      actionInside: !actionRect || actionRect.bottom <= heroRect.bottom,
    };
  })()`);
  const screenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(`/tmp/shopping-china-hero-slide-${index + 1}.png`, Buffer.from(screenshot.data, "base64"));
  slides.push(state);
}

console.log(JSON.stringify(slides, null, 2));
socket.close();

if (slides.some((slide) => !slide.imageLoaded || !slide.actionInside || slide.heroHeight < 300 || slide.heroHeight > 380)) process.exitCode = 1;
