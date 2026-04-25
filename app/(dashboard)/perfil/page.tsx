"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getMyProfile, updateMyProfile, uploadAvatar } from "@/actions/profile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast-provider";
import "./perfil.css";

type Profile = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidade: string | null;
  cor_agenda: string | null;
  intervalo_padrao_minutos: number;
  observacoes: string | null;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function getInitials(nome: string | null | undefined) {
  if (!nome) return "?";

  const parts = nome.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function PerfilPage() {
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyProfile();
        setProfile(data as Profile);
      } catch (error) {
        showToast("Erro ao carregar perfil", "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [showToast]);

  function updateProfileField<K extends keyof Profile>(
    field: K,
    value: Profile[K],
  ) {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  }

  async function handleSave() {
    if (!profile) return;

    try {
      setSaving(true);

      await updateMyProfile({
        nome: profile.nome,
        telefone: profile.telefone,
        especialidade: profile.especialidade,
        cor_agenda: profile.cor_agenda,
        intervalo_padrao_minutos: Number(profile.intervalo_padrao_minutos ?? 0),
        observacoes: profile.observacoes,
      });

      showToast("Perfil atualizado com sucesso", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar perfil",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);

      const url = await uploadAvatar(file);

      setProfile((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          avatar_url: url,
        };
      });

      showToast("Foto atualizada com sucesso", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao atualizar foto",
        "error",
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  if (loading || !profile) return <LoadingSpinner />;

  return (
    <main className="perfil-shell">
      <Sidebar />

      <section className="perfil-main">
        <Header profile={profile} />

        <div className="perfil-card">
          <div className="perfil-card-header">
            <div>
              <p className="perfil-eyebrow">Configurações</p>
              <h2>Perfil profissional</h2>
              <span>Atualize seus dados, foto e preferências da agenda.</span>
            </div>
          </div>

          <div className="perfil-form">
            <section className="perfil-avatar-card">
              <div className="perfil-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`Foto de ${profile.nome}`} />
                ) : (
                  <div className="avatar-fallback">
                    {getInitials(profile.nome)}
                  </div>
                )}
              </div>

              <div className="perfil-avatar-info">
                <strong>{profile.nome || "Profissional"}</strong>
                <span>{profile.email ?? "E-mail não informado"}</span>

                <label className="avatar-upload-button">
                  {uploadingAvatar ? "Enviando..." : "Alterar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
            </section>

            <section className="perfil-section">
              <div className="perfil-section-title">
                <h3>Dados profissionais</h3>
                <p>Essas informações aparecem no sistema e nos agendamentos.</p>
              </div>

              <div className="perfil-fields-grid">
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    value={profile.nome || ""}
                    onChange={(e) => updateProfileField("nome", e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    value={profile.telefone || ""}
                    onChange={(e) =>
                      updateProfileField("telefone", e.target.value)
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-group full">
                  <label>Especialidade</label>
                  <input
                    value={profile.especialidade || ""}
                    onChange={(e) =>
                      updateProfileField("especialidade", e.target.value)
                    }
                    placeholder="Ex: Cabeleireira, manicure, barbeira..."
                  />
                </div>
              </div>
            </section>

            <section className="perfil-section">
              <div className="perfil-section-title">
                <h3>Agenda</h3>
                <p>Personalize sua cor e o intervalo padrão entre atendimentos.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cor da agenda</label>

                  <div className="color-input-row">
                    <input
                      type="color"
                      value={profile.cor_agenda || "#71bbef"}
                      onChange={(e) =>
                        updateProfileField("cor_agenda", e.target.value)
                      }
                    />

                    <span>{profile.cor_agenda || "#71bbef"}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Intervalo entre atendimentos (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={profile.intervalo_padrao_minutos ?? 0}
                    onChange={(e) =>
                      updateProfileField(
                        "intervalo_padrao_minutos",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="perfil-section">
              <div className="perfil-section-title">
                <h3>Observações</h3>
                <p>Anotações internas sobre sua rotina ou preferências.</p>
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea
                  value={profile.observacoes || ""}
                  onChange={(e) =>
                    updateProfileField("observacoes", e.target.value)
                  }
                  placeholder="Ex: Prefiro deixar 10 minutos entre atendimentos..."
                />
              </div>
            </section>

            <div className="perfil-footer">
              <button
                className="perfil-save-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
