"use client";

import { useEffect, useState } from "react";

type Banner = { desktop: string; mobile: string };

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % banners.length), 6500);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  return (
    <section className="relative overflow-hidden bg-slate-100">
      <div className="relative aspect-[4/3] w-full sm:aspect-[5/1]">
        {banners.map((banner, index) => (
          <picture key={banner.desktop} className={`absolute inset-0 transition-opacity duration-700 ${index === active ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <source media="(max-width: 639px)" srcSet={`/assets/shopping-china/hero-${index + 1}-mobile.webp`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/shopping-china/hero-${index + 1}-desktop.webp`} alt={`Destaque Shopping China ${index + 1}`} className="h-full w-full object-cover" />
          </picture>
        ))}
      </div>
      {banners.length > 1 ? <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">{banners.map((_, index) => <button key={index} onClick={() => setActive(index)} aria-label={`Ir para banner ${index + 1}`} className={`h-2.5 rounded-full transition-all ${index === active ? "w-8 bg-[#fcb92c]" : "w-2.5 bg-white/75"}`} />)}</div> : null}
    </section>
  );
}
