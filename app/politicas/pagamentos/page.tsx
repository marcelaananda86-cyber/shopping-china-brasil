import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
export const metadata: Metadata = { title: "Pagamentos e segurança" };
export default function Page() { return <PolicyPage eyebrow="Compra segura" title="Pagamentos e segurança" intro="O valor apresentado no produto, no carrinho e na finalização deve permanecer consistente. Custos adicionais são informados antes da confirmação." sections={[
  { title: "Conta obrigatória", paragraphs: ["Para proteger os dados do comprador, registrar o histórico e permitir o acompanhamento da entrega, a finalização de qualquer compra exige uma conta autenticada. O cliente pode criar a conta com e-mail e senha ou continuar com Google."] },
  { title: "Pedidos dentro da cota", paragraphs: ["Pedidos de até US$ 500 de referência seguem com o meio de pagamento selecionado no checkout, após confirmação de preço, estoque, frete e encargos aplicáveis."] },
  { title: "Produto único acima da cota", paragraphs: ["Acima de US$ 500, o pedido só pode conter uma unidade de um único produto. O pagamento pode ser organizado em lotes de PIX de até R$ 2.000, sem alterar o valor total do pedido, da nota ou da declaração. Dois produtos ou duas unidades acima da cota devem ser comprados em pedidos separados."] },
  { title: "Confirmação e segurança", items: ["O pedido é confirmado somente após aprovação integral do pagamento.", "Nunca solicitamos senha bancária ou código de segurança por mensagem.", "Dados de conta e pedidos são protegidos por autenticação e regras de acesso individual no Supabase.", "Em caso de divergência, não pague e contate os canais oficiais."] },
]} />; }
