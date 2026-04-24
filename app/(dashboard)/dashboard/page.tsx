"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessionAndProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("nome, email, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error(error);
      }

      setProfile({
        nome: data?.nome ?? session.user.email ?? "Profissional",
        email: data?.email ?? session.user.email ?? null,
        avatar_url: data?.avatar_url ?? null,
      });

      setLoading(false);
    }

    loadSessionAndProfile();
  }, [router]);

  if (loading) {
    return <main className="dashboard-loading">Carregando Trimly...</main>;
  }

  return (
    <main className="dashboard-shell">
      <Sidebar />

      <section className="dashboard-main">
        <Header profile={profile} />

        <div className="dashboard-grid">
          <DashboardCard
            title="Atendimentos hoje"
            value="0"
            description="Nenhum atendimento agendado"
          />
          <DashboardCard
            title="Faturamento previsto"
            value="R$ 0,00"
            description="Baseado nos agendamentos do dia"
          />
          <DashboardCard
            title="Clientes do mês"
            value="0"
            description="Clientes cadastrados recentemente"
          />
          <DashboardCard
            title="Horários livres"
            value="--"
            description="Configure seu expediente"
          />
        </div>

        <div className="dashboard-content">
          <section className="panel large-panel">
            <div className="panel-header">
              <div>
                <h2>Agenda de hoje</h2>
                <p>Seus próximos horários aparecerão aqui.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => router.push("/agenda")}
              >
                Novo agendamento
              </button>
            </div>

            <div className="empty-state">
              <div>
                <h3>Nenhum agendamento para hoje</h3>
                <p>
                  Quando você criar um agendamento, ele aparecerá nesta área.
                </p>
              </div>
            </div>
          </section>

          <aside className="side-panels">
            <section className="panel">
              <h2>Próximos atendimentos</h2>
              <div className="mini-empty">Nenhum atendimento próximo.</div>
            </section>

            <section className="panel">
              <h2>Aniversariantes</h2>
              <div className="mini-empty">Nenhum aniversariante este mês.</div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
