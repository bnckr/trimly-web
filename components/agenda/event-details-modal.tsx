"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPaymentByAppointment } from "@/actions/payments";
import { PaymentModal } from "@/components/agenda/payment-modal";
import { useToast } from "@/components/ui/toast-provider";
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
  pagamento_registrado?: boolean;
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

function formatPercentage(value: number | null | undefined) {
  const numberValue = Number(value ?? 0);

  return `${numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    agendado: "Agendado",
    confirmado: "Confirmado",
    em_atendimento: "Em atendimento",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
    faltou: "Faltou",
  };

  return labels[status] ?? status.replace("_", " ");
}

export function EventDetailsModal({
  open,
  event,
  onClose,
  onDeleted,
  onEditAppointment,
}: EventDetailsModalProps) {
  const { showToast } = useToast();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payment, setPayment] = useState<AppointmentPayment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const isAppointment = currentEvent.tipo_evento === "agendamento";
  const hasCoupon = Boolean(currentEvent.cupom_codigo_informado);
  const canRegisterPayment = isAppointment && currentEvent.status === "finalizado";

  async function handleDelete() {
    const message = isAppointment
      ? "Deseja excluir este agendamento?"
      : "Deseja excluir este bloqueio de horário?";

    if (!confirm(message)) return;

    try {
      setDeleting(true);

      const table = isAppointment ? "appointments" : "schedule_blocks";

      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", currentEvent.id);

      if (error) throw error;

      showToast(
        isAppointment
          ? "Agendamento excluído com sucesso"
          : "Bloqueio excluído com sucesso",
        "success",
      );

      onDeleted();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao excluir horário",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleChangeStatus(status: string) {
    try {
      setUpdatingStatus(true);

      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", currentEvent.id);

      if (error) throw error;

      showToast("Status atualizado com sucesso", "success");
      onDeleted();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao atualizar status",
        "error",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function reloadPayment() {
    if (!isAppointment) return;

    try {
      const data = await getPaymentByAppointment(currentEvent.id);
      setPayment(data);
      onDeleted();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao recarregar pagamento",
        "error",
      );
    }
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="event-details-modal event-details-modal-responsive">
          <div className="modal-header event-details-header">
            <div>
              <p>{isAppointment ? "Agendamento" : "Bloqueio"}</p>
              <h2>
                {isAppointment
                  ? currentEvent.cliente_nome
                  : currentEvent.motivo_bloqueio ?? "Horário bloqueado"}
              </h2>
            </div>

            <button type="button" onClick={onClose} className="modal-close">
              ×
            </button>
          </div>

          <div className="event-details-body">
            <div className="event-details-content">
              <div>
                <span>Horário</span>
                <strong>
                  {currentEvent.hora_inicio.slice(0, 5)} -{" "}
                  {currentEvent.hora_fim.slice(0, 5)}
                </strong>
              </div>

              {isAppointment ? (
                <>
                  <div>
                    <span>Status</span>
                    <strong>{formatStatus(currentEvent.status)}</strong>
                  </div>

                  <div>
                    <span>Serviço</span>
                    <strong>{currentEvent.servico_nome ?? "-"}</strong>
                  </div>

                  <div>
                    <span>Telefone</span>
                    <strong>{currentEvent.cliente_telefone ?? "-"}</strong>
                  </div>

                  {hasCoupon ? (
                    <>
                      <div>
                        <span>Valor original</span>
                        <strong>{formatCurrency(currentEvent.valor_original)}</strong>
                      </div>

                      <div>
                        <span>Desconto</span>
                        <strong>
                          {formatPercentage(currentEvent.desconto_percentual)}
                        </strong>
                      </div>

                      <div>
                        <span>Valor final</span>
                        <strong>{formatCurrency(currentEvent.valor_final)}</strong>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span>Valor final</span>
                      <strong>{formatCurrency(currentEvent.valor_final)}</strong>
                    </div>
                  )}

                  {currentEvent.observacoes ? (
                    <div>
                      <span>Observações</span>
                      <strong>{currentEvent.observacoes}</strong>
                    </div>
                  ) : null}

                  {payment ? (
                    <div className="event-payment-summary">
                      <span>Pagamento registrado</span>
                      <strong>{formatPaymentMethod(payment.forma_pagamento)}</strong>
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

                  <div className="event-status-actions event-status-actions-card">
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
                          disabled={updatingStatus}
                          onClick={() => handleChangeStatus(status)}
                        >
                          {formatStatus(status)}
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
          </div>

          <div className="event-details-actions event-details-footer">
            {isAppointment ? (
              <button
                type="button"
                className="event-edit-button"
                onClick={() => onEditAppointment(currentEvent)}
                disabled={deleting || updatingStatus}
              >
                Editar
              </button>
            ) : null}

            {canRegisterPayment ? (
              <button
                type="button"
                className="event-payment-button"
                onClick={() => setPaymentModalOpen(true)}
                disabled={deleting || updatingStatus}
              >
                {payment ? "Editar pagamento" : "Pagamento"}
              </button>
            ) : null}

            <button
              type="button"
              className="event-delete-button"
              onClick={handleDelete}
              disabled={deleting || updatingStatus}
            >
              {deleting ? "Excluindo..." : "Excluir"}
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
