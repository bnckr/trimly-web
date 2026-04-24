"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPaymentByAppointment } from "@/actions/payments";
import { PaymentModal } from "@/components/agenda/payment-modal";
import type { AppointmentPayment } from "@/types/payment";

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
  cliente_id?: string | null;
  servico_id?: string | null;
  cupom_id?: string | null;
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

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    debito: "Débito",
    credito: "Crédito",
    credito_parcelado: "Crédito parcelado",
    cortesia: "Cortesia",
  };

  return labels[method] ?? method;
}

export function EventDetailsModal({
  open,
  event,
  onClose,
  onDeleted,
  onEditAppointment,
}: EventDetailsModalProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payment, setPayment] = useState<AppointmentPayment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    async function loadPayment() {
      if (!open || !event) {
        setPayment(null);
        return;
      }

      const currentEvent = event;

      if (currentEvent.tipo_evento !== "agendamento") {
        setPayment(null);
        return;
      }

      try {
        setLoadingPayment(true);

        const data = await getPaymentByAppointment(currentEvent.id);

        setPayment(data);
      } catch (error) {
        console.error(error);
        setPayment(null);
      } finally {
        setLoadingPayment(false);
      }
    }

    loadPayment();
  }, [open, event]);

  if (!open || !event) return null;

  const currentEvent = event;

  async function handleDelete() {

    const message =
      currentEvent.tipo_evento === "bloqueio"
        ? "Deseja excluir este bloqueio de horário?"
        : "Deseja excluir este agendamento?";

    if (!confirm(message)) return;

    const table =
      currentEvent.tipo_evento === "bloqueio"
        ? "schedule_blocks"
        : "appointments";

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", currentEvent.id);

    if (error) {
      alert(error.message);
      return;
    }

    onDeleted();
    onClose();
  }

  async function reloadPayment() {
    if (currentEvent.tipo_evento !== "agendamento") return;

    const data = await getPaymentByAppointment(currentEvent.id);

    setPayment(data);
    onDeleted();
  }

  const canRegisterPayment =
    currentEvent.tipo_evento === "agendamento" &&
    currentEvent.status === "finalizado";

  return (
    <>
      <div className="modal-overlay">
        <div className="event-details-modal">
          <div className="modal-header">
            <div>
              <p>
                {currentEvent.tipo_evento === "bloqueio"
                  ? "Bloqueio"
                  : "Agendamento"}
              </p>

              <h2>
                {currentEvent.tipo_evento === "bloqueio"
                  ? (currentEvent.motivo_bloqueio ?? "Horário bloqueado")
                  : currentEvent.cliente_nome}
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
                {currentEvent.hora_inicio.slice(0, 5)} - {currentEvent.hora_fim.slice(0, 5)}
              </strong>
            </div>

            {currentEvent.tipo_evento === "agendamento" ? (
              <>
                <div>
                  <span>Serviço</span>
                  <strong>{currentEvent.servico_nome}</strong>
                </div>

                <div>
                  <span>Telefone</span>
                  <strong>{currentEvent.cliente_telefone}</strong>
                </div>

                <div>
                  <span>Valor final</span>
                  <strong>{formatCurrency(currentEvent.valor_final)}</strong>
                </div>

                {currentEvent.cupom_codigo_informado ? (
                  <>
                    <div>
                      <span>Cupom aplicado</span>
                      <strong>{currentEvent.cupom_codigo_informado}</strong>
                    </div>

                    <div>
                      <span>Valor original</span>
                      <strong>
                        {formatCurrency(
                          currentEvent.valor_original ?? currentEvent.valor_final,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Desconto</span>
                      <strong>{Number(currentEvent.desconto_percentual ?? 0)}%</strong>
                    </div>
                  </>
                ) : null}

                {payment ? (
                  <div className="event-payment-summary">
                    <span>Pagamento registrado</span>
                    <strong>
                      {formatPaymentMethod(payment.forma_pagamento)}
                    </strong>
                    <small>
                      Bruto: {formatCurrency(payment.valor_bruto)} · Taxa:{" "}
                      {formatCurrency(payment.taxa_valor)} · Líquido:{" "}
                      {formatCurrency(payment.valor_liquido_colaborador)}
                    </small>
                  </div>
                ) : loadingPayment ? (
                  <div>
                    <span>Pagamento</span>
                    <strong>Carregando...</strong>
                  </div>
                ) : null}

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
                        data-status={status}
                        className={
                          currentEvent.status === status
                            ? "status-button active"
                            : "status-button"
                        }
                        onClick={async () => {
                          const { error } = await supabase
                            .from("appointments")
                            .update({ status })
                            .eq("id", currentEvent.id);

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
              </>
            ) : (
              <div>
                <span>Motivo</span>
                <strong>
                  {currentEvent.motivo_bloqueio ?? "Sem motivo informado"}
                </strong>
              </div>
            )}
          </div>

          <div className="event-details-actions">
            {currentEvent.tipo_evento === "agendamento" ? (
              <button
                type="button"
                className="event-edit-button"
                onClick={() => onEditAppointment(event)}
              >
                Editar
              </button>
            ) : null}

            {canRegisterPayment ? (
              <button
                type="button"
                className="event-payment-button"
                onClick={() => setPaymentModalOpen(true)}
              >
                {payment ? "Editar pagamento" : "Pagamento"}
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

      <PaymentModal
        open={paymentModalOpen}
        event={currentEvent}
        existingPayment={payment}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={reloadPayment}
      />
    </>
  );
}
