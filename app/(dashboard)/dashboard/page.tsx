"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const APPOINTMENT_ACTIVE_STATUSES = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "finalizado",
];

const APPOINTMENT_UPCOMING_EXCLUDED_STATUSES = [
  "finalizado",
  "cancelado",
  "faltou",
];

type PeriodFilter = "dia" | "semana" | "mes" | "ano";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

type DashboardStats = {
  atendimentosPeriodo: number;
  faturamentoPrevisto: number;
  faturamentoLiquidoDia: number;
  clientesPeriodo: number;
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
  aniversario_dia: number;
  cupom_usado: boolean;
};

type Professional = {
  id: string;
  nome: string;
};

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function getMonthFromDate(dateString: string) {
  return Number(dateString.split("-")[1]);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateBR(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

function getDateRange(dateString: string, type: PeriodFilter) {
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

function groupAgendaByDate(items: AgendaItem[]) {
  return items.reduce<Record<string, AgendaItem[]>>((acc, item) => {
    const date = item.data_referencia;

    if (!acc[date]) acc[date] = [];

    acc[date].push(item);
    return acc;
  }, {});
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    atendimentosPeriodo: 0,
    faturamentoPrevisto: 0,
    faturamentoLiquidoDia: 0,
    clientesPeriodo: 0,
    horariosBloqueados: 0,
  });
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [aniversariantes, setAniversariantes] = useState<BirthdayClient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filterType, setFilterType] = useState<PeriodFilter>("dia");
  const [loading, setLoading] = useState(true);

  const range = useMemo(
    () => getDateRange(selectedDate, filterType),
    [selectedDate, filterType],
  );

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const professionalId = selectedProfessionalId || session.user.id;

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

      const [
        appointmentsPeriodResult,
        finishedDayAppointmentsResult,
        agendaResult,
        clientsPeriodResult,
        blocksPeriodResult,
        allClientsResult,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, status, valor_final")
          .eq("profissional_id", professionalId)
          .gte("data_agendamento", range.start)
          .lte("data_agendamento", range.end),
        supabase
          .from("appointments")
          .select("id")
          .eq("profissional_id", professionalId)
          .eq("data_agendamento", selectedDate)
          .eq("status", "finalizado"),
        supabase
          .from("v_agenda_unificada")
          .select("*")
          .eq("profissional_id", professionalId)
          .gte("data_referencia", range.start)
          .lte("data_referencia", range.end)
          .order("data_referencia", { ascending: true })
          .order("hora_inicio", { ascending: true }),
        supabase
          .from("clients")
          .select("id, created_at")
          .gte("created_at", `${range.start}T00:00:00`)
          .lte("created_at", `${range.end}T23:59:59`),
        supabase
          .from("schedule_blocks")
          .select("id")
          .eq("profissional_id", professionalId)
          .gte("data_bloqueio", range.start)
          .lte("data_bloqueio", range.end),
        supabase
          .from("clients")
          .select("id, nome, telefone, data_nascimento")
          .eq("ativo", true)
          .not("data_nascimento", "is", null),
      ]);

      const finishedDayAppointmentIds = (
        finishedDayAppointmentsResult.data ?? []
      ).map((appointment) => appointment.id);

      let faturamentoLiquidoDia = 0;

      if (finishedDayAppointmentIds.length > 0) {
        const { data: selectedPayments } = await supabase
          .from("appointment_payments")
          .select("valor_liquido_colaborador")
          .in("appointment_id", finishedDayAppointmentIds);

        faturamentoLiquidoDia = (selectedPayments ?? []).reduce(
          (total, item) => total + Number(item.valor_liquido_colaborador ?? 0),
          0,
        );
      }

      const appointmentsPeriod = appointmentsPeriodResult.data ?? [];
      const validAppointments = appointmentsPeriod.filter((item) =>
        APPOINTMENT_ACTIVE_STATUSES.includes(item.status),
      );

      const faturamentoPrevisto = validAppointments.reduce(
        (total, item) => total + Number(item.valor_final ?? 0),
        0,
      );

      const currentMonth = getMonthFromDate(selectedDate);
      const birthdayClients = (allClientsResult.data ?? []).filter((client) => {
        const month = Number(client.data_nascimento?.split("-")[1]);
        return month === currentMonth;
      });

      const birthdayClientIds = birthdayClients.map((client) => client.id);
      const { data: usedBirthdayCoupons } =
        birthdayClientIds.length > 0
          ? await supabase
              .from("coupon_usages")
              .select("cliente_id")
              .in("cliente_id", birthdayClientIds)
          : { data: [] };

      const usedBirthdayCouponClientIds = new Set(
        (usedBirthdayCoupons ?? []).map((item) => item.cliente_id),
      );

      const birthdaysWithCoupon = birthdayClients
        .map((client) => ({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_nascimento: client.data_nascimento,
          aniversario_dia: Number(client.data_nascimento.split("-")[2]),
          cupom_usado: usedBirthdayCouponClientIds.has(client.id),
        }))
        .sort((a, b) => a.aniversario_dia - b.aniversario_dia);

      setStats({
        atendimentosPeriodo: validAppointments.length,
        faturamentoPrevisto,
        faturamentoLiquidoDia,
        clientesPeriodo: clientsPeriodResult.data?.length ?? 0,
        horariosBloqueados: blocksPeriodResult.data?.length ?? 0,
      });

      setAgendaItems((agendaResult.data ?? []) as AgendaItem[]);
      setAniversariantes(birthdaysWithCoupon);
      setLoading(false);
    }

    loadDashboard();
  }, [router, selectedProfessionalId, selectedDate, filterType, range.start, range.end]);

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

  const upcomingAppointments = agendaItems.filter(
    (item) =>
      item.tipo_evento === "agendamento" &&
      !APPOINTMENT_UPCOMING_EXCLUDED_STATUSES.includes(item.status),
  );

  if (loading) return <LoadingSpinner />;

  return (
    <main className="dashboard-shell">
      <Sidebar />

      <section className="dashboard-main">
        <Header profile={profile} />

        <section className="dashboard-filter-card">
          <div className="dashboard-filter-copy">
            <p className="dashboard-filter-label">Visão geral</p>
            <h2>Resumo {getPeriodLabel()}</h2>
            <span className="dashboard-filter-context">
              {getSelectedProfessionalName()} · {formatDateBR(selectedDate)}
            </span>
          </div>

          <div className="dashboard-filter-actions">
            <select
              value={selectedProfessionalId}
              onChange={(event) => setSelectedProfessionalId(event.target.value)}
              aria-label="Selecionar profissional"
            >
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.nome}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as PeriodFilter)}
              aria-label="Selecionar período"
            >
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="ano">Ano</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              aria-label="Selecionar data"
            />

            <button type="button" onClick={() => router.push("/agenda")}>
              Ver agenda
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <DashboardCard
            title={`Atendimentos ${getPeriodLabel()}`}
            value={String(stats.atendimentosPeriodo)}
            description="Agendados, confirmados, em atendimento ou finalizados"
          />

          <DashboardCard
            title="Faturamento previsto"
            value={formatCurrency(stats.faturamentoPrevisto)}
            description={`Baseado nos agendamentos ${getPeriodLabel()}`}
          />

          <DashboardCard
            title="Faturamento líquido do dia"
            value={formatCurrency(stats.faturamentoLiquidoDia)}
            description="Valor recebido após descontos e taxas"
          />

          <DashboardCard
            title={`Clientes ${getPeriodLabel()}`}
            value={String(stats.clientesPeriodo)}
            description="Novos clientes cadastrados"
          />

          <DashboardCard
            title={`Horários bloqueados ${getPeriodLabel()}`}
            value={String(stats.horariosBloqueados)}
            description={`Bloqueios cadastrados ${getPeriodLabel()}`}
          />
        </section>

        <div className="dashboard-content">
          <section className="panel large-panel">
            <div className="panel-header">
              <div>
                <h2>Agenda {getPeriodLabel()}</h2>
                <p>
                  {filterType === "dia"
                    ? `Resumo do dia ${formatDateFullBR(selectedDate)}.`
                    : `${
                        filterType === "semana"
                          ? "Semana"
                          : filterType === "mes"
                            ? "Período do mês"
                            : "Período do ano"
                      } de ${formatDateFullBR(range.start)} até ${formatDateFullBR(range.end)}.`}
                </p>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => router.push("/agenda")}
              >
                Novo agendamento
              </button>
            </div>

            {agendaItems.length === 0 ? (
              <div className="empty-state">
                <div>
                  <h3>Nenhum agendamento encontrado</h3>
                  <p>Quando você criar um agendamento, ele aparecerá nesta área.</p>
                </div>
              </div>
            ) : (
              <div className="dashboard-agenda-list">
                {filterType === "dia"
                  ? agendaItems.slice(0, 5).map((item) => (
                      <div className="dashboard-agenda-item" key={item.id}>
                        <div>
                          <strong>
                            {item.hora_inicio.slice(0, 5)} - {" "}
                            {item.hora_fim.slice(0, 5)}
                          </strong>
                          <p>
                            {item.tipo_evento === "bloqueio"
                              ? item.motivo_bloqueio ?? "Horário bloqueado"
                              : `${item.cliente_nome} · ${item.servico_nome}`}
                          </p>
                        </div>

                        <span>
                          {item.tipo_evento === "bloqueio" ? "bloqueio" : item.status}
                        </span>
                      </div>
                    ))
                  : Object.entries(groupAgendaByDate(agendaItems)).map(
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
                                    {item.hora_inicio.slice(0, 5)} - {" "}
                                    {item.hora_fim.slice(0, 5)}
                                  </strong>

                                  <p>
                                    {item.tipo_evento === "bloqueio"
                                      ? item.motivo_bloqueio ?? "Horário bloqueado"
                                      : `${item.cliente_nome} · ${item.servico_nome}`}
                                  </p>
                                </div>

                                {item.valor_final !== null ? (
                                  <span>{formatCurrency(Number(item.valor_final))}</span>
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

              {upcomingAppointments.length === 0 ? (
                <div className="mini-empty">Nenhum atendimento próximo.</div>
              ) : (
                <div className="mini-list">
                  {upcomingAppointments.slice(0, 4).map((item) => (
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
                <div className="mini-empty">Nenhum aniversariante este mês.</div>
              ) : (
                <div className="mini-list">
                  {aniversariantes.map((client) => (
                    <div className="mini-item" key={client.id}>
                      <strong>{client.nome}</strong>

                      <span>
                        Dia {String(client.aniversario_dia).padStart(2, "0")} · {" "}
                        {client.telefone}
                      </span>

                      <small
                        className={
                          client.cupom_usado
                            ? "birthday-coupon-used"
                            : "birthday-coupon-available"
                        }
                      >
                        {client.cupom_usado ? "Cupom usado" : "Cupom disponível"}
                      </small>
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
