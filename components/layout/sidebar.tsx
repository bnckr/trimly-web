import Link from 'next/link'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agenda', href: '/agenda' },
  { label: 'Clientes', href: '/clientes' },
  { label: 'Serviços', href: '/servicos' },
  { label: 'Cupons', href: '/cupons' },
  { label: 'Relatórios', href: '/relatorios' },
  { label: 'Perfil', href: '/perfil' },
  { label: 'Configurações', href: '/configuracoes' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo/trimly-logo-giant.png" alt="Trimly" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="sidebar-link">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}