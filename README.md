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

## Build

```bash
npm run build
```

Carrinho, checkout, estoque transacional, cálculo tributário e políticas da operação brasileira ficam isolados desta camada de catálogo para a próxima etapa.
