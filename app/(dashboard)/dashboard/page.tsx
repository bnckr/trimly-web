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

type DashboardStats = {
  atendimentosHoje: number;
  faturamentoPrevisto: number;
  clientesMes: number;
  horariosBloqueados: number;
};

type AgendaItem = {
  id: string;
  tipo_evento: "agendamento" | "bloqueio";
  data_referencia: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  servico_nome: string | null;
  valor_final: number | null;
  motivo_bloqueio: string | null;
};

type BirthdayClient = {
  id: string;
  nome: string;
  telefone: string;
  data_nascimento: string;
};

type Professional = {
  id: string;
  nome: string;
};

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function formatDateBR(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getDateRange(
  dateString: string,
  type: "dia" | "semana" | "mes" | "ano",
) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (type === "dia") return { start: dateString, end: dateString };

  if (type === "semana") {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
      start: start.toLocaleDateString("en-CA"),
      end: end.toLocaleDateString("en-CA"),
    };
  }

  if (type === "mes") {
    return {
      start: new Date(year, month - 1, 1).toLocaleDateString("en-CA"),
      end: new Date(year, month, 0).toLocaleDateString("en-CA"),
    };
  }

  return {
    start: new Date(year, 0, 1).toLocaleDateString("en-CA"),
    end: new Date(year, 11, 31).toLocaleDateString("en-CA"),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    atendimentosHoje: 0,
    faturamentoPrevisto: 0,
    clientesMes: 0,
    horariosBloqueados: 0,
  });
  const [agendaHoje, setAgendaHoje] = useState<AgendaItem[]>([]);
  const [aniversariantes, setAniversariantes] = useState<BirthdayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filterType, setFilterType] = useState<
    "dia" | "semana" | "mes" | "ano"
  >("dia");

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const professionalId = selectedProfessionalId || session.user.id;
      const range = getDateRange(selectedDate, filterType);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome, email, avatar_url")
        .eq("id", session.user.id)
        .single();

      setProfile({
        nome: profileData?.nome ?? session.user.email ?? "Profissional",
        email: profileData?.email ?? session.user.email ?? null,
        avatar_url: profileData?.avatar_url ?? null,
      });

      const { data: professionalsData } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      setProfessionals((professionalsData ?? []) as Professional[]);

      if (!selectedProfessionalId) {
        setSelectedProfessionalId(session.user.id);
      }

      const { data: appointmentsToday } = await supabase
        .from("appointments")
        .select("id, status, valor_final")
        .eq("profissional_id", professionalId)
        .gte("data_agendamento", range.start)
        .lte("data_agendamento", range.end);

      const { data: agendaData } = await supabase
        .from("v_agenda_unificada")
        .select("*")
        .eq("profissional_id", professionalId)
        .gte("data_referencia", range.start)
        .lte("data_referencia", range.end)
        .order("data_referencia", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const { data: clientsMonth } = await supabase
        .from("clients")
        .select("id, created_at")
        .gte("created_at", `${range.start}T00:00:00`)
        .lte("created_at", `${range.end}T23:59:59`);

      const { data: blockedToday } = await supabase
        .from("schedule_blocks")
        .select("id")
        .eq("profissional_id", professionalId)
        .gte("data_bloqueio", range.start)
        .lte("data_bloqueio", range.end);

      const { data: birthdayClients } = await supabase
        .from("v_clientes_aniversariantes_mes")
        .select("id, nome, telefone, data_nascimento")
        .limit(6);

      const validAppointments = (appointmentsToday ?? []).filter((item) =>
        ["agendado", "confirmado", "em_atendimento", "finalizado"].includes(
          item.status,
        ),
      );

      const faturamentoPrevisto = validAppointments.reduce(
        (total, item) => total + Number(item.valor_final ?? 0),
        0,
      );

      setStats({
        atendimentosHoje: validAppointments.length,
        faturamentoPrevisto,
        clientesMes: clientsMonth?.length ?? 0,
        horariosBloqueados: blockedToday?.length ?? 0,
      });

      setAgendaHoje((agendaData ?? []) as AgendaItem[]);
      setAniversariantes((birthdayClients ?? []) as BirthdayClient[]);
      setLoading(false);
    }

    loadDashboard();
  }, [router, selectedProfessionalId, selectedDate, filterType]);

  function getPeriodLabel() {
    if (filterType === "dia") return "do dia";
    if (filterType === "semana") return "da semana";
    if (filterType === "mes") return "do mês";
    return "do ano";
  }

  function getSelectedProfessionalName() {
    return (
      professionals.find(
        (professional) => professional.id === selectedProfessionalId,
      )?.nome ?? "Profissional"
    );
  }

  if (loading) {
    return <main className="dashboard-loading">Carregando Trimly...</main>;
  }

  function formatDateShortBR(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function formatDateFullBR(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("pt-BR");
  }

  function groupAgendaByDate(items: AgendaItem[]) {
    return items.reduce<Record<string, AgendaItem[]>>((acc, item) => {
      const date = item.data_referencia;

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(item);
      return acc;
    }, {});
  }

  return (
    <main className="dashboard-shell">
      <Sidebar />

      <section className="dashboard-main">
        <Header profile={profile} />

        <div className="dashboard-filter-card">
          <div>
            <p className="dashboard-filter-label">Visão geral</p>
            <h2>Resumo {getPeriodLabel()}</h2>
            <span className="dashboard-filter-context">
              {getSelectedProfessionalName()} · {formatDateBR(selectedDate)}
            </span>
          </div>

          <div className="dashboard-filter-actions">
            <select
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
            >
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.nome}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(
                  e.target.value as "dia" | "semana" | "mes" | "ano",
                )
              }
            >
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="ano">Ano</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <button type="button" onClick={() => router.push("/agenda")}>
              Ver agenda
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <DashboardCard
            title={`Atendimentos ${getPeriodLabel()}`}
            value={String(stats.atendimentosHoje)}
            description="Agendados, confirmados ou finalizados"
          />
          <DashboardCard
            title="Faturamento previsto"
            value={formatCurrency(stats.faturamentoPrevisto)}
            description={`Baseado nos agendamentos ${getPeriodLabel()}`}
          />
          <DashboardCard
            title={`Clientes ${getPeriodLabel()}`}
            value={String(stats.clientesMes)}
            description="Novos clientes cadastrados"
          />
          <DashboardCard
            title={`Horários bloqueados ${getPeriodLabel()}`}
            value={String(stats.horariosBloqueados)}
            description={`Bloqueios cadastrados ${getPeriodLabel()}`}
          />
        </div>

        <div className="dashboard-content">
          <section className="panel large-panel">
            <div className="panel-header">
              <div>
                <h2>Agenda {getPeriodLabel()}</h2>
                <p>
                  {filterType === "dia"
                    ? `Resumo do dia ${formatDateFullBR(selectedDate)}.`
                    : `${filterType === "semana" ? "Semana" : filterType === "mes" ? "Período do mês" : "Período do ano"} de ${formatDateFullBR(getDateRange(selectedDate, filterType).start)} até ${formatDateFullBR(getDateRange(selectedDate, filterType).end)}.`}
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => router.push("/agenda")}
              >
                Novo agendamento
              </button>
            </div>

            {agendaHoje.length === 0 ? (
              <div className="empty-state">
                <div>
                  <h3>Nenhum agendamento para hoje</h3>
                  <p>
                    Quando você criar um agendamento, ele aparecerá nesta área.
                  </p>
                </div>
              </div>
            ) : (
              <div className="dashboard-agenda-list">
                {filterType === "dia"
                  ? agendaHoje.slice(0, 5).map((item) => (
                      <div className="dashboard-agenda-item" key={item.id}>
                        <div>
                          <strong>
                            {item.hora_inicio.slice(0, 5)} -{" "}
                            {item.hora_fim.slice(0, 5)}
                          </strong>
                          <p>
                            {item.tipo_evento === "bloqueio"
                              ? (item.motivo_bloqueio ?? "Horário bloqueado")
                              : `${item.cliente_nome} · ${item.servico_nome}`}
                          </p>
                        </div>

                        <span>{item.status}</span>
                      </div>
                    ))
                  : Object.entries(groupAgendaByDate(agendaHoje)).map(
                      ([date, items]) => (
                        <div className="dashboard-agenda-day-group" key={date}>
                          <h3>Dia {formatDateShortBR(date)}</h3>

                          <div className="dashboard-agenda-day-list">
                            {items.map((item) => (
                              <div
                                className="dashboard-agenda-item compact"
                                key={item.id}
                              >
                                <div>
                                  <strong>
                                    {item.hora_inicio.slice(0, 5)} -{" "}
                                    {item.hora_fim.slice(0, 5)}
                                  </strong>

                                  <p>
                                    {item.tipo_evento === "bloqueio"
                                      ? (item.motivo_bloqueio ??
                                        "Horário bloqueado")
                                      : `${item.cliente_nome} · ${item.servico_nome}`}
                                  </p>
                                </div>

                                {item.valor_final !== null ? (
                                  <span>
                                    {formatCurrency(Number(item.valor_final))}
                                  </span>
                                ) : (
                                  <span>{item.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
              </div>
            )}
          </section>

          <aside className="side-panels">
            <section className="panel">
              <h2>Próximos atendimentos</h2>

              {agendaHoje.filter((item) => item.tipo_evento === "agendamento")
                .length === 0 ? (
                <div className="mini-empty">Nenhum atendimento próximo.</div>
              ) : (
                <div className="mini-list">
                  {agendaHoje
                    .filter((item) => item.tipo_evento === "agendamento")
                    .slice(0, 4)
                    .map((item) => (
                      <div className="mini-item" key={item.id}>
                        <strong>{item.hora_inicio.slice(0, 5)}</strong>
                        <span>{item.cliente_nome}</span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="panel">
              <h2>Aniversariantes</h2>

              {aniversariantes.length === 0 ? (
                <div className="mini-empty">
                  Nenhum aniversariante este mês.
                </div>
              ) : (
                <div className="mini-list">
                  {aniversariantes.map((client) => (
                    <div className="mini-item" key={client.id}>
                      <strong>{client.nome}</strong>
                      <span>{client.telefone}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
