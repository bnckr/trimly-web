"use client";

import { useEffect, useState } from "react";
import { createCoupon, updateCoupon } from "@/actions/coupons";
import type { Coupon } from "@/types/coupon";
import { useToast } from "@/components/ui/toast-provider";

type CouponModalProps = {
  open: boolean;
  coupon: Coupon | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function CouponModal({
  open,
  coupon,
  onClose,
  onSaved,
}: CouponModalProps) {
  const { showToast } = useToast();
  const [nomeCupom, setNomeCupom] = useState("");
  const [percentualDesconto, setPercentualDesconto] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [usoAniversario, setUsoAniversario] = useState(false);
  const [validadeInicial, setValidadeInicial] = useState("");
  const [validadeFinal, setValidadeFinal] = useState("");
  const [quantidadeMaximaUso, setQuantidadeMaximaUso] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setNomeCupom(coupon?.nome_cupom ?? "");
    setPercentualDesconto(
      coupon?.percentual_desconto !== undefined
        ? String(coupon.percentual_desconto)
        : "",
    );
    setAtivo(coupon?.ativo ?? true);
    setUsoAniversario(coupon?.uso_aniversario ?? false);
    setValidadeInicial(coupon?.validade_inicial ?? "");
    setValidadeFinal(coupon?.validade_final ?? "");
    setQuantidadeMaximaUso(
      coupon?.quantidade_maxima_uso !== null &&
        coupon?.quantidade_maxima_uso !== undefined
        ? String(coupon.quantidade_maxima_uso)
        : "",
    );
  }, [open, coupon]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        nome_cupom: nomeCupom,
        percentual_desconto: Number(percentualDesconto),
        ativo,
        uso_aniversario: usoAniversario,
        validade_inicial: validadeInicial || null,
        validade_final: validadeFinal || null,
        quantidade_maxima_uso: quantidadeMaximaUso
          ? Number(quantidadeMaximaUso)
          : null,
      };

      if (coupon) {
        await updateCoupon(coupon.id, payload);
      } else {
        await createCoupon(payload);
      }
      showToast("Cupom salvo com sucesso", "success");
      await onSaved();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar cupom",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="coupon-modal">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">
              {coupon ? "Editar cupom" : "Novo cupom"}
            </p>
            <h2>{coupon ? coupon.nome_cupom : "Cadastrar cupom"}</h2>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Nome do cupom
            <input
              value={nomeCupom}
              onChange={(e) => setNomeCupom(e.target.value)}
              placeholder="Ex: BEMVINDA10"
              required
            />
          </label>

          <label>
            Percentual de desconto
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={percentualDesconto}
              onChange={(e) => setPercentualDesconto(e.target.value)}
              placeholder="Ex: 10"
              required
            />
          </label>

          <div className="modal-form-grid">
            <label>
              Validade inicial
              <input
                type="date"
                value={validadeInicial}
                onChange={(e) => setValidadeInicial(e.target.value)}
              />
            </label>

            <label>
              Validade final
              <input
                type="date"
                value={validadeFinal}
                onChange={(e) => setValidadeFinal(e.target.value)}
              />
            </label>
          </div>

          <label>
            Quantidade máxima de uso
            <input
              type="number"
              min="0"
              value={quantidadeMaximaUso}
              onChange={(e) => setQuantidadeMaximaUso(e.target.value)}
              placeholder="Deixe vazio para ilimitado"
            />
          </label>

          <div className="modal-checkboxes">
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              Cupom ativo
            </label>

            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={usoAniversario}
                onChange={(e) => setUsoAniversario(e.target.checked)}
              />
              Cupom de aniversário
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
