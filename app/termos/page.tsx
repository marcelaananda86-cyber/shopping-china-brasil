import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
export const metadata: Metadata = { title: "Termos de uso e compra" };
export default function Page() { return <PolicyPage eyebrow="Condições gerais" title="Termos de uso e compra" intro="Estes termos regulam o uso da loja Shopping China Brasil e a contratação de produtos destinados à entrega no Brasil." sections={[
  { title: "Identificação e atendimento", paragraphs: ["A operação utiliza a marca Shopping China Importados, da VENTURIO S.A. Atendimento: sac@shoppingchinacde.com.py, +595 61 597 7000 e WhatsApp +595 981 701 701. Endereço de origem: Avda. Luis Maria Argaña, Shopping China Importados, Ciudad del Este, Paraguai."] },
  { title: "Catálogo, preço e estoque", paragraphs: ["Preços são exibidos em reais e sincronizados com a base comercial. A confirmação do pedido depende da disponibilidade registrada no checkout. Erros evidentes de preço ou indisponibilidade serão comunicados antes da cobrança, com possibilidade de cancelamento sem custo."] },
  { title: "Compra e pagamento", paragraphs: ["Antes da confirmação, o cliente poderá revisar produtos, quantidade, endereço, frete, prazo e total. Acima da cota de US$ 500 de referência, somente uma unidade de um produto é aceita por pedido, com possibilidade de PIX em lotes conforme exibido no carrinho."] },
  { title: "Entrega e pós-venda", paragraphs: ["A entrega ocorrerá em até 20 dias corridos após a confirmação do pagamento. Trocas, devoluções, garantias e reembolsos seguem as políticas específicas publicadas e a legislação aplicável ao consumidor no Brasil."] },
  { title: "Conta do cliente", paragraphs: ["O cliente é responsável por informar dados verdadeiros e proteger suas credenciais. Pedidos e informações pessoais só podem ser acessados pelo titular autenticado. Tentativas de fraude, automação abusiva ou uso indevido poderão resultar em bloqueio e preservação de registros."] },
]} />; }
