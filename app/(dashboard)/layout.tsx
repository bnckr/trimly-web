import './dashboard/dashboard.css'
import './agenda/agenda.css'
import './clientes/clientes.css'
import './servicos/servicos.css'
import { ToastProvider } from "@/components/ui/toast-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}