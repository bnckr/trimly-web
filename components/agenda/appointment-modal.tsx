"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  nome: string;
  telefone: string;
};

type Service = {
  id: string;
  nome: string;
  valor: number;
  duracao_minutos: number;
};

type ConflictEvent = {
  id: string;
  tipo_evento: "agendamento" | "bloqueio";
  hora_inicio: string;
  hora_fim: string;
  cliente_nome: string | null;
  servico_nome: string | null;
  motivo_bloqueio: string | null;
};

type AppointmentModalProps = {
  open: boolean;
  selectedDate: string;
  editingEvent?: {
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
  } | null;
  onClose: () => void;
  onSaved: () => void;
};

function addMinutesToTime(time: string, minutes: number) {
  if (!time || !minutes) return "";

  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function hasTimeConflict(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string,
) {
  return (
    newStart < existingEnd.slice(0, 5) && newEnd > existingStart.slice(0, 5)
  );
}

export function AppointmentModal({
  open,
  selectedDate,
  editingEvent = null,
  onClose,
  onSaved,
}: AppointmentModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dayEvents, setDayEvents] = useState<ConflictEvent[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [cupom, setCupom] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const selectedService = services.find((service) => service.id === servicoId);

  const horaFim = useMemo(() => {
    if (!selectedService || !horaInicio) return "";
    return addMinutesToTime(horaInicio, selectedService.duracao_minutos);
  }, [horaInicio, selectedService]);

  const conflicts = useMemo(() => {
    if (!horaInicio || !horaFim) return [];

    return dayEvents.filter((event) =>
      hasTimeConflict(horaInicio, horaFim, event.hora_inicio, event.hora_fim),
    );
  }, [dayEvents, horaInicio, horaFim]);

  const hasConflict = conflicts.length > 0;

  useEffect(() => {
    if (!open) return;

    async function loadData() {
      setErro("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErro("Sessão expirada. Faça login novamente.");
        return;
      }

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, nome, telefone")
        .eq("ativo", true)
        .order("nome");

      const { data: servicesData } = await supabase
        .from("services")
        .select("id, nome, valor, duracao_minutos")
        .eq("ativo", true)
        .order("nome");

      const { data: agendaData } = await supabase
        .from("v_agenda_unificada")
        .select(
          "id, tipo_evento, hora_inicio, hora_fim, cliente_nome, servico_nome, motivo_bloqueio",
        )
        .eq("profissional_id", session.user.id)
        .eq("data_referencia", selectedDate)
        .order("hora_inicio", { ascending: true });

      setClients((clientsData ?? []) as Client[]);
      setServices((servicesData ?? []) as Service[]);
      setDayEvents((agendaData ?? []) as ConflictEvent[]);

      if (editingEvent) {
        setClienteId(editingEvent.cliente_id ?? "");
        setServicoId(editingEvent.servico_id ?? "");
        setHoraInicio(editingEvent.hora_inicio.slice(0, 5));
        setCupom(editingEvent.cupom_codigo_informado ?? "");
        setObservacoes(editingEvent.observacoes ?? "");
      } else {
        setClienteId("");
        setServicoId("");
        setHoraInicio("");
        setCupom("");
        setObservacoes("");
      }
    }

    loadData();
  }, [open, selectedDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }

    if (!servicoId || !selectedService) {
      setErro("Selecione um serviço.");
      return;
    }

    if (!horaInicio || !horaFim) {
      setErro("Informe o horário inicial.");
      return;
    }

    if (hasConflict) {
      setErro("Este horário conflita com outro agendamento ou bloqueio.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setErro("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const payload = {
      profissional_id: session.user.id,
      cliente_id: clienteId,
      servico_id: servicoId,
      cupom_codigo_informado: cupom || null,
      data_agendamento: selectedDate,
      hora_inicio: horaInicio,
      observacoes: observacoes || null,
      status: editingEvent?.status ?? "agendado",
      encaixe: false,
      cliente_atrasado: false,
    };

    const { error } = editingEvent
      ? await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editingEvent.id)
      : await supabase.from("appointments").insert(payload);

    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setClienteId("");
    setServicoId("");
    setHoraInicio("");
    setCupom("");
    setObservacoes("");
    setDayEvents([]);

    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="appointment-modal">
        <div className="modal-header">
          <div>
            <p>{editingEvent ? "Editar horário" : "Novo horário"}</p>
            <h2>{editingEvent ? "Editar agendamento" : "Agendar cliente"}</h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Cliente
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              required
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nome} - {client.telefone}
                </option>
              ))}
            </select>
          </label>

          <label>
            Serviço
            <select
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
              required
            >
              <option value="">Selecione um serviço</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nome}
                </option>
              ))}
            </select>
          </label>

          {selectedService ? (
            <div className="service-preview">
              <span>Valor: R$ {Number(selectedService.valor).toFixed(2)}</span>
              <span>Duração: {selectedService.duracao_minutos} min</span>
            </div>
          ) : null}

          <div className="time-grid">
            <label>
              Hora inicial
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </label>

            <label>
              Hora final
              <input type="time" value={horaFim} disabled />
            </label>
          </div>

          {horaInicio && horaFim && !hasConflict ? (
            <div className="time-success">
              Horário disponível: {horaInicio} até {horaFim}
            </div>
          ) : null}

          {hasConflict ? (
            <div className="time-conflict">
              <strong>Conflito de horário encontrado</strong>
              {conflicts.map((conflict) => (
                <p key={conflict.id}>
                  {conflict.hora_inicio.slice(0, 5)} -{" "}
                  {conflict.hora_fim.slice(0, 5)} ·{" "}
                  {conflict.tipo_evento === "bloqueio"
                    ? (conflict.motivo_bloqueio ?? "Horário bloqueado")
                    : `${conflict.cliente_nome} · ${conflict.servico_nome}`}
                </p>
              ))}
            </div>
          ) : null}

          <label>
            Cupom
            <input
              type="text"
              placeholder="Ex: ANIVERSARIANTE10"
              value={cupom}
              onChange={(e) => setCupom(e.target.value.toUpperCase())}
            />
          </label>

          <label>
            Observações
            <textarea
              placeholder="Observações sobre o atendimento"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </label>

          {erro ? <p className="modal-error">{erro}</p> : null}

          <div className="appointment-modal-actions">
            <button
              type="button"
              className="appointment-cancel-button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="appointment-save-button"
              disabled={loading || hasConflict}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
