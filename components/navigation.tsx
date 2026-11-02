"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return <nav aria-label="主导航">{links.map((link) => <Link key={link.href} href={link.href}
    aria-current={(link.href === "/" ? pathname === "/" : pathname.startsWith(link.href.replace(/\/$/, ""))) ? "page" : undefined}>
    {link.label}
  </Link>)}</nav>;
}
