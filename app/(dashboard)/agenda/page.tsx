"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AppointmentModal } from "@/components/agenda/appointment-modal";
import { BlockTimeModal } from "@/components/agenda/block-time-modal";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);

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

      const { data: agendaData, error } = await supabase
        .from("v_agenda_unificada")
        .select("*")
        .eq("profissional_id", session.user.id)
        .eq("data_referencia", selectedDate)
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
  }, [router, selectedDate]);

  function formatDateBR(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  async function loadAgenda(userId: string, date: string) {
    const { data, error } = await supabase
      .from("v_agenda_unificada")
      .select("*")
      .eq("profissional_id", userId)
      .eq("data_referencia", date)
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
              <h3>Horários do dia</h3>
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
          ) : (
            <div className="agenda-list">
              {events.map((event) => (
                <article
                  key={event.id}
                  className={`agenda-event ${
                    event.tipo_evento === "bloqueio"
                      ? "event-blocked"
                      : "event-appointment"
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

                    {event.tipo_evento === "agendamento" ? (
                      <p>
                        {event.servico_nome} · {event.cliente_telefone}
                      </p>
                    ) : (
                      <p>Indisponível para novos agendamentos.</p>
                    )}

                    {event.valor_final !== null ? (
                      <span className="event-price">
                        R$ {Number(event.valor_final).toFixed(2)}
                      </span>
                    ) : null}
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
        onClose={() => setShowAppointmentModal(false)}
        onSaved={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            await loadAgenda(session.user.id, selectedDate);
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
    </main>
  );
}
