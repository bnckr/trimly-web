"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast-provider";
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
  { id: 1, label: "Segunda-feira", short: "Seg" },
  { id: 2, label: "Terça-feira", short: "Ter" },
  { id: 3, label: "Quarta-feira", short: "Qua" },
  { id: 4, label: "Quinta-feira", short: "Qui" },
  { id: 5, label: "Sexta-feira", short: "Sex" },
  { id: 6, label: "Sábado", short: "Sáb" },
  { id: 0, label: "Domingo", short: "Dom" },
];

function sortByWeekOrder<T extends { dia_semana: number }>(items: T[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];

  return [...items].sort((a, b) => {
    const dayDiff = order.indexOf(a.dia_semana) - order.indexOf(b.dia_semana);

    if (dayDiff !== 0) return dayDiff;

    if ("hora_inicio" in a && "hora_inicio" in b) {
      return String(a.hora_inicio).localeCompare(String(b.hora_inicio));
    }

    return 0;
  });
}

export default function ExpedientePage() {
  const { showToast } = useToast();

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

    try {
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

      setWorkingHours(sortByWeekOrder(hoursData as WorkingHour[]));
      setBreakTimes(sortByWeekOrder(breaksData as BreakTime[]));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao carregar expediente.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getWorkingHour(day: number) {
    return workingHours.find((item) => item.dia_semana === day);
  }

  function getDayLabel(day: number) {
    return DAYS.find((item) => item.id === day)?.label ?? "Dia";
  }

  function getDayShort(day: number) {
    return DAYS.find((item) => item.id === day)?.short ?? "Dia";
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
        return sortByWeekOrder([...filtered, updated as WorkingHour]);
      });

      showToast(ativo ? "Expediente ativado" : "Expediente inativado", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar expediente.",
        "error",
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
      return sortByWeekOrder([...filtered, draft]);
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
        return sortByWeekOrder([...filtered, updated as WorkingHour]);
      });

      showToast(`${getDayLabel(day)} salvo com sucesso`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar expediente.",
        "error",
      );
    } finally {
      setSavingDay(null);
    }
  }

  async function handleCreateBreak() {
    if (!breakForm.hora_inicio || !breakForm.hora_fim) {
      showToast("Informe início e fim do intervalo.", "error");
      return;
    }

    if (breakForm.hora_inicio >= breakForm.hora_fim) {
      showToast("O horário final deve ser maior que o inicial.", "error");
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

      setBreakTimes((prev) => sortByWeekOrder([...prev, created as BreakTime]));

      setBreakForm({
        dia_semana: 1,
        hora_inicio: "",
        hora_fim: "",
        motivo: "Intervalo",
      });

      showToast("Intervalo adicionado com sucesso", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao criar intervalo.",
        "error",
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
      showToast("Intervalo removido com sucesso", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao remover intervalo.",
        "error",
      );
    }
  }

  const activeDays = workingHours.filter((item) => item.ativo).length;

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
            <h2>Expediente</h2>
            <span>
              {activeDays} dias ativos · {breakTimes.length} intervalos
              cadastrados
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
                      <span>{isActive ? "Aberto" : "Fechado"}</span>
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
                        disabled={!isActive || savingDay === day.id}
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
                        disabled={!isActive || savingDay === day.id}
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
            <label>
              Dia
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
            </label>

            <label>
              Início
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
            </label>

            <label>
              Fim
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
            </label>

            <label>
              Motivo
              <input
                value={breakForm.motivo}
                onChange={(e) =>
                  setBreakForm((prev) => ({
                    ...prev,
                    motivo: e.target.value,
                  }))
                }
                placeholder="Ex: Almoço"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateBreak}
              disabled={savingBreak}
            >
              {savingBreak ? "Salvando..." : "Adicionar"}
            </button>
          </div>

          {breakTimes.length === 0 ? (
            <div className="break-empty">Nenhum intervalo cadastrado.</div>
          ) : (
            <div className="break-list">
              {breakTimes.map((item) => (
                <article className="break-item" key={item.id}>
                  <div className="break-day-badge">
                    {getDayShort(item.dia_semana)}
                  </div>

                  <div className="break-content">
                    <strong>{getDayLabel(item.dia_semana)}</strong>
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
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
