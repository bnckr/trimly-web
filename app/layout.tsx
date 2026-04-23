import './globals.css'
import '../lib/fontawesome'

export const metadata = {
  title: 'Trimly',
  description: 'Smart scheduling platform for beauty professionals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}