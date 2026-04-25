"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import {
  createBreakTime,
  deleteBreakTime,
  listMyBreakTimes,
  listMyWorkingHours,
  upsertWorkingHour,
} from "@/actions/working-hours";
import type { BreakTime, WorkingHour } from "@/types/working-hours";
import "./expediente.css";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

const DAYS = [
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 0, label: "Domingo" },
];

export default function ExpedientePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savingBreak, setSavingBreak] = useState(false);
  const [breakForm, setBreakForm] = useState({
    dia_semana: 1,
    hora_inicio: "",
    hora_fim: "",
    motivo: "Intervalo",
  });

  async function loadData() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("nome, email, avatar_url")
      .eq("id", session.user.id)
      .single();

    setProfile({
      nome: profileData?.nome ?? session.user.email ?? "Profissional",
      email: profileData?.email ?? session.user.email ?? null,
      avatar_url: profileData?.avatar_url ?? null,
    });

    const [hoursData, breaksData] = await Promise.all([
      listMyWorkingHours(),
      listMyBreakTimes(),
    ]);

    setWorkingHours(hoursData as WorkingHour[]);
    setBreakTimes(breaksData as BreakTime[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getWorkingHour(day: number) {
    return workingHours.find((item) => item.dia_semana === day);
  }

  function getBreakDayLabel(day: number) {
    return DAYS.find((item) => item.id === day)?.label ?? "Dia";
  }

  function normalizeTime(time: string | null | undefined, fallback: string) {
    if (!time) return fallback;
    return time.slice(0, 5);
  }

  async function handleToggleWorkingHour(day: number, ativo: boolean) {
    const current = getWorkingHour(day);

    try {
      setSavingDay(day);

      const updated = await upsertWorkingHour({
        id: current?.id || undefined,
        dia_semana: day,
        hora_inicio: normalizeTime(current?.hora_inicio, "08:00"),
        hora_fim: normalizeTime(current?.hora_fim, "18:00"),
        ativo,
      });

      setWorkingHours((prev) => {
        const filtered = prev.filter((item) => item.dia_semana !== day);

        return [...filtered, updated as WorkingHour].sort(
          (a, b) => a.dia_semana - b.dia_semana,
        );
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar expediente.",
      );
    } finally {
      setSavingDay(null);
    }
  }

  function updateWorkingHourDraft(
    day: number,
    field: "hora_inicio" | "hora_fim" | "ativo",
    value: string | boolean,
  ) {
    const current = getWorkingHour(day);

    const draft: WorkingHour = {
      id: current?.id ?? "",
      profissional_id: current?.profissional_id ?? "",
      dia_semana: day,
      hora_inicio:
        field === "hora_inicio"
          ? String(value)
          : normalizeTime(current?.hora_inicio, "08:00"),
      hora_fim:
        field === "hora_fim"
          ? String(value)
          : normalizeTime(current?.hora_fim, "18:00"),
      ativo: field === "ativo" ? Boolean(value) : (current?.ativo ?? true),
    };

    setWorkingHours((prev) => {
      const filtered = prev.filter((item) => item.dia_semana !== day);
      return [...filtered, draft].sort((a, b) => a.dia_semana - b.dia_semana);
    });
  }

  async function handleSaveWorkingHour(day: number) {
    const current = getWorkingHour(day);

    try {
      setSavingDay(day);

      const updated = await upsertWorkingHour({
        id: current?.id || undefined,
        dia_semana: day,
        hora_inicio: normalizeTime(current?.hora_inicio, "08:00"),
        hora_fim: normalizeTime(current?.hora_fim, "18:00"),
        ativo: current?.ativo ?? true,
      });

      setWorkingHours((prev) => {
        const filtered = prev.filter((item) => item.dia_semana !== day);
        return [...filtered, updated as WorkingHour].sort(
          (a, b) => a.dia_semana - b.dia_semana,
        );
      });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao salvar expediente.",
      );
    } finally {
      setSavingDay(null);
    }
  }

  async function handleCreateBreak() {
    if (!breakForm.hora_inicio || !breakForm.hora_fim) {
      alert("Informe início e fim do intervalo.");
      return;
    }

    try {
      setSavingBreak(true);

      const created = await createBreakTime({
        dia_semana: breakForm.dia_semana,
        hora_inicio: breakForm.hora_inicio,
        hora_fim: breakForm.hora_fim,
        motivo: breakForm.motivo || "Intervalo",
      });

      setBreakTimes((prev) =>
        [...prev, created as BreakTime].sort((a, b) => {
          if (a.dia_semana !== b.dia_semana) {
            return a.dia_semana - b.dia_semana;
          }

          return a.hora_inicio.localeCompare(b.hora_inicio);
        }),
      );

      setBreakForm({
        dia_semana: 1,
        hora_inicio: "",
        hora_fim: "",
        motivo: "Intervalo",
      });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao criar intervalo.",
      );
    } finally {
      setSavingBreak(false);
    }
  }

  async function handleDeleteBreak(id: string) {
    if (!confirm("Deseja remover este intervalo?")) return;

    try {
      await deleteBreakTime(id);
      setBreakTimes((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao remover intervalo.",
      );
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="expediente-shell">
      <Sidebar />

      <section className="expediente-main">
        <Header profile={profile} />

        <div className="expediente-toolbar">
          <div>
            <p className="expediente-eyebrow">Configurações</p>
            <h2>Expediente e intervalos</h2>
            <span>
              Defina dias de atendimento, horários disponíveis e pausas.
            </span>
          </div>
        </div>

        <section className="expediente-panel">
          <div className="expediente-section-header">
            <div>
              <h3>Dias de atendimento</h3>
              <p>Configure o expediente semanal do profissional.</p>
            </div>
          </div>

          <div className="expediente-grid">
            {DAYS.map((day) => {
              const current = getWorkingHour(day.id);
              const isActive = current?.ativo ?? true;

              return (
                <article
                  className={
                    isActive
                      ? "expediente-card"
                      : "expediente-card expediente-card-inactive"
                  }
                  key={day.id}
                >
                  <div className="expediente-card-header">
                    <div>
                      <h4>{day.label}</h4>
                      <span>{isActive ? "Ativo" : "Inativo"}</span>
                    </div>

                    <label className="expediente-switch">
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled={savingDay === day.id}
                        onChange={(e) =>
                          handleToggleWorkingHour(day.id, e.target.checked)
                        }
                      />
                      <span />
                    </label>
                  </div>

                  <div className="expediente-time-grid">
                    <label>
                      Início
                      <input
                        type="time"
                        value={normalizeTime(current?.hora_inicio, "08:00")}
                        disabled={!isActive}
                        onChange={(e) =>
                          updateWorkingHourDraft(
                            day.id,
                            "hora_inicio",
                            e.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Fim
                      <input
                        type="time"
                        value={normalizeTime(current?.hora_fim, "18:00")}
                        disabled={!isActive}
                        onChange={(e) =>
                          updateWorkingHourDraft(
                            day.id,
                            "hora_fim",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  </div>

                  <button
                    className="expediente-save-button"
                    onClick={() => handleSaveWorkingHour(day.id)}
                    disabled={savingDay === day.id}
                  >
                    {savingDay === day.id ? "Salvando..." : "Salvar dia"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="expediente-panel">
          <div className="expediente-section-header">
            <div>
              <h3>Intervalos</h3>
              <p>Crie pausas como almoço, café ou horário administrativo.</p>
            </div>
          </div>

          <div className="break-form">
            <select
              value={breakForm.dia_semana}
              onChange={(e) =>
                setBreakForm((prev) => ({
                  ...prev,
                  dia_semana: Number(e.target.value),
                }))
              }
            >
              {DAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label}
                </option>
              ))}
            </select>

            <input
              type="time"
              value={breakForm.hora_inicio}
              onChange={(e) =>
                setBreakForm((prev) => ({
                  ...prev,
                  hora_inicio: e.target.value,
                }))
              }
            />

            <input
              type="time"
              value={breakForm.hora_fim}
              onChange={(e) =>
                setBreakForm((prev) => ({
                  ...prev,
                  hora_fim: e.target.value,
                }))
              }
            />

            <input
              value={breakForm.motivo}
              onChange={(e) =>
                setBreakForm((prev) => ({
                  ...prev,
                  motivo: e.target.value,
                }))
              }
              placeholder="Motivo do intervalo"
            />

            <button
              type="button"
              onClick={handleCreateBreak}
              disabled={savingBreak}
            >
              {savingBreak ? "Salvando..." : "Adicionar intervalo"}
            </button>
          </div>

          {breakTimes.length === 0 ? (
            <div className="break-empty">Nenhum intervalo cadastrado.</div>
          ) : (
            <div className="break-list">
              {breakTimes.map((item) => (
                <div className="break-item" key={item.id}>
                  <div>
                    <strong>{getBreakDayLabel(item.dia_semana)}</strong>
                    <span>
                      {item.hora_inicio.slice(0, 5)} -{" "}
                      {item.hora_fim.slice(0, 5)} · {item.motivo ?? "Intervalo"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBreak(item.id)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
