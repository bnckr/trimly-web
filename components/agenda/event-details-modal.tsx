"use client";

import { supabase } from "@/lib/supabase";

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

type EventDetailsModalProps = {
  open: boolean;
  event: AgendaEvent | null;
  onClose: () => void;
  onDeleted: () => void;
  onEditAppointment: (event: AgendaEvent) => void;
};

export function EventDetailsModal({
  open,
  event,
  onClose,
  onDeleted,
  onEditAppointment,
}: EventDetailsModalProps) {
  if (!open || !event) return null;

  async function handleDelete() {
    if (!event) return;

    const message =
      event.tipo_evento === "bloqueio"
        ? "Deseja excluir este bloqueio de horário?"
        : "Deseja excluir este agendamento?";

    if (!confirm(message)) return;

    const table =
      event.tipo_evento === "bloqueio" ? "schedule_blocks" : "appointments";

    const { error } = await supabase.from(table).delete().eq("id", event.id);

    if (error) {
      alert(error.message);
      return;
    }

    onDeleted();
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="event-details-modal">
        <div className="modal-header">
          <div>
            <p>
              {event.tipo_evento === "bloqueio" ? "Bloqueio" : "Agendamento"}
            </p>
            <h2>
              {event.tipo_evento === "bloqueio"
                ? (event.motivo_bloqueio ?? "Horário bloqueado")
                : event.cliente_nome}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="event-details-content">
          <div>
            <span>Horário</span>
            <strong>
              {event.hora_inicio.slice(0, 5)} - {event.hora_fim.slice(0, 5)}
            </strong>
          </div>

          {event.tipo_evento === "agendamento" ? (
            <>
              <div>
                <span>Serviço</span>
                <strong>{event.servico_nome}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{event.cliente_telefone}</strong>
              </div>

              <div>
                <span>Valor</span>
                <strong>
                  {event.valor_final !== null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(event.valor_final))
                    : "-"}
                </strong>
              </div>

              {event.tipo_evento === "agendamento" ? (
                <div className="event-status-actions">
                  <p>Alterar status</p>

                  <div>
                    {[
                      "agendado",
                      "confirmado",
                      "em_atendimento",
                      "finalizado",
                      "cancelado",
                      "faltou",
                    ].map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={
                          event.status === status
                            ? "status-button active"
                            : "status-button"
                        }
                        onClick={async () => {
                          const { error } = await supabase
                            .from("appointments")
                            .update({ status })
                            .eq("id", event.id);

                          if (error) {
                            alert(error.message);
                            return;
                          }

                          onDeleted();
                          onClose();
                        }}
                      >
                        {status.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div>
              <span>Motivo</span>
              <strong>{event.motivo_bloqueio ?? "Sem motivo informado"}</strong>
            </div>
          )}
        </div>

        <div className="event-details-actions">
          {event.tipo_evento === "agendamento" ? (
            <button
              type="button"
              className="event-edit-button"
              onClick={() => onEditAppointment(event)}
            >
              Editar
            </button>
          ) : null}

          <button
            type="button"
            className="event-delete-button"
            onClick={handleDelete}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
