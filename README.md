# Shopping China Brasil

Nova base do catálogo Shopping China preparada para a futura operação de compra e entrega no Brasil.

## Estrutura

- `app/page.tsx`: home com banners, setores e vitrines.
- `app/categoria/[...slug]`: categorias e subcategorias paginadas.
- `app/produto/[slug]`: detalhe completo do produto.
- `components/`: cabeçalho, menu, cards, galeria e rodapé.
- `lib/shopping-china.ts`: adaptador do catálogo público atual.
- `public/data/catalog-index.json`: índice pesquisável com 27.134 produtos.
- `scripts/sync-shopping-china.mjs`: sincroniza índice, categorias, banners e assets.

## Atualização do espelho

```bash
node scripts/sync-shopping-china.mjs
```

## Desenvolvimento

```bash
npm run dev
```

O servidor local abre em `http://localhost:5173`.

## Build

```bash
npm run build
```

## Deploy no Netlify

O projeto usa Next.js nativo e o adaptador OpenNext que o Netlify aplica
automaticamente. As configurações de build estão versionadas em `netlify.toml`.

1. Importe o repositório no Netlify.
2. Cadastre em **Project configuration > Environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` com a URL pública final, sem barra no fim
   - `CATALOG_SUPABASE_REQUIRED` (`false` enquanto o catálogo ainda usa fallback)
3. Faça o deploy. O Netlify executará `npm run build` e publicará `.next`.

Para autenticação, configure no Supabase:

- **Site URL:** o domínio público final.
- **Site URL de produção:** `https://shoppingchinabrasil.com`.
- **Redirect URL de produção:** `https://shoppingchinabrasil.com/auth/confirm`.
- **Redirect de desenvolvimento:** `http://localhost:5173/**`.
- **Deploy previews do Netlify:** `https://**--NOME-DO-SITE.netlify.app/**`.

No cliente OAuth do Google, a URI de retorno é sempre a callback exibida na
tela do provedor Google no Supabase, no formato
`https://SEU-PROJETO.supabase.co/auth/v1/callback`.

Carrinho, checkout, estoque transacional, cálculo tributário e políticas da operação brasileira ficam isolados desta camada de catálogo para a próxima etapa.
