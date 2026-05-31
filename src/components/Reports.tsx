import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Scissors, 
  Calendar,
  ChevronDown,
  Download,
  Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useApp } from '../context/AppContext';

type Period = 'day' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { role, userId, appointments = [], services = [], sales = [] } = useApp();
  const [period, setPeriod] = useState<Period>('week');

  // Filtrar agendamentos do usuário logado (se for pro)
  const userAppointments = appointments.filter(a => {
    const isProMatch = role === 'professional' ? a.professionalId === userId : true;
    const isCompleted = a.status === 'completed' || a.status === 'confirmed';
    return isProMatch && isCompleted;
  });

  // Filtrar vendas por profissional
  const userSales = sales.filter(s => {
    if (role === 'professional') return s.professionalId === userId;
    return true;
  });

  // Cálculo de Métricas
  const totalServiceRevenue = userAppointments.reduce((s, a) => s + (a.priceAtTime || 0), 0);
  const totalProductRevenue = userSales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);
  const totalRevenue = totalServiceRevenue + totalProductRevenue;

  const totalCommissionFromAppts = userAppointments.reduce((s, a) => {
    const svc = services.find(sv => sv.id === a.serviceId);
    const rate = svc?.commission ?? 0;
    return s + (a.priceAtTime || 0) * (rate / 100);
  }, 0);
  const totalCommissionFromProducts = userSales.reduce((s, sale) => s + (sale.commissionAmount || 0), 0);
  const totalCommission = totalCommissionFromAppts + totalCommissionFromProducts;

  const avgTicket = userAppointments.length > 0 ? totalServiceRevenue / userAppointments.length : 0;

  const stats = [
    { label: role === 'professional' ? 'Minha Produção' : 'Faturamento Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, trend: '+12.5%' },
    { label: role === 'professional' ? 'Minha Comissão' : 'Total Comissões', value: `R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, trend: '+8.2%' },
    { label: 'Serviços Realizados', value: userAppointments.length, icon: Scissors, trend: '+5%' },
    { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: BarChart3, trend: '-2%' },
  ];

  const chartData = [
    { name: 'Seg', value: totalRevenue * 0.1 },
    { name: 'Ter', value: totalRevenue * 0.15 },
    { name: 'Qua', value: totalRevenue * 0.12 },
    { name: 'Qui', value: totalRevenue * 0.20 },
    { name: 'Sex', value: totalRevenue * 0.25 },
    { name: 'Sáb', value: totalRevenue * 0.18 },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Relatórios</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {role === 'professional' ? 'Acompanhe seu desempenho e comissões.' : 'Análise detalhada do faturamento e produtividade.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="premium-card" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: '14px' }}>
        {[
          { id: 'day', label: 'Hoje' },
          { id: 'week', label: 'Semana' },
          { id: 'month', label: 'Mês' },
          { id: 'custom', label: 'Personalizado' },
        ].map(p => (
          <button 
            key={p.id}
            onClick={() => setPeriod(p.id as Period)}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: period === p.id ? 'var(--accent-gold)' : 'transparent',
              color: period === p.id ? '#000' : '#888',
              fontSize: '0.8rem', fontWeight: '800', transition: 'all 0.2s'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="premium-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px', borderRadius: '12px', color: 'var(--accent-gold)' }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: s.trend.startsWith('+') ? '#00e676' : '#ff1744', background: s.trend.startsWith('+') ? 'rgba(0,230,118,0.05)' : 'rgba(255,23,68,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
                  {s.trend}
                </span>
              </div>
              <p style={{ margin: '0 0 5px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{s.value}</h2>
            </div>
          );
        })}
      </div>

      {/* Main Chart */}
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem' }}>Produtividade por Período</h3>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 12}} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="value" stroke="var(--accent-gold)" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
