"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AppointmentModal } from "@/components/agenda/appointment-modal";
import { BlockTimeModal } from "@/components/agenda/block-time-modal";
import { EventDetailsModal } from "@/components/agenda/event-details-modal";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

type Professional = {
  id: string;
  nome: string;
};

type AgendaEvent = {
  id: string;
  tipo_evento: "agendamento" | "bloqueio";
  profissional_id?: string | null;
  data_referencia: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  servico_nome: string | null;
  valor_original?: number | null;
  desconto_percentual?: number | null;
  valor_final: number | null;
  motivo_bloqueio: string | null;
  pagamento_registrado?: boolean;
  auto_bloqueio?: boolean;
  cliente_id?: string | null;
  servico_id?: string | null;
  cupom_id?: string | null;
  cupom_codigo_informado?: string | null;
  observacoes?: string | null;
};

type WorkingHour = {
  id: string;
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
};

type BreakTime = {
  id: string;
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  motivo: string | null;
  ativo: boolean;
};

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getDatesBetween(start: string, end: string) {
  const dates: string[] = [];

  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);

  const current = new Date(startYear, startMonth - 1, startDay);
  const last = new Date(endYear, endMonth - 1, endDay);

  while (current <= last) {
    dates.push(current.toLocaleDateString("en-CA"));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function buildScheduleMirrorEvents({
  rangeStart,
  rangeEnd,
  workingHours,
  breakTimes,
}: {
  rangeStart: string;
  rangeEnd: string;
  workingHours: WorkingHour[];
  breakTimes: BreakTime[];
}) {
  const dates = getDatesBetween(rangeStart, rangeEnd);
  const mirrorEvents: AgendaEvent[] = [];

  dates.forEach((date) => {
    const dayOfWeek = getDayOfWeek(date);

    const workingHour = workingHours.find(
      (item) => item.dia_semana === dayOfWeek && item.ativo,
    );

    const dayBreaks = breakTimes.filter(
      (item) => item.dia_semana === dayOfWeek && item.ativo,
    );

    if (!workingHour) {
      mirrorEvents.push({
        id: `auto-closed-${date}`,
        tipo_evento: "bloqueio",
        data_referencia: date,
        hora_inicio: "08:00",
        hora_fim: "20:00",
        status: "",
        cliente_nome: null,
        cliente_telefone: null,
        servico_nome: null,
        valor_final: null,
        motivo_bloqueio: "Fora do expediente",
        auto_bloqueio: true,
      });

      return;
    }

    if (workingHour.hora_inicio.slice(0, 5) > "08:00") {
      mirrorEvents.push({
        id: `auto-before-${date}`,
        tipo_evento: "bloqueio",
        data_referencia: date,
        hora_inicio: "08:00",
        hora_fim: workingHour.hora_inicio.slice(0, 5),
        status: "",
        cliente_nome: null,
        cliente_telefone: null,
        servico_nome: null,
        valor_final: null,
        motivo_bloqueio: "Antes do expediente",
        auto_bloqueio: true,
      });
    }

    if (workingHour.hora_fim.slice(0, 5) < "20:00") {
      mirrorEvents.push({
        id: `auto-after-${date}`,
        tipo_evento: "bloqueio",
        data_referencia: date,
        hora_inicio: workingHour.hora_fim.slice(0, 5),
        hora_fim: "20:00",
        status: "",
        cliente_nome: null,
        cliente_telefone: null,
        servico_nome: null,
        valor_final: null,
        motivo_bloqueio: "Após o expediente",
        auto_bloqueio: true,
      });
    }

    dayBreaks.forEach((breakTime) => {
      mirrorEvents.push({
        id: `auto-break-${date}-${breakTime.id}`,
        tipo_evento: "bloqueio",
        data_referencia: date,
        hora_inicio: breakTime.hora_inicio.slice(0, 5),
        hora_fim: breakTime.hora_fim.slice(0, 5),
        status: "",
        cliente_nome: null,
        cliente_telefone: null,
        servico_nome: null,
        valor_final: null,
        motivo_bloqueio: breakTime.motivo ?? "Intervalo",
        auto_bloqueio: true,
      });
    });
  });

  return mirrorEvents;
}

export default function AgendaPage() {
  const router = useRouter();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [filterType, setFilterType] = useState<
    "dia" | "semana" | "mes" | "ano"
  >("dia");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AgendaEvent | null>(null);

  async function attachPaymentStatus(agendaData: AgendaEvent[]) {
    const appointmentIds = agendaData
      .filter((item) => item.tipo_evento === "agendamento")
      .map((item) => item.id);

    if (appointmentIds.length === 0) {
      return agendaData.map((item) => ({
        ...item,
        pagamento_registrado: false,
      }));
    }

    const { data: paymentsData, error } = await supabase
      .from("appointment_payments")
      .select("appointment_id")
      .in("appointment_id", appointmentIds);

    if (error) {
      console.error("Erro ao carregar pagamentos:", error);
      return agendaData;
    }

    const paidAppointmentIds = new Set(
      (paymentsData ?? []).map((payment) => payment.appointment_id),
    );

    return agendaData.map((item) => ({
      ...item,
      pagamento_registrado:
        item.tipo_evento === "agendamento" && paidAppointmentIds.has(item.id),
    }));
  }

  function getDateRange(
    dateString: string,
    type: "dia" | "semana" | "mes" | "ano",
  ) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (type === "dia") {
      return { start: dateString, end: dateString };
    }

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
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      return {
        start: start.toLocaleDateString("en-CA"),
        end: end.toLocaleDateString("en-CA"),
      };
    }

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    return {
      start: start.toLocaleDateString("en-CA"),
      end: end.toLocaleDateString("en-CA"),
    };
  }

  async function loadAgenda(professionalId: string, date: string, type = filterType) {
    const range = getDateRange(date, type);

    const { data: agendaData, error } = await supabase
      .from("v_agenda_unificada")
      .select("*")
      .eq("profissional_id", professionalId)
      .gte("data_referencia", range.start)
      .lte("data_referencia", range.end)
      .order("data_referencia", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) {
      console.error("Erro ao carregar agenda:", error);
      return;
    }

    const { data: workingHoursData } = await supabase
      .from("working_hours")
      .select("*")
      .eq("profissional_id", professionalId);

    const { data: breakTimesData } = await supabase
      .from("break_times")
      .select("*")
      .eq("profissional_id", professionalId)
      .eq("ativo", true);

    const scheduleMirrorEvents = buildScheduleMirrorEvents({
      rangeStart: range.start,
      rangeEnd: range.end,
      workingHours: (workingHoursData ?? []) as WorkingHour[],
      breakTimes: (breakTimesData ?? []) as BreakTime[],
    });

    const agendaWithMirror = [
      ...((agendaData ?? []) as AgendaEvent[]),
      ...scheduleMirrorEvents,
    ].sort((a, b) => {
      if (a.data_referencia !== b.data_referencia) {
        return a.data_referencia.localeCompare(b.data_referencia);
      }

      return a.hora_inicio.localeCompare(b.hora_inicio);
    });

    const agendaWithPayment = await attachPaymentStatus(agendaWithMirror);

    setEvents(agendaWithPayment);
  }

  useEffect(() => {
    async function loadPage() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

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

      const professionalId = selectedProfessionalId || session.user.id;

      if (!selectedProfessionalId) {
        setSelectedProfessionalId(session.user.id);
      }

      await loadAgenda(professionalId, selectedDate, filterType);

      setLoading(false);
    }

    loadPage();
  }, [router, selectedDate, selectedProfessionalId, filterType]);

  function generateTimeSlots(start = 8, end = 20) {
    const slots = [];

    for (let hour = start; hour <= end; hour++) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
      slots.push(`${String(hour).padStart(2, "0")}:30`);
    }

    return slots;
  }

  function timeToMinutes(time: string) {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  }

  function getEventPosition(start: string, end: string) {
    const dayStart = 8 * 60;
    const slotHeight = 48;

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    const top = ((startMinutes - dayStart) / 30) * slotHeight;
    const height = Math.max(
      ((endMinutes - startMinutes) / 30) * slotHeight,
      56,
    );

    return { top, height };
  }

  function getWeekDays(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      days.push({
        date: d.toLocaleDateString("en-CA"),
        label: d.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
        }),
      });
    }

    return days;
  }

  function groupEventsByDay(events: AgendaEvent[]) {
    return events.reduce<Record<string, AgendaEvent[]>>((acc, event) => {
      const date = event.data_referencia;

      if (!acc[date]) acc[date] = [];

      acc[date].push(event);
      return acc;
    }, {});
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

  function getStatusClass(status: string) {
    if (status === "finalizado") return "status-finalizado";
    if (status === "em_atendimento") return "status-atendimento";
    if (status === "cancelado" || status === "faltou") return "status-problema";
    if (status === "confirmado") return "status-confirmado";
    return "status-agendado";
  }

  function handleOpenEvent(event: AgendaEvent) {
    if (event.auto_bloqueio) return;

    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  }

  if (loading) {
    return <main className="agenda-loading">Carregando agenda...</main>;
  }

  return (
    <main className="agenda-shell">
      <Sidebar />

      <section className="agenda-main">
        <Header profile={profile} />

        <div className="agenda-toolbar">
          <div>
            <p className="agenda-eyebrow">Organização diária</p>
            <h2>Minha agenda</h2>
          </div>

          <div className="agenda-actions">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

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

            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowBlockTimeModal(true)}
            >
              Bloquear horário
            </button>

            <button
              className="primary-button"
              onClick={() => setShowAppointmentModal(true)}
            >
              Novo agendamento
            </button>
          </div>
        </div>

        <section className="agenda-panel">
          <div className="agenda-panel-header">
            <div>
              <h3>
                {filterType === "dia" && "Horários do dia"}
                {filterType === "semana" && "Horários da semana"}
                {filterType === "mes" && "Horários do mês"}
                {filterType === "ano" && "Horários do ano"}
              </h3>
              <p>{formatDateBR(selectedDate)}</p>
            </div>

            <span>
              {
                events.filter((event) => event.tipo_evento === "agendamento")
                  .length
              }{" "}
              clientes
              {" / "}
              {events.filter((event) => event.tipo_evento === "bloqueio").length}{" "}
              bloqueios
            </span>
          </div>

          {events.length === 0 ? (
            <div className="agenda-empty">
              <h3>Nenhum horário agendado</h3>
              <p>
                Quando você criar agendamentos ou bloqueios, eles aparecerão
                nesta tela.
              </p>
            </div>
          ) : filterType === "dia" ? (
            <div className="calendar-day-scroll">
              <div className="calendar-single-day-view">
                <div className="calendar-single-day-header">
                  <div className="time-col" />
                  <div className="day-col-header">
                    {formatDateBR(selectedDate)}
                  </div>
                </div>

                <div className="calendar-single-day-body">
                  <div className="calendar-time-column">
                    {generateTimeSlots().map((slot) => (
                      <div key={slot} className="calendar-time-slot">
                        {slot.endsWith(":00") ? slot : ""}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-day-column">
                    {generateTimeSlots().map((slot) => (
                      <div
                        key={slot}
                        className={`calendar-grid-line ${
                          slot.endsWith(":00") ? "full-hour" : "half-hour"
                        }`}
                      />
                    ))}

                    {events.map((event) => {
                      const position = getEventPosition(
                        event.hora_inicio,
                        event.hora_fim,
                      );

                      return (
                        <article
                          key={event.id}
                          data-auto={event.auto_bloqueio ? "true" : "false"}
                          onClick={() => handleOpenEvent(event)}
                          className={`calendar-event ${
                            event.tipo_evento === "bloqueio"
                              ? "calendar-event-blocked"
                              : `calendar-event-appointment ${getStatusClass(
                                  event.status,
                                )}`
                          }`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                          }}
                        >
                          <div className="event-card-header">
                            <strong>
                              {event.hora_inicio.slice(0, 5)} -{" "}
                              {event.hora_fim.slice(0, 5)}
                            </strong>

                            {event.pagamento_registrado ? (
                              <span className="payment-badge">Pago</span>
                            ) : null}
                          </div>

                          <span>
                            {event.tipo_evento === "bloqueio"
                              ? event.motivo_bloqueio ?? "Horário bloqueado"
                              : event.cliente_nome}
                          </span>

                          {event.tipo_evento === "agendamento" ? (
                            <small>{event.servico_nome}</small>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : filterType === "semana" ? (
            <div className="calendar-week-scroll">
              <div className="calendar-week-view">
                <div className="calendar-week-header">
                  <div className="time-col" />

                  {getWeekDays(selectedDate).map((day) => (
                    <div key={day.date} className="day-col-header">
                      {day.label}
                    </div>
                  ))}
                </div>

                <div className="calendar-week-body">
                  <div className="calendar-time-column">
                    {generateTimeSlots().map((slot) => (
                      <div key={slot} className="calendar-time-slot">
                        {slot.endsWith(":00") ? slot : ""}
                      </div>
                    ))}
                  </div>

                  {getWeekDays(selectedDate).map((day) => {
                    const eventsByDay =
                      groupEventsByDay(events)[day.date] || [];

                    return (
                      <div key={day.date} className="calendar-day-column">
                        {generateTimeSlots().map((slot) => (
                          <div
                            key={slot}
                            className={`calendar-grid-line ${
                              slot.endsWith(":00") ? "full-hour" : "half-hour"
                            }`}
                          />
                        ))}

                        {eventsByDay.map((event) => {
                          const pos = getEventPosition(
                            event.hora_inicio,
                            event.hora_fim,
                          );

                          return (
                            <article
                              key={event.id}
                              data-auto={
                                event.auto_bloqueio ? "true" : "false"
                              }
                              onClick={() => handleOpenEvent(event)}
                              className={`calendar-event ${
                                event.tipo_evento === "bloqueio"
                                  ? "calendar-event-blocked"
                                  : `calendar-event-appointment ${getStatusClass(
                                      event.status,
                                    )}`
                              }`}
                              style={{
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                              }}
                            >
                              <div className="event-card-header">
                                <strong>{event.hora_inicio.slice(0, 5)}</strong>

                                {event.pagamento_registrado ? (
                                  <span className="payment-badge">Pago</span>
                                ) : null}
                              </div>

                              <span>
                                {event.tipo_evento === "bloqueio"
                                  ? event.motivo_bloqueio ?? "Bloqueado"
                                  : event.cliente_nome}
                              </span>

                              {event.tipo_evento === "agendamento" ? (
                                <small>{event.servico_nome}</small>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="agenda-list">
              {events.map((event) => (
                <article
                  key={event.id}
                  data-auto={event.auto_bloqueio ? "true" : "false"}
                  onClick={() => handleOpenEvent(event)}
                  className={`agenda-event ${
                    event.tipo_evento === "bloqueio"
                      ? "event-blocked"
                      : `event-appointment ${getStatusClass(event.status)}`
                  }`}
                >
                  <div className="event-time">
                    <strong>{event.hora_inicio.slice(0, 5)}</strong>
                    <span>{event.hora_fim.slice(0, 5)}</span>
                  </div>

                  <div className="event-content">
                    <div className="event-title-row">
                      <h4>
                        {event.tipo_evento === "bloqueio"
                          ? event.motivo_bloqueio ?? "Horário bloqueado"
                          : event.cliente_nome}
                      </h4>

                      <div className="event-title-badges">
                        {event.pagamento_registrado ? (
                          <span className="payment-badge">Pago</span>
                        ) : null}

                        {event.tipo_evento === "agendamento" ? (
                          <span className="event-status">{event.status}</span>
                        ) : null}
                      </div>
                    </div>

                    <p>
                      {event.tipo_evento === "agendamento"
                        ? `${event.servico_nome} · ${event.cliente_telefone}`
                        : event.auto_bloqueio
                          ? "Bloqueio automático pelo expediente."
                          : "Indisponível para novos agendamentos."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <AppointmentModal
        open={showAppointmentModal}
        selectedDate={selectedDate}
        editingEvent={editingAppointment}
        onClose={() => {
          setShowAppointmentModal(false);
          setEditingAppointment(null);
        }}
        onSaved={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            await loadAgenda(
              selectedProfessionalId || session.user.id,
              selectedDate,
            );
          }
        }}
      />

      <BlockTimeModal
        open={showBlockTimeModal}
        selectedDate={selectedDate}
        onClose={() => setShowBlockTimeModal(false)}
        onSaved={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            await loadAgenda(
              selectedProfessionalId || session.user.id,
              selectedDate,
            );
          }
        }}
      />

      <EventDetailsModal
        open={showEventDetailsModal}
        event={selectedEvent}
        onClose={() => {
          setShowEventDetailsModal(false);
          setSelectedEvent(null);
        }}
        onDeleted={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            await loadAgenda(
              selectedProfessionalId || session.user.id,
              selectedDate,
            );
          }
        }}
        onEditAppointment={(event) => {
          setShowEventDetailsModal(false);
          setSelectedEvent(null);
          setEditingAppointment(event);
          setShowAppointmentModal(true);
        }}
      />
    </main>
  );
}