"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, MapPinned, PackageCheck } from "lucide-react";
import { HardLink } from "@/components/hard-link";

type Banner = { desktop: string; mobile: string };
type Slide = { desktop: string; mobile: string; alt: string; campaign?: boolean };

const brazilCampaign: Slide = {
  desktop: "/assets/shopping-china/hero-brasil-v2-desktop.webp",
  mobile: "/assets/shopping-china/hero-brasil-v2-mobile.webp",
  alt: "Eletrônicos com envio Shopping China para todo o Brasil",
  campaign: true,
};

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const slides: Slide[] = [
    brazilCampaign,
    ...banners.map((_, index) => ({
      desktop: `/assets/shopping-china/hero-${index + 1}-desktop.webp`,
      mobile: `/assets/shopping-china/hero-${index + 1}-mobile.webp`,
      alt: `Destaque Shopping China ${index + 1}`,
    })),
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(interval);
  }, [slides.length]);

  function move(direction: number) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <section aria-label="Destaques Shopping China" aria-roledescription="carrossel" className="group relative overflow-hidden bg-[#00183f]">
      <div className="relative aspect-[4/3] w-full sm:aspect-[5/1]">
        {slides.map((slide, index) => (
          <article key={slide.desktop} aria-hidden={index !== active} className={`absolute inset-0 transition-opacity duration-700 ${index === active ? "z-10 opacity-100" : "pointer-events-none opacity-0"}`}>
            <picture className="absolute inset-0">
              <source media="(max-width: 639px)" srcSet={slide.mobile} />
              <img src={slide.desktop} alt={slide.alt} fetchPriority={index === 0 ? "high" : "auto"} className="h-full w-full object-cover object-center" />
            </picture>

            {slide.campaign ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-[#001438] via-[#001438]/75 to-transparent sm:via-[#001438]/50" />
                <div className="page-shell relative z-10 flex h-full items-center">
                  <div className="max-w-[58%] text-white sm:max-w-xl">
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.15em] text-[#ffd064] backdrop-blur-sm sm:px-3 sm:text-[10px]">
                      <MapPinned size={13} /> Uma nova experiência de compra
                    </p>
                    <h1 className="mt-2 text-[25px] font-bold leading-[1.03] tracking-[-.035em] drop-shadow-lg sm:text-3xl lg:text-[42px] xl:text-[46px]">
                      Agora enviamos<br /><span className="text-[#fcb92c]">para todo o Brasil</span>
                    </h1>
                    <p className="mt-2 hidden max-w-lg text-xs leading-5 text-white/78 lg:block">Eletrônicos originais, pagamento seguro via PIX e entrega no seu endereço em até 20 dias.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                      <HardLink href="/categoria/eletronicos" tabIndex={index === active ? 0 : -1} className="inline-flex items-center gap-2 rounded-full bg-[#bd0811] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_12px_32px_rgba(189,8,17,.35)] transition hover:-translate-y-0.5 hover:bg-[#d30a14] sm:px-5 sm:text-xs">
                        Comprar eletrônicos <ArrowRight size={17} />
                      </HardLink>
                      <span className="hidden items-center gap-2 text-xs font-semibold text-white/80 md:inline-flex"><PackageCheck size={18} className="text-[#fcb92c]" /> Frete a partir de R$ 49,90</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <button type="button" onClick={() => move(-1)} aria-label="Banner anterior" className="absolute bottom-4 right-16 z-30 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#00183f]/65 text-white opacity-0 backdrop-blur-sm transition hover:bg-[#00183f]/90 group-hover:opacity-100 sm:flex"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo banner" className="absolute bottom-4 right-4 z-30 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#00183f]/65 text-white opacity-0 backdrop-blur-sm transition hover:bg-[#00183f]/90 group-hover:opacity-100 sm:flex"><ChevronRight size={22} /></button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-4">{slides.map((_, index) => <button type="button" key={index} onClick={() => setActive(index)} aria-label={`Ir para banner ${index + 1}`} aria-current={index === active ? "true" : undefined} className={`h-2.5 rounded-full border border-white/25 shadow-sm transition-all ${index === active ? "w-8 bg-[#fcb92c]" : "w-2.5 bg-white/75 hover:bg-white"}`} />)}</div>
        </>
      ) : null}
    </section>
  );
}
