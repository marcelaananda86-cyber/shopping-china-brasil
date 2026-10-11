const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4189";

const cases = [
  { cep: "85851000", city: "Foz do Iguaçu", state: "PR", price: 49.9 },
  { cep: "01001000", city: "São Paulo", state: "SP", price: 79.9 },
  { cep: "69005010", city: "Manaus", state: "AM", price: 94.9 },
];

const results = [];
for (const expected of cases) {
  const response = await fetch(`${baseUrl}/api/cep/${expected.cep}`);
  const data = await response.json();
  results.push({ status: response.status, ...data });
  if (!response.ok || data.city !== expected.city || data.state !== expected.state || data.shippingPrice !== expected.price) process.exitCode = 1;
}

const invalid = await fetch(`${baseUrl}/api/cep/123`);
if (invalid.status !== 400) process.exitCode = 1;

console.log(JSON.stringify({ results, invalidStatus: invalid.status }, null, 2));
