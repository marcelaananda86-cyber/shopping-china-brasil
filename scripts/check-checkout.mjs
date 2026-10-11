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
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const redirected = await waitFor("location.pathname === '/entrar' && document.body.innerText.includes('Conta necessária')");
const login = await evaluate(`({
  path: location.pathname,
  next: new URLSearchParams(location.search).get('next'),
  google: document.body.innerText.includes('Continuar com Google'),
  email: !!document.querySelector('input[name="email"]'),
  password: !!document.querySelector('input[name="password"]'),
  accountRequired: document.body.innerText.includes('Compra somente com conta'),
  googleReady: ![...document.querySelectorAll('button')].find(button => button.textContent.includes('Continuar com Google'))?.disabled
})`);
const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile("/tmp/shopping-china-login-required.png", Buffer.from(screenshot.data, "base64"));

await evaluate(`(() => {
  localStorage.setItem('shopping-china-brasil-cart-v1', JSON.stringify([{
    id: 'auth-test', slug: 'auth-test', title: 'PRODUTO PARA TESTE DE AUTENTICAÇÃO',
    image: '/assets/shopping-china/logo-mark.webp', price: 'R$ 322,56', quantity: 1
  }]));
  location.assign('${baseUrl}/carrinho');
  return true;
})()`);
const cartReady = await waitFor("location.pathname === '/carrinho' && document.body.innerText.includes('Entrar para comprar')");
const cart = await evaluate(`({
  required: document.body.innerText.includes('Conta obrigatória'),
  action: document.querySelector('a[href^="/entrar?next="]')?.textContent?.trim(),
  destination: document.querySelector('a[href^="/entrar?next="]')?.getAttribute('href')
})`);
await evaluate(`document.querySelector('a[href^="/entrar?next="]')?.click(); true`);
const returnPreserved = await waitFor("location.pathname === '/entrar' && new URLSearchParams(location.search).get('next') === '/checkout' && document.body.innerText.includes('Ainda não tenho conta')");
await evaluate(`document.querySelector('a[href*="modo=cadastro"]')?.click(); true`);
const signupReady = await waitFor("location.pathname === '/entrar' && new URLSearchParams(location.search).get('modo') === 'cadastro' && document.body.innerText.includes('Criar conta e continuar')");
const signup = await evaluate(`({
  next: new URLSearchParams(location.search).get('next'),
  name: !!document.querySelector('input[name="name"]'),
  copy: document.body.innerText.includes('Criar conta e continuar')
})`);

console.log(JSON.stringify({ redirected, login, cartReady, cart, returnPreserved, signupReady, signup, screenshot: "/tmp/shopping-china-login-required.png" }, null, 2));
socket.close();

if (!redirected || login.path !== "/entrar" || login.next !== "/checkout" || !login.google || !login.email || !login.password || !login.accountRequired || !cartReady || !cart.required || cart.action !== "Entrar para comprar" || !cart.destination?.includes("next=%2Fcheckout") || !returnPreserved || !signupReady || signup.next !== "/checkout" || !signup.name || !signup.copy) process.exitCode = 1;
