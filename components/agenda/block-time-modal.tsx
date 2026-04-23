'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ConflictEvent = {
  id: string
  tipo_evento: 'agendamento' | 'bloqueio'
  hora_inicio: string
  hora_fim: string
  cliente_nome: string | null
  servico_nome: string | null
  motivo_bloqueio: string | null
}

type BlockTimeModalProps = {
  open: boolean
  selectedDate: string
  onClose: () => void
  onSaved: () => void
}

function hasTimeConflict(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
) {
  return newStart < existingEnd.slice(0, 5) && newEnd > existingStart.slice(0, 5)
}

export function BlockTimeModal({
  open,
  selectedDate,
  onClose,
  onSaved,
}: BlockTimeModalProps) {
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [motivo, setMotivo] = useState('')
  const [dayEvents, setDayEvents] = useState<ConflictEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const conflicts = useMemo(() => {
    if (!horaInicio || !horaFim) return []

    return dayEvents.filter((event) =>
      hasTimeConflict(horaInicio, horaFim, event.hora_inicio, event.hora_fim)
    )
  }, [dayEvents, horaInicio, horaFim])

  const hasConflict = conflicts.length > 0
  const invalidRange = horaInicio && horaFim && horaInicio >= horaFim

  useEffect(() => {
    if (!open) return

    async function loadDayEvents() {
      setErro('')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setErro('Sessão expirada. Faça login novamente.')
        return
      }

      const { data, error } = await supabase
        .from('v_agenda_unificada')
        .select(
          'id, tipo_evento, hora_inicio, hora_fim, cliente_nome, servico_nome, motivo_bloqueio'
        )
        .eq('profissional_id', session.user.id)
        .eq('data_referencia', selectedDate)
        .order('hora_inicio', { ascending: true })

      if (error) {
        setErro(error.message)
        return
      }

      setDayEvents((data ?? []) as ConflictEvent[])
    }

    loadDayEvents()
  }, [open, selectedDate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')

    if (!horaInicio || !horaFim) {
      setErro('Informe o horário inicial e final.')
      return
    }

    if (horaInicio >= horaFim) {
      setErro('O horário final precisa ser maior que o horário inicial.')
      return
    }

    if (hasConflict) {
      setErro('Este bloqueio conflita com um agendamento ou outro bloqueio.')
      return
    }

    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setErro('Sessão expirada. Faça login novamente.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('schedule_blocks').insert({
      profissional_id: session.user.id,
      data_bloqueio: selectedDate,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      motivo: motivo || null,
    })

    setLoading(false)

    if (error) {
      setErro(error.message)
      return
    }

    setHoraInicio('')
    setHoraFim('')
    setMotivo('')
    setDayEvents([])

    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="appointment-modal">
        <div className="modal-header">
          <div>
            <p>Indisponibilidade</p>
            <h2>Bloquear horário</h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
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
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </label>
          </div>

          {horaInicio && horaFim && !hasConflict && !invalidRange ? (
            <div className="time-success">
              Horário disponível para bloqueio: {horaInicio} até {horaFim}
            </div>
          ) : null}

          {invalidRange ? (
            <div className="time-conflict">
              <strong>Intervalo inválido</strong>
              <p>O horário final precisa ser maior que o horário inicial.</p>
            </div>
          ) : null}

          {hasConflict ? (
            <div className="time-conflict">
              <strong>Conflito de horário encontrado</strong>

              {conflicts.map((conflict) => (
                <p key={conflict.id}>
                  {conflict.hora_inicio.slice(0, 5)} -{' '}
                  {conflict.hora_fim.slice(0, 5)} ·{' '}
                  {conflict.tipo_evento === 'bloqueio'
                    ? conflict.motivo_bloqueio ?? 'Horário bloqueado'
                    : `${conflict.cliente_nome} · ${conflict.servico_nome}`}
                </p>
              ))}
            </div>
          ) : null}

          <label>
            Motivo
            <input
              type="text"
              placeholder="Ex: Almoço, exame, compromisso..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>

          {erro ? <p className="modal-error">{erro}</p> : null}

          <div className="appointment-modal-actions">
            <button type="button" className="appointment-cancel-button" onClick={onClose}>
              Cancelar
            </button>

            <button
              type="submit"
              className="appointment-save-button"
              disabled={loading || hasConflict || Boolean(invalidRange)}
            >
              {loading ? 'Bloqueando...' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}