'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  nome: string
  telefone: string
  data_nascimento: string | null
  email: string | null
  observacoes: string | null
  preferencias: string | null
  origem_cliente: string | null
  ativo: boolean
}

type ClientModalProps = {
  open: boolean
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

export function ClientModal({ open, client, onClose, onSaved }: ClientModalProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [email, setEmail] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [preferencias, setPreferencias] = useState('')
  const [origemCliente, setOrigemCliente] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return

    setNome(client?.nome ?? '')
    setTelefone(client?.telefone ?? '')
    setDataNascimento(client?.data_nascimento ?? '')
    setEmail(client?.email ?? '')
    setObservacoes(client?.observacoes ?? '')
    setPreferencias(client?.preferencias ?? '')
    setOrigemCliente(client?.origem_cliente ?? '')
    setErro('')
  }, [open, client])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setLoading(true)

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      data_nascimento: dataNascimento || null,
      email: email || null,
      observacoes: observacoes || null,
      preferencias: preferencias || null,
      origem_cliente: origemCliente || null,
      ativo: true,
    }

    const response = client
      ? await supabase.from('clients').update(payload).eq('id', client.id)
      : await supabase.from('clients').insert(payload)

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
      <div className="client-modal">
        <div className="modal-header">
          <div>
            <p>{client ? 'Atualizar cadastro' : 'Novo cadastro'}</p>
            <h2>{client ? 'Editar cliente' : 'Novo cliente'}</h2>
          </div>

          <button type="button" onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Nome
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </label>

          <label>
            Telefone
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(15) 99999-9999"
              required
            />
          </label>

          <label>
            Data de nascimento
            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </label>

          <label>
            Preferências
            <textarea
              value={preferencias}
              onChange={(e) => setPreferencias(e.target.value)}
              placeholder="Ex: prefere escova modelada, tom de tinta, etc."
            />
          </label>

          <label>
            Observações
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações gerais"
            />
          </label>

          <label>
            Origem do cliente
            <input
              value={origemCliente}
              onChange={(e) => setOrigemCliente(e.target.value)}
              placeholder="Instagram, indicação, Google..."
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