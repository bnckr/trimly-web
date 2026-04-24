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
  data_referencia: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  servico_nome: string | null;
  valor_final: number | null;
  motivo_bloqueio: string | null;

  cliente_id?: string | null;
  servico_id?: string | null;
  cupom_codigo_informado?: string | null;
  observacoes?: string | null;
};


function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

  useEffect(() => {
    async function loadPage() {
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

      if (!selectedProfessionalId) {
        setSelectedProfessionalId(session.user.id);
      }

      const professionalId = selectedProfessionalId || session.user.id;
      const range = getDateRange(selectedDate, filterType);

      const { data: agendaData, error } = await supabase
        .from("v_agenda_unificada")
        .select("*")
        .eq("profissional_id", professionalId)
        .gte("data_referencia", range.start)
        .lte("data_referencia", range.end)
        .order("data_referencia", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) {
        console.error("Erro ao carregar agenda:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      setEvents((agendaData ?? []) as AgendaEvent[]);
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

  async function loadAgenda(
    professionalId: string,
    date: string,
    type = filterType,
  ) {
    const range = getDateRange(date, type);

    const { data, error } = await supabase
      .from("v_agenda_unificada")
      .select("*")
      .eq("profissional_id", professionalId)
      .gte("data_referencia", range.start)
      .lte("data_referencia", range.end)
      .order("data_referencia", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEvents((data ?? []) as AgendaEvent[]);
  }

  if (loading) {
    return <main className="agenda-loading">Carregando agenda...</main>;
  }

  function getStatusClass(status: string) {
    if (status === "finalizado") return "status-finalizado";
    if (status === "em_atendimento") return "status-atendimento";
    if (status === "cancelado" || status === "faltou") return "status-problema";
    if (status === "confirmado") return "status-confirmado";
    return "status-agendado";
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
              onClick={() => {
                setShowAppointmentModal(true);
              }}
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
              {events.length} {events.length === 1 ? "cliente" : "clientes"}
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
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventDetailsModal(true);
                          }}
                          className={`calendar-event ${
                            event.tipo_evento === "bloqueio"
                              ? "calendar-event-blocked"
                              : `calendar-event-appointment ${getStatusClass(event.status)}`
                          }`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                          }}
                        >
                          <strong>
                            {event.hora_inicio.slice(0, 5)} -{" "}
                            {event.hora_fim.slice(0, 5)}
                          </strong>

                          <span>
                            {event.tipo_evento === "bloqueio"
                              ? (event.motivo_bloqueio ?? "Horário bloqueado")
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
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowEventDetailsModal(true);
                              }}
                              className={`calendar-event ${
                                event.tipo_evento === "bloqueio"
                                  ? "calendar-event-blocked"
                                  : `calendar-event-appointment ${getStatusClass(event.status)}`
                              }`}
                              style={{
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                              }}
                            >
                              <strong>{event.hora_inicio.slice(0, 5)}</strong>

                              <span>
                                {event.tipo_evento === "bloqueio"
                                  ? "Bloqueado"
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
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventDetailsModal(true);
                  }}
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
                          ? (event.motivo_bloqueio ?? "Horário bloqueado")
                          : event.cliente_nome}
                      </h4>

                      <span className="event-status">{event.status}</span>
                    </div>

                    <p>
                      {event.tipo_evento === "agendamento"
                        ? `${event.servico_nome} · ${event.cliente_telefone}`
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
            await loadAgenda(session.user.id, selectedDate);
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
