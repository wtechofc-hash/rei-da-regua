import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Scissors, 
  Calendar,
  ChevronDown,
  Download,
  Filter,
  Users,
  Percent,
  TrendingDown,
  Info,
  FileText
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';

type Period = 'day' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { 
    role, 
    userId, 
    appointments = [], 
    services = [], 
    sales = [], 
    profiles = [],
    abatements = [],
    abatementParticipants = []
  } = useApp();

  const [period, setPeriod] = useState<Period>('week');
  const [originFilter, setOriginFilter] = useState<'all' | 'appointments' | 'pdv'>('all');
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  
  // Custom period states
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const isOwner = role === 'owner';

  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const getPeriodRange = () => {
    if (period === 'custom') {
      return { start: customStart || '1970-01-01', end: customEnd || '9999-12-31' };
    }
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

  // Active professionals list
  const activeProfessionals = useMemo(() => {
    return profiles.filter(p => p.role === 'professional');
  }, [profiles]);

  // Filtered Appointments
  const userAppointments = useMemo(() => {
    return appointments.filter(a => {
      const isCompleted = a.status === 'completed' || a.status === 'confirmed';
      const inPeriod = a.date >= filterStart && a.date <= filterEnd;
      return isCompleted && inPeriod;
    });
  }, [appointments, filterStart, filterEnd]);

  // Filtered Sales
  const userSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.soldAt ? s.soldAt.split('T')[0] : '';
      return saleDate >= filterStart && saleDate <= filterEnd;
    });
  }, [sales, filterStart, filterEnd]);

  // Filtered Abatements / Participants
  const activeParticipants = useMemo(() => {
    return abatementParticipants.filter(p => {
      const abt = abatements.find(a => a.id === p.abatementId);
      if (!abt) return false;
      const inPeriod = abt.date >= filterStart && abt.date <= filterEnd;
      return inPeriod && p.status !== 'cancelado';
    });
  }, [abatementParticipants, abatements, filterStart, filterEnd]);

  // Overall metrics calculation
  const totalServiceRevenue = useMemo(() => {
    if (originFilter === 'pdv') return 0;
    return userAppointments.reduce((s, a) => s + (a.priceAtTime || 0), 0);
  }, [userAppointments, originFilter]);

  const totalProductRevenue = useMemo(() => {
    if (originFilter === 'appointments') return 0;
    return userSales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);
  }, [userSales, originFilter]);

  const totalRevenue = totalServiceRevenue + totalProductRevenue;

  const totalCommissionFromAppts = useMemo(() => {
    if (originFilter === 'pdv') return 0;
    return userAppointments.reduce((s, a) => {
      const svc = services.find(sv => sv.id === a.serviceId);
      const rate = svc?.commission ?? 0;
      return s + (a.priceAtTime || 0) * (rate / 100);
    }, 0);
  }, [userAppointments, services, originFilter]);

  const totalCommissionFromProducts = useMemo(() => {
    if (originFilter === 'appointments') return 0;
    return userSales.reduce((s, sale) => s + (sale.commissionAmount || 0), 0);
  }, [userSales, originFilter]);

  const totalCommission = totalCommissionFromAppts + totalCommissionFromProducts;

  const totalAbatesGlobal = useMemo(() => {
    // Only professionals abatements represent team cost reductions
    return activeParticipants
      .filter(p => p.participantType === 'professional')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [activeParticipants]);

  const netTeamPayout = totalCommission - totalAbatesGlobal;

  const stats = [
    { label: role === 'professional' ? 'Minha Produção' : 'Faturamento Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: role === 'professional' ? 'Minha Comissão Bruta' : 'Comissões Brutas', value: `R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp },
    { label: role === 'professional' ? 'Meus Abates Pendentes' : 'Total de Abates', value: `R$ ${totalAbatesGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Percent },
    { label: role === 'professional' ? 'Comissão Líquida' : 'Líquido a Pagar', value: `R$ ${netTeamPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp },
  ];

  // Professional-specific breakdown calculations
  const professionalReports = useMemo(() => {
    return profiles.map(prof => {
      const profId = prof.id;

      const appts = appointments.filter(a => {
        const isCompleted = a.status === 'completed' || a.status === 'confirmed';
        const inPeriod = a.date >= filterStart && a.date <= filterEnd;
        return a.professionalId === profId && isCompleted && inPeriod;
      });

      const profSales = sales.filter(s => {
        const saleDate = s.soldAt ? s.soldAt.split('T')[0] : '';
        const inPeriod = saleDate >= filterStart && saleDate <= filterEnd;
        return s.professionalId === profId && inPeriod;
      });

      const commService = appts.reduce((s, a) => {
        const svc = services.find(sv => sv.id === a.serviceId);
        const rate = svc?.commission ?? 0;
        return s + (a.priceAtTime || 0) * (rate / 100);
      }, 0);

      const commProducts = profSales.reduce((s, sale) => s + (sale.commissionAmount || 0), 0);
      const grossComm = commService + commProducts;

      // Abates
      const profParts = activeParticipants.filter(p => p.participantId === profId);
      const abatesIndiv = profParts.filter(p => {
        const abt = abatements.find(a => a.id === p.abatementId);
        return abt?.distributionType === 'individual';
      }).reduce((sum, p) => sum + p.amount, 0);

      const abatesDiv = profParts.filter(p => {
        const abt = abatements.find(a => a.id === p.abatementId);
        return abt?.distributionType !== 'individual';
      }).reduce((sum, p) => sum + p.amount, 0);

      const totalAbated = abatesIndiv + abatesDiv;
      const netComm = grossComm - totalAbated;

      return {
        id: profId,
        name: prof.name,
        commService,
        commProducts,
        grossComm,
        abatesIndiv,
        abatesDiv,
        totalAbated,
        netComm
      };
    });
  }, [profiles, appointments, sales, services, activeParticipants, abatements, filterStart, filterEnd]);

  // Selected professional specific data for display
  const targetProfReport = useMemo(() => {
    const targetId = role === 'professional' ? userId : selectedProfId;
    return professionalReports.find(p => p.id === targetId);
  }, [professionalReports, role, userId, selectedProfId]);

  const chartData = [
    { name: 'Seg', value: totalRevenue * 0.1 },
    { name: 'Ter', value: totalRevenue * 0.15 },
    { name: 'Qua', value: totalRevenue * 0.12 },
    { name: 'Qui', value: totalRevenue * 0.20 },
    { name: 'Sex', value: totalRevenue * 0.25 },
    { name: 'Sáb', value: totalRevenue * 0.18 },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.02em' }}>Relatórios Financeiros</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px' }}>
            {role === 'professional' ? 'Acompanhe seu faturamento bruto, abates e comissão líquida.' : 'Análise completa de faturamento, comissões, abates e lucros.'}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
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

        {/* Custom Range Inputs */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={customStart} 
              onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem' }}
            />
            <span style={{ color: '#555' }}>até</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem' }}
            />
          </div>
        )}

        {/* Origin Filter */}
        <div style={{ position: 'relative', minWidth: '160px' }}>
          <select
            value={originFilter}
            onChange={e => setOriginFilter(e.target.value as any)}
            style={{
              width: '100%', padding: '0.55rem 2rem 0.55rem 1rem', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '10px', color: '#aaa',
              outline: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', appearance: 'none'
            }}
          >
            <option value="all">Todas as Origens</option>
            <option value="appointments">Apenas Agendamentos</option>
            <option value="pdv">Apenas PDV</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="premium-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(212,175,55,0.08)', padding: '10px', borderRadius: '12px', color: 'var(--accent-gold)' }}>
                  <Icon size={20} />
                </div>
              </div>
              <p style={{ margin: '0 0 5px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>{s.value}</h2>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem', color: 'white' }}>Desempenho no Período</h3>
        <div style={{ height: '300px' }}>
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

      {/* Storewide Summary Table & Team Breakdown */}
      {isOwner && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Shop General Report */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--accent-gold)" /> Relatório Geral da Loja
            </h3>

            <div style={{ display: 'grid', gap: '1rem', color: '#ccc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Faturamento Geral (Serviços + PDV)</span>
                <span style={{ fontWeight: '800', color: 'white' }}>R$ {totalRevenue.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Total de Comissões Brutas Geradas</span>
                <span style={{ fontWeight: '800', color: 'white' }}>R$ {totalCommission.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Total de Abates Aplicados (Pendentes)</span>
                <span style={{ fontWeight: '800', color: '#ffaa00' }}>R$ {totalAbatesGlobal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', fontSize: '1.05rem' }}>
                <span style={{ fontWeight: '700', color: 'white' }}>Líquido a Pagar à Equipe</span>
                <span style={{ fontWeight: '900', color: 'var(--accent-gold)' }}>R$ {netTeamPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Team Commission & Abatement Breakdown */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-gold)" /> Comissões e Abates por Profissional
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '8px' }}>Profissional</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Comissão Bruta</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total Abatido</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Valor Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {professionalReports.map(rep => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '700', color: 'white' }}>{rep.name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#aaa' }}>R$ {rep.grossComm.toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#ffaa00' }}>R$ {rep.totalAbated.toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '800', color: 'var(--accent-gold)' }}>R$ {rep.netComm.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Individual Professional Detailed Statement Section */}
      <section className="premium-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-gold)" /> Detalhamento do Extrato do Profissional
          </h3>

          {isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>Selecionar Profissional:</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedProfId}
                  onChange={e => setSelectedProfId(e.target.value)}
                  style={{
                    padding: '0.45rem 2rem 0.45rem 1rem', background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', appearance: 'none', minWidth: '180px'
                  }}
                >
                  <option value="all">Escolha um profissional</option>
                  {activeProfessionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              </div>
            </div>
          )}
        </div>

        {targetProfReport ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {/* Earnings Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ganhos e Comissões</h4>
              <div style={{ display: 'grid', gap: '12px', fontSize: '0.85rem', color: '#ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Comissões por Serviço</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>R$ {targetProfReport.commService.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Comissões por Produto PDV</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>R$ {targetProfReport.commProducts.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ fontWeight: '700', color: 'white' }}>Total Bruto</span>
                  <span style={{ fontWeight: '900', color: 'white' }}>R$ {targetProfReport.grossComm.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Abatements Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#ffaa00', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Abates e Descontos</h4>
              <div style={{ display: 'grid', gap: '12px', fontSize: '0.85rem', color: '#ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Abates Individuais (Vales/Adiantamentos)</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>R$ {targetProfReport.abatesIndiv.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Abates Divididos (Despesas Compartilhadas)</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>R$ {targetProfReport.abatesDiv.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ fontWeight: '700', color: 'white' }}>Total Abatido</span>
                  <span style={{ fontWeight: '900', color: '#ff4444' }}>R$ {targetProfReport.totalAbated.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Net Settlement Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)', 
              border: '1px solid rgba(212,175,55,0.15)', borderRadius: '12px', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'
            }}>
              <TrendingUp size={36} color="var(--accent-gold)" style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Saldo Líquido a Receber ({targetProfReport.name})
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--accent-gold)', margin: 0 }}>
                R$ {targetProfReport.netComm.toFixed(2)}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '20px' }}>
                <Info size={12} color="#aaa" />
                <span style={{ fontSize: '0.65rem', color: '#aaa' }}>Cálculo bruto descontado de abates pendentes.</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.9rem' }}>
            Selecione um profissional acima para visualizar o detalhamento do extrato financeiro.
          </div>
        )}
      </section>
    </div>
  );
};

export default Reports;
