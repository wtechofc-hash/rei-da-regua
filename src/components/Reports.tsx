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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';

type Period = 'day' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { role, userId, appointments = [], services = [], sales = [] } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [originFilter, setOriginFilter] = useState<'all' | 'appointments' | 'pdv'>('all');

  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const getPeriodRange = () => {
    const now = new Date();
    const toLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    let startStr = todayStr;
    let endStr = todayStr;

    if (period === 'day') {
      startStr = todayStr;
      endStr = todayStr;
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      startStr = toLocal(startOfWeek);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endStr = toLocal(endOfWeek);
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = toLocal(startOfMonth);
      
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endStr = toLocal(endOfMonth);
    }
    return { start: startStr, end: endStr };
  };

  const { start: filterStart, end: filterEnd } = getPeriodRange();

  // Filtrar agendamentos do usuário logado (se for pro) e período
  const userAppointments = appointments.filter(a => {
    const isProMatch = role === 'professional' ? a.professionalId === userId : true;
    const isCompleted = a.status === 'completed' || a.status === 'confirmed';
    const inPeriod = a.date >= filterStart && a.date <= filterEnd;
    return isProMatch && isCompleted && inPeriod;
  });

  // Filtrar vendas por profissional e período
  const userSales = sales.filter(s => {
    const saleDate = s.soldAt ? s.soldAt.split('T')[0] : '';
    const inPeriod = saleDate >= filterStart && saleDate <= filterEnd;
    const isProMatch = role === 'professional' ? s.professionalId === userId : true;
    return isProMatch && inPeriod;
  });

  // Cálculo de Métricas baseado nos filtros de Origem
  const totalServiceRevenue = originFilter === 'pdv' 
    ? 0 
    : userAppointments.reduce((s, a) => s + (a.priceAtTime || 0), 0);

  const totalProductRevenue = originFilter === 'appointments' 
    ? 0 
    : userSales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);

  const totalRevenue = totalServiceRevenue + totalProductRevenue;

  const totalCommissionFromAppts = originFilter === 'pdv'
    ? 0
    : userAppointments.reduce((s, a) => {
        const svc = services.find(sv => sv.id === a.serviceId);
        const rate = svc?.commission ?? 0;
        return s + (a.priceAtTime || 0) * (rate / 100);
      }, 0);

  const totalCommissionFromProducts = originFilter === 'appointments'
    ? 0
    : userSales.reduce((s, sale) => s + (sale.commissionAmount || 0), 0);

  const totalCommission = totalCommissionFromAppts + totalCommissionFromProducts;

  const avgTicket = originFilter === 'pdv'
    ? (userSales.length > 0 ? totalProductRevenue / userSales.length : 0)
    : (userAppointments.length > 0 ? totalServiceRevenue / userAppointments.length : 0);

  const transactionsCount = originFilter === 'appointments'
    ? userAppointments.length
    : originFilter === 'pdv'
      ? userSales.length
      : userAppointments.length + userSales.length;

  const stats = [
    { label: role === 'professional' ? 'Minha Produção' : 'Faturamento Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, trend: '+12.5%' },
    { label: role === 'professional' ? 'Minha Comissão' : 'Total Comissões', value: `R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, trend: '+8.2%' },
    { label: originFilter === 'pdv' ? 'Vendas Realizadas' : 'Serviços Realizados', value: transactionsCount, icon: Scissors, trend: '+5%' },
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

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
        {/* Period Selector */}
        <div className="premium-card" style={{ padding: '4px', display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { id: 'day', label: 'Hoje' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
          ].map(p => (
            <button 
              key={p.id}
              onClick={() => setPeriod(p.id as Period)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: period === p.id ? 'var(--accent-gold)' : 'transparent',
                color: period === p.id ? '#000' : '#888',
                fontSize: '0.75rem', fontWeight: '800', transition: 'all 0.2s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Origin Filter Dropdown */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <select
            value={originFilter}
            onChange={e => setOriginFilter(e.target.value as any)}
            style={{
              width: '100%', padding: '0.55rem 2.2rem 0.55rem 1rem', background: 'rgba(255,255,255,0.02)',
              border: originFilter !== 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px', color: originFilter !== 'all' ? 'var(--accent-gold)' : '#aaa',
              outline: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', appearance: 'none'
            }}
          >
            <option value="all" style={{ background: '#050505', color: '#fff' }}>Todos os Tipos</option>
            <option value="appointments" style={{ background: '#050505', color: '#fff' }}>Apenas Agendamentos</option>
            <option value="pdv" style={{ background: '#050505', color: '#fff' }}>Apenas PDV</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
        </div>
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
