'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agenda', href: '/agenda' },
  { label: 'Clientes', href: '/clientes' },
  { label: 'Serviços', href: '/servicos' },
  { label: 'Cupons', href: '/cupons' },
  { label: 'Relatórios', href: '/relatorios' },
  { label: 'Perfil', href: '/perfil' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo/trimly-logo-giant.png" alt="Trimly" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-indicator" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}