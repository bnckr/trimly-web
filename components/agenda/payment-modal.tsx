"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  calculatePaymentValues,
  deleteAppointmentPayment,
  getDefaultPaymentFee,
  upsertAppointmentPayment,
} from "@/actions/payments";
import type { AppointmentPayment, PaymentMethod } from "@/types/payment";
import { useToast } from "@/components/ui/toast-provider";

const { showToast } = useToast();

type PaymentModalEvent = {
  id: string;
  cliente_id?: string | null;
  profissional_id?: string | null;
  cliente_nome: string | null;
  servico_nome: string | null;
  valor_final: number | null;
};

type PaymentModalProps = {
  open: boolean;
  event: PaymentModalEvent | null;
  existingPayment: AppointmentPayment | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito - Mercado Pago 1,99%" },
  { value: "credito", label: "Crédito à vista - Mercado Pago 4,98%" },
  { value: "credito_parcelado", label: "Crédito parcelado" },
  { value: "cortesia", label: "Cortesia" },
];

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function PaymentModal({
  open,
  event,
  existingPayment,
  onClose,
  onSaved,
}: PaymentModalProps) {
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [taxaPercentual, setTaxaPercentual] = useState("0");
  const [parcelas, setParcelas] = useState("2");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const valorBruto = Number(event?.valor_final ?? 0);

  const preview = useMemo(() => {
    return calculatePaymentValues({
      valor_bruto: valorBruto,
      taxa_percentual: Number(taxaPercentual || 0),
    });
  }, [valorBruto, taxaPercentual]);

  useEffect(() => {
    if (!open) return;

    if (existingPayment) {
      setFormaPagamento(existingPayment.forma_pagamento);
      setTaxaPercentual(String(existingPayment.taxa_percentual ?? 0));
      setParcelas(String(existingPayment.parcelas ?? 2));
      setObservacoes(existingPayment.observacoes ?? "");
      setErro("");
      return;
    }

    setFormaPagamento("pix");
    setTaxaPercentual(String(getDefaultPaymentFee("pix")));
    setParcelas("2");
    setObservacoes("");
    setErro("");
  }, [open, existingPayment]);

  if (!open || !event) return null;

  const currentEvent = event;

  function handlePaymentMethodChange(method: PaymentMethod) {
    setFormaPagamento(method);
    setTaxaPercentual(String(getDefaultPaymentFee(method)));
  }

  async function handleSubmit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setErro("");

    if (!currentEvent.cliente_id) {
      setErro("Cliente não encontrado para este agendamento.");
      return;
    }

    if (!currentEvent.profissional_id) {
      setErro("Profissional não encontrado para este agendamento.");
      return;
    }

    try {
      setSaving(true);

      await upsertAppointmentPayment({
        appointment_id: currentEvent.id,
        cliente_id: currentEvent.cliente_id,
        profissional_id: currentEvent.profissional_id,
        forma_pagamento: formaPagamento,
        valor_bruto: valorBruto,
        taxa_percentual: Number(taxaPercentual || 0),
        parcelas:
          formaPagamento === "credito_parcelado" ? Number(parcelas || 2) : null,
        observacoes: observacoes || null,
      });
      showToast("Pagamento registrado com sucesso", "success");
      await onSaved();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar pagamento",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment() {
    if (!confirm("Deseja remover o pagamento deste agendamento?")) {
      return;
    }

    try {
      setSaving(true);
      await deleteAppointmentPayment(currentEvent.id);
      showToast("Pagamento removido com sucesso", "success");
      await onSaved();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao remover pagamento",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <div>
            <p>Pagamento</p>
            <h2>
              {existingPayment ? "Editar pagamento" : "Registrar pagamento"}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="payment-summary-header">
          <div>
            <span>Cliente</span>
            <strong>{currentEvent.cliente_nome}</strong>
          </div>

          <div>
            <span>Serviço</span>
            <strong>{currentEvent.servico_nome}</strong>
          </div>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Forma de pagamento
            <select
              value={formaPagamento}
              onChange={(e) =>
                handlePaymentMethodChange(e.target.value as PaymentMethod)
              }
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {formaPagamento === "credito_parcelado" ? (
            <label>
              Parcelas
              <input
                type="number"
                min="2"
                max="12"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
            </label>
          ) : null}

          <label>
            Taxa da operadora (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxaPercentual}
              onChange={(e) => setTaxaPercentual(e.target.value)}
            />
          </label>

          <div className="payment-preview-grid">
            <div>
              <span>Valor bruto</span>
              <strong>{formatCurrency(preview.valor_bruto)}</strong>
            </div>

            <div>
              <span>Taxa da operadora</span>
              <strong>{formatCurrency(preview.taxa_valor)}</strong>
            </div>

            <div>
              <span>Valor líquido do colaborador</span>
              <strong>
                {formatCurrency(preview.valor_liquido_colaborador)}
              </strong>
            </div>
          </div>

          <label>
            Observações
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: pagamento feito no crédito à vista"
            />
          </label>

          {erro ? <p className="modal-error">{erro}</p> : null}

          <div className="appointment-modal-actions">
            {existingPayment ? (
              <button
                type="button"
                className="payment-delete-button"
                onClick={handleDeletePayment}
                disabled={saving}
              >
                Remover
              </button>
            ) : null}

            <button
              type="button"
              className="appointment-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="appointment-save-button"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
