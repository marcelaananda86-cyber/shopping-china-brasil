import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
export const metadata: Metadata = { title: "Pagamentos e segurança", alternates: { canonical: "/politicas/pagamentos" } };
export default function Page() { return <PolicyPage eyebrow="Compra segura" title="Pagamentos e segurança" intro="O valor apresentado no produto, no carrinho e na finalização deve permanecer consistente. Custos adicionais são informados antes da confirmação." sections={[
  { title: "Compra sem cadastro", paragraphs: ["O cliente pode finalizar a compra informando nome, e-mail, telefone, CPF e endereço no checkout, sem precisar criar uma conta. Entrar com e-mail ou Google é opcional e facilita o preenchimento e o acompanhamento do histórico."] },
  { title: "Pedidos dentro da cota", paragraphs: ["Pedidos de até US$ 500 de referência seguem com o meio de pagamento selecionado no checkout, após confirmação de preço, estoque, frete e encargos aplicáveis."] },
  { title: "Produto único acima da cota", paragraphs: ["Acima de US$ 500, o pedido só pode conter uma unidade de um único produto. O pagamento pode ser organizado em lotes de PIX de até R$ 2.000, sem alterar o valor total do pedido, da nota ou da declaração. Dois produtos ou duas unidades acima da cota devem ser comprados em pedidos separados."] },
  { title: "Confirmação e segurança", items: ["O pedido é confirmado somente após aprovação integral do pagamento.", "Nunca solicitamos senha bancária ou código de segurança por mensagem.", "Dados pessoais e pedidos são protegidos por controles de acesso e comunicação criptografada.", "Em caso de divergência, não pague e contate os canais oficiais."] },
]} />; }
