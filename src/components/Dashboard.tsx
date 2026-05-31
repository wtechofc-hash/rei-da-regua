import React, { useState } from 'react';
import { Calendar, DollarSign, Users, Clock, Percent, ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';

interface DashboardProps {
  onViewAll?: () => void;
}

const PIE_COLORS = ['#d4af37', '#a68a2d', '#7d6822', '#f0d060'];

const Dashboard: React.FC<DashboardProps> = ({ onViewAll }) => {
  const { role, userId, appointments = [], clients = [], services = [], profiles = [] } = useApp();

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

  const userAppointments = role === 'professional'
    ? appointments.filter(a => a.professionalId === userId)
    : (proFilter !== 'all'
        ? appointments.filter(a => a.professionalId === proFilter)
        : appointments);

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

  const periodAppts = periodAppointments.length;
  const revenueInPeriod = periodAppointments
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((s, a) => s + (a.priceAtTime || 0), 0);

  const commissionInPeriod = periodAppointments
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => {
      const svc = services.find(s => s.id === a.serviceId);
      const rate = svc?.commission ?? 0;
      return sum + (a.priceAtTime || 0) * (rate / 100);
    }, 0);

  const activeClientsInPeriod = new Set(periodAppointments.map(a => a.clientId)).size;

  const stats = [
    { 
      label: period === 'today' ? 'Agendamentos Hoje' : 'Agendamentos no Período', 
      value: periodAppts, 
      sub: period === 'today' ? 'Hoje' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mês' : 'Personalizado', 
      icon: Calendar, 
      gold: false 
    },
    { 
      label: period === 'today' ? 'Faturamento Hoje' : 'Faturamento no Período',  
      value: `R$ ${revenueInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      sub: 'Total faturado', 
      icon: DollarSign, 
      gold: true 
    },
    { 
      label: role === 'professional' 
        ? 'Minha Comissão' 
        : (period === 'today' ? 'Comissões Hoje' : 'Comissões no Período'),
      value: `R$ ${commissionInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      sub: role === 'professional' ? 'Sua comissão no período' : 'Total pago à equipe',
      icon: Percent,
      gold: false
    },
    { 
      label: 'Clientes Ativos',   
      value: activeClientsInPeriod, 
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

  const upcoming = [...periodAppointments]
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 15);

  const statusBadge: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: 'Pendente',   bg: 'rgba(255,179,0,0.12)',   color: '#ffb300' },
    confirmed: { label: 'Confirmado', bg: 'rgba(0,230,118,0.12)',   color: '#00e676' },
    completed: { label: 'Concluído',  bg: 'rgba(33,150,243,0.12)',  color: '#2196f3' },
    cancelled: { label: 'Cancelado',  bg: 'rgba(255,23,68,0.12)',   color: '#ff1744' },
  };

  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
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

      {/* Period & Professional Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="premium-card" style={{ padding: '4px', display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                  fontSize: '0.75rem', fontWeight: '800', transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.2s ease-out' }}>
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

        {/* Professional Filter for Shop Owner */}
        {role === 'owner' && (
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <select
              value={proFilter}
              onChange={e => setProFilter(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 2.2rem 0.55rem 1rem', background: 'rgba(255,255,255,0.02)',
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
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Mix de Serviços</h3>
          <div style={{ height: '170px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius="52%" outerRadius="72%" paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
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
                <div id="commission-list-mobile" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
                  {commissionEntries.map((entry) => (
                    <div key={entry.id} style={{
                      padding: '1rem', background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '800', color: '#d4af37', fontSize: '0.85rem' }}>
                            {entry.date.split('-').reverse().join('/')} {entry.time.slice(0, 5)}
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{entry.clientName}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {entry.svcName} · R$ {(entry.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Taxa {entry.rate}%
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Comissão</p>
                        <p style={{ margin: 0, fontWeight: '900', color: '#00e676', fontSize: '1rem' }}>
                          R$ {entry.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Upcoming Appointments */}
      <div className="premium-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
            {period === 'today' ? 'Agendamentos Hoje' : 'Agendamentos no Período'}
          </h3>
          <button onClick={onViewAll} style={{ background: 'transparent', border: 'none', color: '#d4af37', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
            Ver todos →
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <p>Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div id="desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Data', 'Horário', 'Cliente', 'Serviço', 'Valor', 'Profissional', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(appt => {
                    const svc  = services.find(s => s.id === appt.serviceId);
                    const prof = profiles.find(p => p.id === appt.professionalId);
                    const badge = statusBadge[appt.status] ?? statusBadge.pending;
                    
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return '—';
                      const parts = dateStr.split('-');
                      if (parts.length !== 3) return dateStr;
                      const [year, month, day] = parts;
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={appt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(appt.date)}</td>
                        <td style={{ padding: '1rem', fontWeight: '700', color: '#d4af37', whiteSpace: 'nowrap' }}>{appt.time.slice(0, 5)}</td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{appt.clientName}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{svc?.name ?? '—'}</td>
                        <td style={{ padding: '1rem', fontWeight: '700', color: 'white' }}>
                          R$ {(appt.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{prof?.name ?? '—'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div id="mobile-list" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
              {upcoming.map(appt => {
                const svc  = services.find(s => s.id === appt.serviceId);
                const prof = profiles.find(p => p.id === appt.professionalId);
                const badge = statusBadge[appt.status] ?? statusBadge.pending;

                const formatDate = (dateStr: string) => {
                  if (!dateStr) return '—';
                  const parts = dateStr.split('-');
                  if (parts.length !== 3) return dateStr;
                  const [year, month, day] = parts;
                  return `${day}/${month}`;
                };

                return (
                  <div key={appt.id} style={{ 
                    padding: '1rem', background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', color: '#d4af37', fontSize: '0.9rem' }}>
                          {formatDate(appt.date)} - {appt.time.slice(0, 5)}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{appt.clientName}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {svc?.name} (R$ {(appt.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                        <span>·</span>
                        <span>{prof?.name?.split(' ')[0]}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800', background: badge.bg, color: badge.color, textTransform: 'uppercase' }}>
                        {badge.label}
                      </span>
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
