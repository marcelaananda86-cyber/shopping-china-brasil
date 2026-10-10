# Arquitetura de produção — Shopping China Brasil

## Decisão

O Supabase PostgreSQL será a fonte oficial de catálogo, contas e pedidos. O site-base não será consultado durante cada visita do cliente. Uma Edge Function consulta as páginas de origem a cada 15 minutos, valida preço, disponibilidade e identificadores e grava uma fotografia consistente no banco.

Fluxo:

1. `sync-catalog` consulta lotes de até 100 produtos vencidos.
2. A função valida JSON-LD, preço, moeda, disponibilidade e imagem.
3. O registro é atualizado de forma atômica em `products`.
4. Página do produto, carrinho, checkout, dados estruturados e feed Merchant leem o mesmo registro.
5. Em erro, o último preço válido permanece e o produto entra em nova tentativa após 5 minutos.
6. Produtos sem imagem, sem preço válido ou indisponíveis não ficam ativos no feed.

## Por que não consultar o site-base no navegador

- Evita CORS, lentidão e dependência da disponibilidade do site-base.
- Impede que Googlebot, cliente e checkout recebam preços diferentes.
- Mantém histórico de sincronização e permite retirar rapidamente ofertas problemáticas.
- Permite gerar o feed Merchant a partir da mesma fonte exibida na página.

## Supabase

- Aplicar `supabase/migrations/20261010150000_commerce_core.sql`.
- Publicar `supabase/functions/sync-catalog`.
- Agendar a função no Supabase Cron a cada 15 minutos.
- Configurar Auth por e-mail e senha, confirmação de e-mail e SMTP próprio.
- Configurar no site `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Nunca colocar a service role no site; ela fica apenas na Edge Function.

## Corte para produção

Enquanto o catálogo não estiver 100% carregado, o site pode usar o catálogo atual como fallback. Depois da carga e conferência, definir `CATALOG_SUPABASE_REQUIRED=true`. A partir daí, um produto ausente ou vencido no Supabase não deve ser anunciado nem vendido.

## Google Merchant

- Gerar feed somente com `active=true`, preço em BRL, estoque e URL individual.
- Manter GTIN real quando existir; não inventar GTIN ou MPN.
- Renderizar preço e disponibilidade no HTML inicial e em JSON-LD.
- Configurar atualizações automáticas de itens no Merchant Center.
- Sincronizar frete de até 20 dias e política de devolução com o site.
- Só ativar campanhas depois de checkout próprio, pagamento convencional, políticas públicas e dados legais completos.
