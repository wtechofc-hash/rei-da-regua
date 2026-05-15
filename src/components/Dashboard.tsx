import React, { useState } from 'react';
import { Calendar, DollarSign, Users, Star, Clock } from 'lucide-react';
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
  const { appointments = [], clients = [], services = [], profiles = [] } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === today);
  const revenueToday = appointments
    .filter(a => a.date === today && (a.status === 'confirmed' || a.status === 'completed'))
    .reduce((s, a) => s + (a.priceAtTime || 0), 0);

  const stats = [
    { label: 'Agendamentos Hoje', value: todayAppts.length, sub: '+12% vs ontem', icon: Calendar, gold: false },
    { label: 'Faturamento Hoje',  value: `R$ ${revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: '+8% vs ontem', icon: DollarSign, gold: true },
    { label: 'Clientes Ativos',   value: clients.length, sub: '+15% este mês', icon: Users, gold: false },
    { label: 'Avaliações',        value: '4,8', sub: '★★★★★', icon: Star, gold: false },
  ];

  const totalRev = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').reduce((s, a) => s + (a.priceAtTime || 0), 0);
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
  appointments.forEach(a => {
    const s = services.find(sv => sv.id === a.serviceId);
    if (s) svcCounts[s.name] = (svcCounts[s.name] || 0) + 1;
  });
  const pieData = Object.entries(svcCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 4);
  if (pieData.length === 0) pieData.push({ name: 'Sem dados', value: 1 });

  const upcoming = [...appointments]
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

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

      {/* Upcoming Appointments */}
      <div className="premium-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Próximos Agendamentos</h3>
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
                    {['Horário', 'Cliente', 'Serviço', 'Profissional', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(appt => {
                    const svc  = services.find(s => s.id === appt.serviceId);
                    const prof = profiles.find(p => p.id === appt.professionalId);
                    const badge = statusBadge[appt.status] ?? statusBadge.pending;
                    return (
                      <tr key={appt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '1rem', fontWeight: '700', color: '#d4af37', whiteSpace: 'nowrap' }}>{appt.time}</td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{appt.clientName}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{svc?.name ?? '—'}</td>
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
                return (
                  <div key={appt.id} style={{ 
                    padding: '1rem', background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', color: '#d4af37', fontSize: '0.95rem' }}>{appt.time}</span>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{appt.clientName}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> {svc?.name}</span>
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
        }
      `}} />
    </div>
  );
};

export default Dashboard;
