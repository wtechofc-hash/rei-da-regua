import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Clock, Percent, ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { PaymentMethodBadge } from './PaymentMethodBadge';

interface DashboardProps {
  onViewAll?: () => void;
}

const PIE_COLORS = ['#d4af37', '#a68a2d', '#7d6822', '#f0d060'];

const Dashboard: React.FC<DashboardProps> = ({ onViewAll }) => {
  const { 
    role, 
    userId, 
    appointments = [], 
    clients = [], 
    services = [], 
    profiles = [], 
    sales = [],
    abatements = [],
    abatementParticipants = []
  } = useApp();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Dispara um resize com um pequeno delay após a montagem para forçar o recálculo do layout (reflow)
    // dos componentes SVGs/Canvas do Recharts que dependem da largura do container pai.
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);
  const [proFilter, setProFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'appointments' | 'pdv'>('all');

  const baseAppointments = role === 'professional'
    ? appointments.filter(a => a.professionalId === userId)
    : (proFilter !== 'all'
        ? appointments.filter(a => a.professionalId === proFilter)
        : appointments);

  const userAppointments = baseAppointments.filter(appt => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'não_informado') {
      return !appt.paymentMethod || appt.paymentMethod === '';
    }
    return appt.paymentMethod === paymentFilter;
  });

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

    if (period === 'today') {
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
    } else if (period === 'custom') {
      startStr = customStart;
      endStr = customEnd;
    }
    return { start: startStr, end: endStr };
  };

  const { start: filterStart, end: filterEnd } = getPeriodRange();

  const periodAppointments = userAppointments.filter(a => a.date >= filterStart && a.date <= filterEnd);

  // Filter sales by period and professional (for commissions on products)
  const periodSales = sales.filter(s => {
    const saleDate = s.soldAt ? s.soldAt.split('T')[0] : '';
    const inPeriod = saleDate >= filterStart && saleDate <= filterEnd;
    if (!inPeriod) return false;
    if (role === 'professional') return s.professionalId === userId;
    if (proFilter !== 'all') return s.professionalId === proFilter;
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'não_informado') {
        return !s.paymentMethod || s.paymentMethod === '';
      }
      return s.paymentMethod === paymentFilter;
    }
    return true;
  });

  const periodAppts = periodAppointments.length;
  const revenueInPeriod = periodAppointments
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((s, a) => s + (a.priceAtTime || 0), 0);

  // Product sales revenue
  const productRevenueInPeriod = periodSales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);

  const commissionFromAppointments = periodAppointments
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => {
      const svc = services.find(s => s.id === a.serviceId);
      const rate = svc?.commission ?? 0;
      return sum + (a.priceAtTime || 0) * (rate / 100);
    }, 0);

  // Product sales commission
  const commissionFromProducts = periodSales.reduce((sum, s) => sum + (s.commissionAmount || 0), 0);

  const commissionInPeriod = commissionFromAppointments + commissionFromProducts;

  const activeClientsInPeriod = new Set(periodAppointments.map(a => a.clientId)).size;

  // Adjust calculations based on Origin Filter
  const displayTransactionsCount = (() => {
    if (originFilter === 'appointments') return periodAppts;
    if (originFilter === 'pdv') return periodSales.length;
    return periodAppts + periodSales.length;
  })();

  const displayRevenue = (() => {
    if (originFilter === 'appointments') return revenueInPeriod;
    if (originFilter === 'pdv') return productRevenueInPeriod;
    return revenueInPeriod + productRevenueInPeriod;
  })();

  const displayCommission = (() => {
    if (originFilter === 'appointments') return commissionFromAppointments;
    if (originFilter === 'pdv') return commissionFromProducts;
    return commissionInPeriod;
  })();

  // Abates calculation inside period
  const displayAbates = (() => {
    return abatementParticipants.filter(p => {
      const abt = abatements.find(a => a.id === p.abatementId);
      if (!abt) return false;
      const inPeriod = abt.date >= filterStart && abt.date <= filterEnd;
      if (!inPeriod || p.status !== 'pendente') return false;
      if (role === 'professional') return p.participantId === userId;
      if (proFilter !== 'all') {
        if (proFilter === 'owner') return p.participantType === 'owner';
        return p.participantId === proFilter;
      }
      return p.participantType === 'professional';
    }).reduce((sum, p) => sum + p.amount, 0);
  })();

  const displayCommissionNet = displayCommission - displayAbates;

  const stats = [
    { 
      label: originFilter === 'appointments'
        ? (period === 'today' ? 'Agendamentos Hoje' : 'Agendamentos no Período')
        : originFilter === 'pdv'
          ? (period === 'today' ? 'Vendas Hoje (PDV)' : 'Vendas no Período (PDV)')
          : (period === 'today' ? 'Total Operações Hoje' : 'Total Operações no Período'), 
      value: displayTransactionsCount, 
      sub: period === 'today' ? 'Hoje' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mês' : 'Personalizado', 
      icon: Calendar, 
      gold: false 
    },
    { 
      label: period === 'today' ? 'Faturamento Hoje' : 'Faturamento no Período',  
      value: `R$ ${displayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      sub: originFilter === 'appointments' ? 'Apenas Serviços' : originFilter === 'pdv' ? 'Apenas Produtos' : 'Serviços + Produtos', 
      icon: DollarSign, 
      gold: true 
    },
    { 
      label: role === 'professional' 
        ? 'Minha Comissão Líquida' 
        : (period === 'today' ? 'Comissão Líquida Hoje' : 'Comissão Líquida no Período'),
      value: `R$ ${displayCommissionNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      sub: `Bruto: R$ ${displayCommission.toFixed(2)} | Abatido: R$ ${displayAbates.toFixed(2)}`,
      icon: Percent,
      gold: false
    },
    { 
      label: 'Clientes Ativos',   
      value: originFilter === 'pdv' ? 0 : activeClientsInPeriod, 
      sub: 'No período selecionado', 
      icon: Users, 
      gold: false 
    },
  ];

  const totalRev = periodAppointments.filter(a => a.status === 'confirmed' || a.status === 'completed').reduce((s, a) => s + (a.priceAtTime || 0), 0);
  const base = Math.max(totalRev, 800);
  const weeklyData = [
    { name: 'Seg', value: Math.round(base * 0.35) },
    { name: 'Ter', value: Math.round(base * 0.55) },
    { name: 'Qua', value: Math.round(base * 0.45) },
    { name: 'Qui', value: Math.round(base * 0.80) },
    { name: 'Sex', value: Math.round(base * 1.00) },
    { name: 'Sáb', value: Math.round(base * 0.90) },
    { name: 'Dom', value: Math.round(base * 0.65) },
  ];

  const svcCounts: Record<string, number> = {};
  periodAppointments.forEach(a => {
    const s = services.find(sv => sv.id === a.serviceId);
    if (s) svcCounts[s.name] = (svcCounts[s.name] || 0) + 1;
  });
  const pieData = Object.entries(svcCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 4);
  if (pieData.length === 0) pieData.push({ name: 'Sem dados', value: 1 });

  // Unified transactions for Dashboard
  const unifiedTransactions = (() => {
    const list: any[] = [];
    
    // Add appointments if originFilter is not 'pdv'
    if (originFilter !== 'pdv') {
      periodAppointments
        .filter(a => a.status !== 'cancelled')
        .forEach(a => {
          list.push({
            id: a.id,
            type: 'appointment',
            date: a.date,
            time: a.time,
            clientName: a.clientName,
            detailName: services.find(s => s.id === a.serviceId)?.name || 'Serviço',
            amount: a.priceAtTime || 0,
            paymentMethod: a.paymentMethod,
            professionalId: a.professionalId,
            status: a.status
          });
        });
    }

    // Add sales if originFilter is not 'appointments'
    if (originFilter !== 'appointments') {
      periodSales.forEach(s => {
        list.push({
          id: s.id,
          type: 'pdv',
          date: s.soldAt ? s.soldAt.split('T')[0] : todayStr,
          time: s.soldAt ? s.soldAt.split('T')[1]?.slice(0, 5) : '12:00',
          clientName: 'Cliente Presencial',
          detailName: s.notes || 'Venda de Produtos',
          amount: s.totalAmount || 0,
          paymentMethod: s.paymentMethod,
          professionalId: s.professionalId,
          status: 'completed'
        });
      });
    }

    return list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  })();

  const statusBadge: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: 'Pendente',   bg: 'rgba(255,179,0,0.12)',   color: '#ffb300' },
    confirmed: { label: 'Confirmado', bg: 'rgba(33,150,243,0.12)',  color: '#2196f3' },
    completed: { label: 'Concluído',  bg: 'rgba(0,230,118,0.12)',   color: '#00e676' },
    cancelled: { label: 'Cancelado',  bg: 'rgba(255,23,68,0.12)',   color: '#ff1744' },
  };

  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Bem-vindo(a) à Rei da Régua Barbearia
          </p>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>{dateLabel}</p>
      </header>

      {/* Period & Filter Selector — vertical stack, no flex space-between */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>

        {/* Row 1: Period buttons */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div className="premium-card" style={{ padding: '4px', display: 'inline-flex', background: '#111', borderRadius: '12px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'custom', label: 'Personalizado' },
            ].map(p => (
              <button 
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: period === p.id ? 'var(--accent-gold)' : 'transparent',
                  color: period === p.id ? '#000' : '#888',
                  fontSize: '0.75rem', fontWeight: '800', transition: 'background 0.2s, color 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>De:</span>
              <input 
                type="date" 
                value={customStart} 
                onChange={e => setCustomStart(e.target.value)} 
                style={{ background: '#111', border: '1px solid #333', color: 'white', fontSize: '0.75rem', borderRadius: '6px', padding: '4px 8px', outline: 'none' }} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Até:</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)} 
                style={{ background: '#111', border: '1px solid #333', color: 'white', fontSize: '0.75rem', borderRadius: '6px', padding: '4px 8px', outline: 'none' }} 
              />
            </div>
          )}
        </div>

        {/* Row 2: Filter selects — 2 columns (professional) or 3 columns (owner) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: role === 'owner' ? 'repeat(3, 1fr)' : '1fr 1fr', 
          gap: '8px', 
          width: '100%'
        }}>
          {/* Origin Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value as any)}
              style={{
                width: '100%', padding: '0.55rem 2.2rem 0.55rem 1rem', background: '#111',
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

          {/* Payment Method Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 2.2rem 0.55rem 1rem', background: '#111',
                border: paymentFilter !== 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', color: paymentFilter !== 'all' ? 'var(--accent-gold)' : '#aaa',
                outline: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', appearance: 'none'
              }}
            >
              <option value="all" style={{ background: '#050505', color: '#fff' }}>Todas as Formas</option>
              <option value="dinheiro" style={{ background: '#050505', color: '#fff' }}>Dinheiro</option>
              <option value="pix" style={{ background: '#050505', color: '#fff' }}>Pix</option>
              <option value="cartao" style={{ background: '#050505', color: '#fff' }}>Cartão</option>
              <option value="não_informado" style={{ background: '#050505', color: '#fff' }}>Não informado</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          </div>

          {/* Professional Filter for Shop Owner */}
          {role === 'owner' && (
            <div style={{ position: 'relative' }}>
              <select
                value={proFilter}
                onChange={e => setProFilter(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 2.2rem 0.55rem 1rem', background: '#111',
                  border: proFilter !== 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', color: proFilter !== 'all' ? 'var(--accent-gold)' : '#aaa',
                  outline: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', appearance: 'none'
                }}
              >
                <option value="all" style={{ background: '#050505', color: '#fff' }}>Todos Profissionais</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#050505', color: '#fff' }}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="premium-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{s.label}</p>
                <div style={{ background: 'rgba(212,175,55,0.08)', padding: '6px', borderRadius: '8px', color: '#d4af37' }}>
                  <Icon size={15} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 4px', color: s.gold ? '#d4af37' : 'white' }}>{s.value}</h2>
              <p style={{ fontSize: '0.72rem', color: '#00c853', margin: 0 }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '2rem' }} className="charts-row">
        <div className="premium-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Faturamento Semanal</h3>
          <div style={{ height: '220px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="value" stroke="#d4af37" fill="url(#goldGrad)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Mix de Serviços</h3>
          <div style={{ height: '170px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius="52%" outerRadius="72%" paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                  {item.name}
                </span>
                <span style={{ fontWeight: '700', color: 'white' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission Breakdown - only for professionals */}
      {role === 'professional' && (
        <div className="premium-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 4px' }}>Detalhamento de Comissões</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Comissão por serviço no período selecionado
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total no Período</p>
              <p style={{ fontSize: '1.3rem', fontWeight: '900', color: '#d4af37', margin: 0 }}>
                R$ {commissionInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {(() => {
            const commissionEntries = periodAppointments
              .filter(a => a.status === 'confirmed' || a.status === 'completed')
              .map(a => {
                const svc = services.find(s => s.id === a.serviceId);
                const rate = svc?.commission ?? 0;
                const commissionValue = (a.priceAtTime || 0) * (rate / 100);
                return { ...a, commissionValue, rate, svcName: svc?.name ?? '—' };
              })
              .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

            if (commissionEntries.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <Percent size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Nenhuma comissão no período selecionado.</p>
                </div>
              );
            }

            const formatDate = (dateStr: string) => {
              if (!dateStr) return '—';
              const parts = dateStr.split('-');
              if (parts.length !== 3) return dateStr;
              const [year, month, day] = parts;
              return `${day}/${month}/${year}`;
            };

            return (
              <>
                {/* Desktop Table */}
                <div id="commission-table-desktop" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Data', 'Horário', 'Cliente', 'Serviço', 'Valor do Serviço', 'Taxa', 'Comissão'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {commissionEntries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</td>
                          <td style={{ padding: '1rem', fontWeight: '700', color: '#d4af37', whiteSpace: 'nowrap' }}>{entry.time.slice(0, 5)}</td>
                          <td style={{ padding: '1rem', fontWeight: '600' }}>{entry.clientName}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{entry.svcName}</td>
                          <td style={{ padding: '1rem', fontWeight: '700', color: 'white' }}>
                            R$ {(entry.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>
                              {entry.rate}%
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: '900', color: '#00e676', fontSize: '0.95rem' }}>
                            R$ {entry.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid rgba(212,175,55,0.2)' }}>
                        <td colSpan={6} style={{ padding: '1rem', fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Total:</td>
                        <td style={{ padding: '1rem', fontWeight: '900', color: '#d4af37', fontSize: '1rem' }}>
                          R$ {commissionInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div id="commission-list-mobile" style={{ display: 'none', flexDirection: 'column', gap: '0.85rem' }}>
                  {commissionEntries.map((entry) => (
                    <div key={entry.id} style={{
                      padding: '1.2rem', background: 'rgba(255,255,255,0.02)',
                      borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', flexDirection: 'column', gap: '10px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}>
                      {/* Header Row: Date/Time + Commission Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontWeight: '800', color: '#d4af37', fontSize: '0.82rem', 
                          whiteSpace: 'nowrap', background: 'rgba(212,175,55,0.06)', 
                          padding: '4px 10px', borderRadius: '8px', 
                          border: '1px solid rgba(212,175,55,0.12)' 
                        }}>
                          {entry.date.split('-').reverse().join('/')} às {entry.time.slice(0, 5)}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                            Comissão
                          </span>
                          <span style={{ fontWeight: '900', color: '#00e676', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                            R$ {entry.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Client Name Row */}
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                        {entry.clientName}
                      </div>

                      {/* Details Row: Service, Price & Rate */}
                      <div style={{ 
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', 
                        gap: '8px 12px', fontSize: '0.78rem', color: 'var(--text-secondary)', 
                        paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)' 
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#eee', fontWeight: '600' }}>{entry.svcName}</span>
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          Valor: <strong style={{ color: '#eee' }}>R$ {(entry.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          Taxa: <strong style={{ color: '#d4af37' }}>{entry.rate}%</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total no Período</span>
                    <span style={{ fontWeight: '900', color: '#d4af37', fontSize: '1.1rem' }}>
                      R$ {commissionInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Unified Transactions History */}
      <div className="premium-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
            {originFilter === 'appointments'
              ? (period === 'today' ? 'Agendamentos Hoje' : 'Agendamentos no Período')
              : originFilter === 'pdv'
                ? (period === 'today' ? 'Vendas Hoje (PDV)' : 'Vendas no Período (PDV)')
                : (period === 'today' ? 'Histórico Geral Hoje' : 'Histórico Geral no Período')}
          </h3>
          {onViewAll && originFilter !== 'pdv' && (
            <button onClick={onViewAll} style={{ background: 'transparent', border: 'none', color: '#d4af37', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
              Ver todos agendamentos →
            </button>
          )}
        </div>

        {unifiedTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <p>Nenhuma transação encontrada no período.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div id="desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Origem', 'Data', 'Horário', 'Cliente', 'Serviço / Produtos', 'Valor', 'Pagamento', 'Profissional', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unifiedTransactions.slice(0, 15).map(item => {
                    const prof = profiles.find(p => p.id === item.professionalId);
                    
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return '—';
                      const parts = dateStr.split('-');
                      if (parts.length !== 3) return dateStr;
                      const [year, month, day] = parts;
                      return `${day}/${month}/${year}`;
                    };

                    const isPdv = item.type === 'pdv';

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            background: isPdv ? 'rgba(212,175,55,0.1)' : 'rgba(33,150,243,0.1)',
                            color: isPdv ? '#d4af37' : '#2196f3',
                            border: isPdv ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(33,150,243,0.2)'
                          }}>
                            {isPdv ? 'PDV' : 'Agenda'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
                        <td style={{ padding: '1rem', fontWeight: '700', color: '#d4af37', whiteSpace: 'nowrap' }}>{item.time.slice(0, 5)}</td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{item.clientName}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{item.detailName}</td>
                        <td style={{ padding: '1rem', fontWeight: '700', color: 'white' }}>
                          R$ {(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <PaymentMethodBadge method={item.paymentMethod} />
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{prof?.name ?? '—'}</td>
                        <td style={{ padding: '1rem' }}>
                          {isPdv ? (
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>
                              Concluído
                            </span>
                          ) : (
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: (statusBadge[item.status] || statusBadge.pending).bg, color: (statusBadge[item.status] || statusBadge.pending).color }}>
                              {(statusBadge[item.status] || statusBadge.pending).label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div id="mobile-list" style={{ display: 'none', flexDirection: 'column', gap: '0.85rem' }}>
              {unifiedTransactions.slice(0, 15).map(item => {
                const prof = profiles.find(p => p.id === item.professionalId);
                const isPdv = item.type === 'pdv';

                const formatDate = (dateStr: string) => {
                  if (!dateStr) return '—';
                  const parts = dateStr.split('-');
                  if (parts.length !== 3) return dateStr;
                  const [year, month, day] = parts;
                  return `${day}/${month}`;
                };

                return (
                  <div key={item.id} style={{ 
                    padding: '1.2rem', background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}>
                    {/* Header Row: Date/Time + Origin + Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ 
                        fontWeight: '800', color: '#d4af37', fontSize: '0.78rem', 
                        whiteSpace: 'nowrap', background: 'rgba(212,175,55,0.06)', 
                        padding: '4px 8px', borderRadius: '8px', 
                        border: '1px solid rgba(212,175,55,0.12)',
                        flexShrink: 0
                      }}>
                        {formatDate(item.date)} às {item.time.slice(0, 5)}
                      </span>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0, flexWrap: 'nowrap' }}>
                        <span style={{
                          padding: '3px 7px',
                          borderRadius: '6px',
                          fontSize: '0.6rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: isPdv ? 'rgba(212,175,55,0.1)' : 'rgba(33,150,243,0.1)',
                          color: isPdv ? '#d4af37' : '#2196f3',
                          whiteSpace: 'nowrap'
                        }}>
                          {isPdv ? 'PDV' : 'Agenda'}
                        </span>
                        {isPdv ? (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.6rem', fontWeight: '800', background: 'rgba(0,230,118,0.12)', color: '#00e676', whiteSpace: 'nowrap' }}>
                            CONCLUÍDO
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '3px 8px', borderRadius: '20px', fontSize: '0.6rem', 
                            fontWeight: '800', background: (statusBadge[item.status] || statusBadge.pending).bg, color: (statusBadge[item.status] || statusBadge.pending).color, 
                            textTransform: 'uppercase', border: `1px solid ${(statusBadge[item.status] || statusBadge.pending).color}22`,
                            whiteSpace: 'nowrap'
                          }}>
                            {(statusBadge[item.status] || statusBadge.pending).label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Client Name Row */}
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                      {item.clientName}
                    </div>

                    {/* Details Row: Service & Price + Professional */}
                    <div style={{ 
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', 
                      gap: '8px 12px', fontSize: '0.78rem', color: 'var(--text-secondary)', 
                      paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)' 
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <Clock size={12} style={{ color: '#d4af37' }} />
                        <span style={{ color: '#eee', fontWeight: '600' }}>{item.detailName}</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>(R$ {(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                      </span>
                      {prof && (
                        <>
                          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888' }} />
                            <span>{prof.name}</span>
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex' }}>
                      <PaymentMethodBadge method={item.paymentMethod} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) {
          #desktop-table { display: none !important; }
          #mobile-list { display: flex !important; }
          #commission-table-desktop { display: none !important; }
          #commission-list-mobile { display: flex !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
