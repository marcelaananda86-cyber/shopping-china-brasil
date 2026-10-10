const target = await fetch("http://127.0.0.1:9223/json/new?http://127.0.0.1:4189/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let counter = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
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
  return result.result.value;
}

async function waitFor(check, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(check)) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

await command("Page.enable");
await command("Runtime.enable");
await waitFor("location.port === '4189' && document.readyState === 'complete' && document.querySelectorAll('a').length > 10");
await new Promise((resolve) => setTimeout(resolve, 1500));

const categoryHref = await evaluate("document.querySelectorAll('a')[2].getAttribute('href')");
await evaluate("document.querySelectorAll('a')[2].click(); true");
const categoryReady = await waitFor("location.pathname.startsWith('/categoria/') && document.querySelectorAll('.product-card').length > 0");
const categoryState = await evaluate("({url:location.href,title:document.querySelector('h1')?.textContent,cards:document.querySelectorAll('.product-card').length})");

if (!categoryReady) {
  console.log(JSON.stringify({ categoryHref, categoryState, anchors: await evaluate("[...document.querySelectorAll('a')].slice(0,20).map(a=>a.getAttribute('href'))"), body: await evaluate("document.body.innerText.slice(0, 500)") }, null, 2));
  socket.close();
  process.exit(1);
}

const productHref = await evaluate("document.querySelectorAll('.product-card')[0].getAttribute('href')");
await evaluate("document.querySelectorAll('.product-card')[0].click(); true");
const productReady = await waitFor("location.pathname.startsWith('/produto/') && !!document.querySelector('h1')");
const productState = await evaluate("({url:location.href,title:document.querySelector('h1')?.textContent,images:document.querySelectorAll('main img').length})");

console.log(JSON.stringify({ categoryHref, categoryState, productHref, productReady, productState }, null, 2));
socket.close();
