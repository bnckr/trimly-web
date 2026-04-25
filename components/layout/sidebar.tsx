"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agenda", href: "/agenda" },
  { label: "Expediente", href: "/configuracoes/expediente" },
  { label: "Clientes", href: "/clientes" },
  { label: "Serviços", href: "/servicos" },
  { label: "Cupons", href: "/cupons" },
  { label: "Relatórios", href: "/relatorios" },
  { label: "Perfil", href: "/perfil" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-mobile-header">
          <div className="sidebar-logo">
            <img src="/logo/trimly-logo-giant.png" alt="Trimly" />
          </div>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <span className="sidebar-indicator" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}