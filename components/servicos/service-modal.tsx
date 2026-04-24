'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  nome: string
  valor: number
  duracao_minutos: number
  ativo: boolean
}

type ServiceModalProps = {
  open: boolean
  service: Service | null
  onClose: () => void
  onSaved: () => void
}

export function ServiceModal({ open, service, onClose, onSaved }: ServiceModalProps) {
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [duracao, setDuracao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return

    setNome(service?.nome ?? '')
    setValor(service ? String(service.valor) : '')
    setDuracao(service ? String(service.duracao_minutos) : '')
    setErro('')
  }, [open, service])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setLoading(true)

    const payload = {
      nome: nome.trim(),
      valor: Number(valor),
      duracao_minutos: Number(duracao),
      ativo: true,
    }

    const response = service
      ? await supabase.from('services').update(payload).eq('id', service.id)
      : await supabase.from('services').insert(payload)

    setLoading(false)

    if (response.error) {
      setErro(response.error.message)
      return
    }

    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="service-modal">
        <div className="modal-header">
          <div>
            <p>{service ? 'Atualizar serviço' : 'Novo serviço'}</p>
            <h2>{service ? 'Editar serviço' : 'Novo serviço'}</h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Nome do serviço
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Corte feminino"
              required
            />
          </label>

          <label>
            Valor
            <input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 120.00"
              required
            />
          </label>

          <label>
            Duração em minutos
            <input
              type="number"
              min="1"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              placeholder="Ex: 60"
              required
            />
          </label>

          {erro ? <p className="modal-error">{erro}</p> : null}

          <div className="appointment-modal-actions">
            <button type="button" className="appointment-cancel-button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="appointment-save-button" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}