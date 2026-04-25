"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getMyDashboardReport,
  getMostRequestedServices,
  getFrequentClients,
  getMostUsedCoupons,
} from "@/actions/reports";
import "./relatorios.css";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

function getMonthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toLocaleDateString("en-CA");
}

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function RelatoriosPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [report, setReport] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

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

    const [reportData, servicesData, clientsData, couponsData] =
      await Promise.all([
        getMyDashboardReport(startDate, endDate),
        getMostRequestedServices(),
        getFrequentClients(),
        getMostUsedCoupons(),
      ]);

    setReport(reportData);
    setServices(servicesData);
    setClients(clientsData);
    setCoupons(couponsData);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading || !report) {
    return <LoadingSpinner />;
  }

  return (
    <main className="relatorios-shell">
      <Sidebar />

      <section className="relatorios-main">
        <Header profile={profile} />

        <div className="relatorios-toolbar">
          <div>
            <p className="relatorios-eyebrow">Análise do negócio</p>
            <h2>Relatórios</h2>
            <span>
              Período de {startDate.split("-").reverse().join("/")} até{" "}
              {endDate.split("-").reverse().join("/")}
            </span>
          </div>

          <div className="relatorios-filters">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <button type="button" onClick={loadReports}>
              Filtrar
            </button>
          </div>
        </div>

        <div className="relatorios-grid">
          <div className="report-card">
            <span>Faturamento bruto</span>
            <strong>{formatCurrency(report.faturamentoBruto)}</strong>
          </div>

          <div className="report-card">
            <span>Faturamento líquido</span>
            <strong>{formatCurrency(report.faturamentoLiquido)}</strong>
          </div>

          <div className="report-card">
            <span>Descontos</span>
            <strong>{formatCurrency(report.descontos)}</strong>
          </div>

          <div className="report-card">
            <span>Taxas</span>
            <strong>{formatCurrency(report.taxas)}</strong>
          </div>

          <div className="report-card">
            <span>Atendimentos</span>
            <strong>{report.totalAtendimentos}</strong>
          </div>

          <div className="report-card">
            <span>Finalizados</span>
            <strong>{report.totalFinalizados}</strong>
          </div>

          <div className="report-card">
            <span>Cancelados</span>
            <strong>{report.totalCancelados}</strong>
          </div>

          <div className="report-card">
            <span>Faltas</span>
            <strong>{report.totalFaltas}</strong>
          </div>

          <div className="report-card">
            <span>Ticket médio</span>
            <strong>{formatCurrency(report.ticketMedio)}</strong>
          </div>
        </div>

        <div className="relatorios-lists">
          <div className="list-card">
            <h3>Serviços mais vendidos</h3>

            {services.length === 0 ? (
              <p className="report-empty">Nenhum serviço encontrado.</p>
            ) : (
              services.map((item, index) => (
                <div key={index} className="list-item">
                  <span>{item.nome}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            )}
          </div>

          <div className="list-card">
            <h3>Clientes frequentes</h3>

            {clients.length === 0 ? (
              <p className="report-empty">Nenhum cliente encontrado.</p>
            ) : (
              clients.map((item, index) => (
                <div key={index} className="list-item">
                  <span>{item.nome}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            )}
          </div>

          <div className="list-card">
            <h3>Cupons mais usados</h3>

            {coupons.length === 0 ? (
              <p className="report-empty">Nenhum cupom usado.</p>
            ) : (
              coupons.map((item, index) => (
                <div key={index} className="list-item">
                  <span>{item.nome_cupom}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}