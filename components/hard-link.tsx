"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

type HardLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function HardLink({ href, onClick, children, ...props }: HardLinkProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    window.location.assign(href);
  }

  return <a href={href} onClick={navigate} {...props}>{children}</a>;
}
