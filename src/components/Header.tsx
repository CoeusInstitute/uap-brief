"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import RadarMark from "@/components/RadarMark";

const links = [
  { href: "/", label: "Feed" },
  { href: "/people", label: "People" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/organizations", label: "Orgs" },
  { href: "/events", label: "Events" },
  { href: "/graph", label: "Graph" },
  { href: "/analytics", label: "Analytics" },
  { href: "/methodology", label: "Method" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-chrome sticky top-0 z-10">
      <div className="site-masthead">
        <Link href="/" className="site-brand" onClick={() => setOpen(false)}>
          <span style={{ color: "var(--accent-primary)" }}>
            <RadarMark />
          </span>
          <span className="g-heading">UAP Brief</span>
        </Link>
        <button
          type="button"
          className="g-button site-nav-toggle"
          data-size="sm"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="site-nav" className="site-nav" data-open={open ? "true" : undefined} aria-label="Primary">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
