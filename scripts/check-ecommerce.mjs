const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4189";
const debugPort = process.env.CHROME_DEBUG_PORT ?? "9223";
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/produto/almofada-de-viagem-luxor-lx-m2er02b-preto-1040095`)}`, { method: "PUT" }).then((response) => response.json());
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
      // A full-document navigation briefly invalidates the previous execution context.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

await command("Page.enable");
await command("Runtime.enable");
await waitFor("document.readyState === 'complete' && !!document.querySelector('h1')");
await evaluate("localStorage.removeItem('shopping-china-brasil-cart-v1'); location.reload(); true");
await waitFor("document.readyState === 'complete' && !!document.querySelector('h1')");
await new Promise((resolve) => setTimeout(resolve, 800));

const productBefore = await evaluate(`({
  title: document.querySelector('h1')?.textContent?.trim(),
  imageLoaded: [...document.querySelectorAll('main img')].some(img => img.complete && img.naturalWidth > 0),
  hasAdd: [...document.querySelectorAll('button')].some(button => button.textContent.includes('Adicionar')),
  hasBuy: [...document.querySelectorAll('button')].some(button => button.textContent.includes('Comprar agora'))
})`);

await evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent.includes('Adicionar'))?.click(), true)`);
const drawerOpened = await waitFor("!!document.querySelector('[role=dialog][aria-label=\"Seu carrinho\"]')");
const drawerState = await evaluate(`({
  title: document.querySelector('[role=dialog][aria-label="Seu carrinho"] h2')?.textContent?.trim(),
  item: document.querySelector('[role=dialog][aria-label="Seu carrinho"] article')?.innerText?.slice(0, 160),
  stored: JSON.parse(localStorage.getItem('shopping-china-brasil-cart-v1') || '[]').length
})`);

await evaluate(`document.querySelector('[role=dialog][aria-label="Seu carrinho"] a[href="/carrinho"]')?.click(); true`);
const cartReady = await waitFor("location.pathname === '/carrinho' && document.body.innerText.includes('Resumo do pedido')");
const cartState = await evaluate(`({
  url: location.href,
  items: document.querySelectorAll('main article').length,
  hasAction: document.body.innerText.includes('Ir para o checkout'),
  subtotal: [...document.querySelectorAll('aside span')].map(node => node.textContent).find(text => text?.includes('R$'))
})`);

await evaluate(`location.assign('${baseUrl}/')`);
await waitFor("location.pathname === '/' && !!document.querySelector('input[type=search]')");
await new Promise((resolve) => setTimeout(resolve, 1200));
await evaluate(`(() => {
  const input = document.querySelector('input[type=search]');
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'airpods');
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'airpods' }));
  return input.value;
})()`);
const suggestionsReady = await waitFor("document.querySelectorAll('#catalog-search-results [role=option]').length > 0");
const suggestionState = await evaluate(`({
  count: document.querySelectorAll('#catalog-search-results [role=option]').length,
  first: document.querySelector('#catalog-search-results [role=option]')?.textContent?.trim()
})`);
await evaluate(`document.querySelector('form[role=search]').requestSubmit(); true`);
const searchPageReady = await waitFor("location.pathname === '/busca' && document.querySelectorAll('main a[href^=\"/produto/\"]').length > 0");
const searchState = await evaluate(`({
  url: location.href,
  heading: document.querySelector('main h2')?.textContent?.trim(),
  results: document.querySelectorAll('main a[href^="/produto/"]').length
})`);

const result = { productBefore, drawerOpened, drawerState, cartReady, cartState, suggestionsReady, suggestionState, searchPageReady, searchState };
console.log(JSON.stringify(result, null, 2));
socket.close();

if (!productBefore.imageLoaded || !productBefore.hasAdd || !productBefore.hasBuy || !drawerOpened || drawerState.stored < 1 || !cartReady || !cartState.hasAction || !suggestionsReady || !searchPageReady || searchState.results < 1) process.exitCode = 1;
