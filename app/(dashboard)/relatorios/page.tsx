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

type ReportSummary = {
  faturamentoBruto: number;
  faturamentoLiquido: number;
  descontos: number;
  taxas: number;
  totalAtendimentos: number;
  totalFinalizados: number;
  totalCancelados: number;
  totalFaltas: number;
  ticketMedio: number;
};

type RankedItem = {
  nome?: string;
  nome_cupom?: string;
  total: number;
};

function getMonthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString(
    "en-CA",
  );
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

function formatDateBR(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("pt-BR");
}

function RankingList({
  items,
  emptyMessage,
  getLabel,
  suffix,
}: {
  items: RankedItem[];
  emptyMessage: string;
  getLabel: (item: RankedItem) => string;
  suffix: string;
}) {
  if (items.length === 0) {
    return <p className="report-empty">{emptyMessage}</p>;
  }

  return (
    <div className="report-list">
      {items.map((item, index) => (
        <div key={`${getLabel(item)}-${index}`} className="report-item">
          <span className="report-rank">#{index + 1}</span>

          <div className="report-item-info">
            <strong>{getLabel(item)}</strong>
            <span>
              {item.total} {suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [services, setServices] = useState<RankedItem[]>([]);
  const [clients, setClients] = useState<RankedItem[]>([]);
  const [coupons, setCoupons] = useState<RankedItem[]>([]);
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(true);

  async function loadReports() {
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

    const [reportData, servicesData, clientsData, couponsData] =
      await Promise.all([
        getMyDashboardReport(startDate, endDate),
        getMostRequestedServices(),
        getFrequentClients(),
        getMostUsedCoupons(),
      ]);

    setReport(reportData as ReportSummary);
    setServices((servicesData ?? []) as RankedItem[]);
    setClients((clientsData ?? []) as RankedItem[]);
    setCoupons((couponsData ?? []) as RankedItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="relatorios-toolbar-content">
            <p className="relatorios-eyebrow">Análise do negócio</p>
            <h2>Relatórios</h2>
            <span>
              {formatDateBR(startDate)} até {formatDateBR(endDate)}
            </span>
          </div>

          <div className="relatorios-filters">
            <label>
              Início
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label>
              Fim
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>

            <button type="button" onClick={loadReports} disabled={loading}>
              {loading ? "Filtrando..." : "Filtrar"}
            </button>
          </div>
        </div>

        <div className="relatorios-grid">
          <div className="report-card highlight-card">
            <span>Faturamento bruto</span>
            <strong>{formatCurrency(report.faturamentoBruto)}</strong>
          </div>

          <div className="report-card highlight-card">
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
            <RankingList
              items={services}
              emptyMessage="Nenhum serviço encontrado."
              getLabel={(item) => item.nome ?? "Serviço"}
              suffix="atendimentos"
            />
          </div>

          <div className="list-card">
            <h3>Clientes frequentes</h3>
            <RankingList
              items={clients}
              emptyMessage="Nenhum cliente encontrado."
              getLabel={(item) => item.nome ?? "Cliente"}
              suffix="visitas"
            />
          </div>

          <div className="list-card">
            <h3>Cupons mais usados</h3>
            <RankingList
              items={coupons}
              emptyMessage="Nenhum cupom usado."
              getLabel={(item) => item.nome_cupom ?? "Cupom"}
              suffix="usos"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
