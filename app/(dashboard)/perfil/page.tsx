"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getMyProfile, updateMyProfile, uploadAvatar } from "@/actions/profile";
import "./perfil.css";
import { Toast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getMyProfile();
      setProfile(data);
      setLoading(false);
    }

    load();
  }, []);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  async function handleSave() {
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

      setToast({
        message: "Perfil atualizado com sucesso",
        type: "success",
      });
    } catch (error) {
      setToast({
        message: "Erro ao salvar perfil",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function getInitials(nome: string) {
    if (!nome) return "?";

    const parts = nome.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  async function handleAvatarChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadAvatar(file);

    setProfile((prev: any) => ({
      ...prev,
      avatar_url: url,
    }));
  }

  if (loading) return <LoadingSpinner />;

  return (
    <main className="perfil-shell">
      <Sidebar />

      <section className="perfil-main">
        <Header profile={profile} />
        <div className="perfil-card">
          <h2>Perfil profissional</h2>
          <div className="perfil-form">
            <div className="perfil-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`Foto de ${profile.nome}`} />
              ) : (
                <div className="avatar-fallback">
                  {getInitials(profile.nome)}
                </div>
              )}
              <input type="file" onChange={handleAvatarChange} />
            </div>

            <div className="form-group">
              <label>Nome</label>
              <input
                value={profile.nome || ""}
                onChange={(e) =>
                  setProfile({ ...profile, nome: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                value={profile.telefone || ""}
                onChange={(e) =>
                  setProfile({ ...profile, telefone: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Especialidade</label>
              <input
                value={profile.especialidade || ""}
                onChange={(e) =>
                  setProfile({ ...profile, especialidade: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group small">
                <label>Cor da agenda</label>
                <input
                  type="color"
                  value={profile.cor_agenda || "#71bbef"}
                  onChange={(e) =>
                    setProfile({ ...profile, cor_agenda: e.target.value })
                  }
                />
              </div>

              <div className="form-group small">
                <label>Intervalo (min)</label>
                <input
                  type="number"
                  min="0"
                  value={profile.intervalo_padrao_minutos ?? 0}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      intervalo_padrao_minutos: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <button
              className="perfil-save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
              {toast && (
                <Toast
                  message={toast.message}
                  type={toast.type}
                  onClose={() => setToast(null)}
                />
              )}
            </button>
          </div>{" "}
        </div>
      </section>
    </main>
  );
}
