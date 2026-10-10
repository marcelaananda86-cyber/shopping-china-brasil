import { ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import { HardLink } from "@/components/hard-link";

export function SiteFooter() {
  return (
    <footer id="contato" className="mt-16 bg-[#001a46] text-white">
      <div className="border-b border-white/10 bg-[#bd0811]">
        <div className="page-shell flex flex-col items-center justify-between gap-2 py-3 text-center text-sm font-semibold sm:flex-row sm:text-left">
          <span>Catálogo oficial do Shopping China — filial Ciudad del Este</span>
          <span>Entrega no Brasil em até 20 dias</span>
        </div>
      </div>
      <div className="page-shell grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/shopping-china/logo-footer.webp" alt="Shopping China" className="h-14 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">Há mais de 90 anos conectando pessoas às melhores marcas do mundo.</p>
        </div>
        <div>
          <h3 className="footer-title">Atendimento</h3>
          <div className="mt-4 space-y-3 text-sm text-white/75">
            <a href="https://api.whatsapp.com/send?phone=595981701701" target="_blank" rel="noreferrer" className="footer-link"><MessageCircle size={17} /> WhatsApp</a>
            <a href="tel:+595981701701" className="footer-link"><Phone size={17} /> +595 981 701 701</a>
            <p className="footer-link"><MapPin size={17} /> Ciudad del Este, Paraguai</p>
          </div>
        </div>
        <div>
          <h3 className="footer-title">Institucional</h3>
          <div className="mt-4 grid gap-2 text-sm text-white/75">
            <a href="https://www.shoppingchina.com.br/institucional-br" target="_blank" rel="noreferrer" className="hover:text-white">Sobre o Shopping China</a>
            <a href="https://www.shoppingchina.com.br/sc-blogs" target="_blank" rel="noreferrer" className="hover:text-white">Blog</a>
            <a href="https://www.shoppingchina.com.br/baixar-app" target="_blank" rel="noreferrer" className="hover:text-white">Aplicativo</a>
            <HardLink href="/contato" className="hover:text-white">Contato</HardLink>
          </div>
        </div>
        <div>
          <h3 className="footer-title">Políticas</h3>
          <div className="mt-4 grid gap-2 text-sm text-white/75">
            <HardLink href="/politicas/entrega" className="hover:text-white">Entrega</HardLink>
            <HardLink href="/politicas/trocas-e-devolucoes" className="hover:text-white">Trocas e reembolsos</HardLink>
            <HardLink href="/politicas/privacidade" className="hover:text-white">Privacidade</HardLink>
            <HardLink href="/politicas/pagamentos" className="hover:text-white">Pagamentos</HardLink>
            <HardLink href="/termos" className="hover:text-white">Termos de uso</HardLink>
          </div>
          <h3 className="footer-title mt-7">Acompanhe</h3>
          <a href="https://www.instagram.com/shoppingchinaparaguay/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm hover:bg-white hover:text-[#002055]"><ExternalLink size={18} /> Instagram</a>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">© {new Date().getFullYear()} Shopping China Brasil. Todos os direitos reservados.</div>
    </footer>
  );
}
