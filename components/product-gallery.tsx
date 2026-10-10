"use client";

import { useState } from "react";

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-square rounded-3xl bg-slate-100" />;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[82px_minmax(0,1fr)]">
      <div className="order-2 flex min-w-0 gap-2 overflow-x-auto lg:order-1 lg:flex-col">
        {images.map((image, index) => (
          <button key={image} type="button" onClick={() => setActive(index)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 ${active === index ? "border-[#bd0811]" : "border-slate-200"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={`${title} — imagem ${index + 1}`} className="h-full w-full object-contain" />
          </button>
        ))}
      </div>
      <div className="order-1 flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 lg:order-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={title} className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
