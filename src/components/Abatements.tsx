import React, { useState, useMemo } from 'react';
import { 
  Percent, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  X, 
  ChevronDown, 
  User, 
  Info, 
  Coins, 
  TrendingDown,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Filter
} from 'lucide-react';
import { useApp, Abatement, AbatementParticipant, Profile } from '../context/AppContext';

export default function Abatements() {
  const { 
    role, 
    profiles = [], 
    shopData, 
    abatements = [], 
    abatementParticipants = [],
    addAbatement,
    updateAbatementStatus,
    updateParticipantStatus
  } = useApp();

  const isOwner = role === 'owner';

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDistribution, setFilterDistribution] = useState<string>('all');
  const [filterParticipant, setFilterParticipant] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAbatementDetails, setSelectedAbatementDetails] = useState<Abatement | null>(null);

  // New Abatement Form State
  const [newType, setNewType] = useState<'adiantamento' | 'material_loja' | 'desconto_manual' | 'vale' | 'outro'>('adiantamento');
  const [newDescription, setNewDescription] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDistribution, setNewDistribution] = useState<'individual' | 'selecionados' | 'todos' | 'todos_owner'>('individual');
  const [newSelectedParticipants, setNewSelectedParticipants] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');

  // Active professionals (active profiles with role professional or owner)
  // Let's assume professionals are those in profiles. Lojista can also be a participant if selected.
  const activeProfessionals = useMemo(() => {
    return profiles.filter(p => p.role === 'professional');
  }, [profiles]);

  // Compute calculated distribution breakdown before saving
  const distributionPreview = useMemo(() => {
    const total = parseFloat(newTotalAmount) || 0;
    if (total <= 0) return [];

    let participantsList: { id: string; name: string; type: 'professional' | 'owner' }[] = [];

    if (newDistribution === 'individual') {
      if (newSelectedParticipants.length > 0) {
        const pId = newSelectedParticipants[0];
        if (pId === 'owner') {
          participantsList.push({ id: 'owner', name: 'Lojista (Proprietário)', type: 'owner' });
        } else {
          const prof = activeProfessionals.find(p => p.id === pId);
          if (prof) {
            participantsList.push({ id: prof.id, name: prof.name, type: 'professional' });
          }
        }
      }
    } else if (newDistribution === 'selecionados') {
      newSelectedParticipants.forEach(pId => {
        if (pId === 'owner') {
          participantsList.push({ id: 'owner', name: 'Lojista (Proprietário)', type: 'owner' });
        } else {
          const prof = activeProfessionals.find(p => p.id === pId);
          if (prof) {
            participantsList.push({ id: prof.id, name: prof.name, type: 'professional' });
          }
        }
      });
    } else if (newDistribution === 'todos') {
      activeProfessionals.forEach(prof => {
        participantsList.push({ id: prof.id, name: prof.name, type: 'professional' });
      });
    } else if (newDistribution === 'todos_owner') {
      participantsList.push({ id: 'owner', name: 'Lojista (Proprietário)', type: 'owner' });
      activeProfessionals.forEach(prof => {
        participantsList.push({ id: prof.id, name: prof.name, type: 'professional' });
      });
    }

    const count = participantsList.length;
    if (count === 0) return [];

    const baseShare = Math.floor((total * 100) / count) / 100;
    const centsRemainder = Math.round((total * 100) - (baseShare * 100 * count));

    return participantsList.map((p, idx) => {
      // Add the remainder to the last participant to avoid cent loss
      const finalAmount = idx === count - 1 ? (baseShare + centsRemainder / 100) : baseShare;
      return {
        ...p,
        amount: finalAmount
      };
    });
  }, [newDistribution, newSelectedParticipants, newTotalAmount, activeProfessionals]);

  // Handle saving new abatement
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return alert('Apenas administradores podem cadastrar abates.');
    
    const amount = parseFloat(newTotalAmount);
    if (isNaN(amount) || amount <= 0) {
      return alert('O valor total deve ser maior que zero.');
    }

    if (distributionPreview.length === 0) {
      return alert('Selecione pelo menos um participante para o abate.');
    }

    try {
      const abatementPayload = {
        type: newType,
        description: newDescription.trim(),
        totalAmount: amount,
        distributionType: newDistribution,
        status: 'pendente' as const,
        date: newDate,
        notes: newNotes.trim()
      };

      const participantsPayload = distributionPreview.map(p => ({
        participantType: p.type,
        participantId: p.id === 'owner' ? '' : p.id,
        participantName: p.name,
        amount: p.amount,
        status: 'pendente' as const
      }));

      await addAbatement(abatementPayload, participantsPayload);
      setIsNewModalOpen(false);
      resetForm();
      alert('Abate cadastrado com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar abate: ' + error.message);
    }
  };

  const resetForm = () => {
    setNewType('adiantamento');
    setNewDescription('');
    setNewTotalAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewDistribution('individual');
    setNewSelectedParticipants([]);
    setNewNotes('');
  };

  const handleUpdateStatus = async (id: string, status: 'pendente' | 'quitado' | 'cancelado') => {
    if (!isOwner) return alert('Apenas administradores podem gerenciar o status dos abates.');
    if (window.confirm(`Tem certeza de que deseja alterar o status deste abate para "${status.toUpperCase()}"?`)) {
      try {
        await updateAbatementStatus(id, status);
      } catch (err: any) {
        alert('Erro ao atualizar status: ' + err.message);
      }
    }
  };

  // Filter logic
  const filteredAbatements = useMemo(() => {
    return abatements.filter(abt => {
      if (filterType !== 'all' && abt.type !== filterType) return false;
      if (filterStatus !== 'all' && abt.status !== filterStatus) return false;
      if (filterDistribution !== 'all' && abt.distributionType !== filterDistribution) return false;

      // Filter by Participant
      if (filterParticipant !== 'all') {
        const matchingParticipants = abatementParticipants.filter(p => p.abatementId === abt.id);
        const hasPart = matchingParticipants.some(p => {
          if (filterParticipant === 'owner') return p.participantType === 'owner';
          return p.participantId === filterParticipant;
        });
        if (!hasPart) return false;
      }

      // Filter by dates
      if (dateStart && abt.date < dateStart) return false;
      if (dateEnd && abt.date > dateEnd) return false;

      return true;
    });
  }, [abatements, abatementParticipants, filterType, filterStatus, filterDistribution, filterParticipant, dateStart, dateEnd]);

  // Statistics calculation for the cards
  const stats = useMemo(() => {
    const activeAbts = filteredAbatements.filter(a => a.status !== 'cancelado');
    const total = activeAbts.reduce((sum, a) => sum + a.totalAmount, 0);
    const adiantamentos = activeAbts.filter(a => a.type === 'adiantamento').reduce((sum, a) => sum + a.totalAmount, 0);
    const materialDividido = activeAbts.filter(a => a.type === 'material_loja').reduce((sum, a) => sum + a.totalAmount, 0);
    const pendentes = activeAbts.filter(a => a.status === 'pendente').reduce((sum, a) => sum + a.totalAmount, 0);

    return { total, adiantamentos, materialDividido, pendentes };
  }, [filteredAbatements]);

  // Helpers
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'adiantamento': return 'Adiantamento';
      case 'material_loja': return 'Material da Loja';
      case 'desconto_manual': return 'Desconto Manual';
      case 'vale': return 'Vale';
      default: return 'Outro';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'adiantamento': return '#3399ff'; // Blue
      case 'material_loja': return '#d4af37'; // Gold
      case 'desconto_manual': return '#9933ff'; // Purple
      case 'vale': return '#00cc44'; // Green
      default: return '#888888'; // Gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'quitado': return 'Quitado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#ffaa00'; // Yellow/Orange
      case 'quitado': return '#00cc44'; // Green
      case 'cancelado': return '#ff4444'; // Red
      default: return '#888888';
    }
  };

  const getDistributionLabel = (dist: string) => {
    switch (dist) {
      case 'individual': return 'Individual';
      case 'selecionados': return 'Divisão Personalizada';
      case 'todos': return 'Dividir entre Equipe';
      case 'todos_owner': return 'Dividir com Equipe + Lojista';
      default: return dist;
    }
  };

  const getAbatementParticipantsString = (abtId: string) => {
    const parts = abatementParticipants.filter(p => p.abatementId === abtId);
    if (parts.length === 0) return 'Nenhum';
    if (parts.length <= 2) return parts.map(p => p.participantName).join(', ');
    return `${parts[0].participantName} e mais ${parts.length - 1}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }} className="animate-fade-in">
      
      {/* Title */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-gold)', marginBottom: '0.25rem' }}>
            <Percent size={32} />
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Ponto de Abate</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>Controle de descontos, adiantamentos e divisões financeiras internas.</p>
        </div>

        {isOwner && (
          <button 
            onClick={() => { resetForm(); setIsNewModalOpen(true); }}
            className="gold-button"
            style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}
          >
            <Plus size={20} /> Novo Abate
          </button>
        )}
      </header>

      {/* Cards Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
            <Coins size={28} />
          </div>
          <div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Abates</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: '4px 0 0', color: 'white' }}>R$ {stats.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(51,153,255,0.1)', borderRadius: '12px', color: '#3399ff' }}>
            <Clock size={28} />
          </div>
          <div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adiantamentos</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: '4px 0 0', color: 'white' }}>R$ {stats.adiantamentos.toFixed(2)}</p>
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
            <TrendingDown size={28} />
          </div>
          <div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Materiais Divididos</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: '4px 0 0', color: 'white' }}>R$ {stats.materialDividido.toFixed(2)}</p>
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,170,0,0.1)', borderRadius: '12px', color: '#ffaa00' }}>
            <Info size={28} />
          </div>
          <div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Abates Pendentes</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: '4px 0 0', color: 'white' }}>R$ {stats.pendentes.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Filters Row */}
      <section className="premium-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', marginBottom: '1.25rem' }}>
          <Filter size={18} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtros de Pesquisa</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {/* Period start */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '700' }}>Data Inicial</label>
            <input 
              type="date" 
              value={dateStart} 
              onChange={e => setDateStart(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
            />
          </div>

          {/* Period end */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '700' }}>Data Final</label>
            <input 
              type="date" 
              value={dateEnd} 
              onChange={e => setDateEnd(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '700' }}>Tipo de Abate</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
            >
              <option value="all">Todos os tipos</option>
              <option value="adiantamento">Adiantamento</option>
              <option value="material_loja">Material da Loja</option>
              <option value="desconto_manual">Desconto Manual</option>
              <option value="vale">Vale</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Participant */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '700' }}>Participante</label>
            <select 
              value={filterParticipant} 
              onChange={e => setFilterParticipant(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
            >
              <option value="all">Qualquer participante</option>
              <option value="owner">Lojista (Owner)</option>
              {activeProfessionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '700' }}>Status</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
            >
              <option value="all">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="quitado">Quitado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Abatements History Table */}
      <section className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Histórico de Abates Registrados</h2>
          <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>Encontrados: {filteredAbatements.length}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Data</th>
                <th style={{ padding: '1rem 1.5rem' }}>Tipo</th>
                <th style={{ padding: '1rem 1.5rem' }}>Descrição</th>
                <th style={{ padding: '1rem 1.5rem' }}>Valor Total</th>
                <th style={{ padding: '1rem 1.5rem' }}>Distribuição</th>
                <th style={{ padding: '1rem 1.5rem' }}>Participantes</th>
                <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbatements.map(abt => {
                const dateObj = new Date(abt.date + 'T12:00:00'); // enforce timezone safety
                return (
                  <tr key={abt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem' }} className="table-row-hover">
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#ddd' }}>{dateObj.toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', 
                        background: `${getTypeColor(abt.type)}15`, color: getTypeColor(abt.type)
                      }}>
                        {getTypeLabel(abt.type)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#bbb', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={abt.description}>
                      {abt.description}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '900', color: 'white' }}>R$ {abt.totalAmount.toFixed(2)}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#aaa' }}>{getDistributionLabel(abt.distributionType)}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#999' }}>{getAbatementParticipantsString(abt.id)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', 
                        background: `${getStatusColor(abt.status)}15`, color: getStatusColor(abt.status)
                      }}>
                        {getStatusLabel(abt.status)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          onClick={() => setSelectedAbatementDetails(abt)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Detalhes
                        </button>
                        
                        {isOwner && abt.status === 'pendente' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(abt.id, 'quitado')}
                              title="Marcar como Quitado"
                              style={{ background: 'rgba(0, 204, 68, 0.1)', border: '1px solid rgba(0, 204, 68, 0.2)', color: '#00cc44', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(abt.id, 'cancelado')}
                              title="Cancelar Abate"
                              style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAbatements.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                    Nenhum abate financeiro encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Abatement Modal */}
      {isNewModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white', margin: 0 }}>Registrar Novo Abate</h2>
              <button onClick={() => setIsNewModalOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Tipo de Abate *</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value as any)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  >
                    <option value="adiantamento">Adiantamento</option>
                    <option value="material_loja">Material da Loja</option>
                    <option value="desconto_manual">Desconto Manual</option>
                    <option value="vale">Vale</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Data *</label>
                  <input 
                    required 
                    type="date" 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Descrição / Motivo *</label>
                <input 
                  required 
                  type="text" 
                  value={newDescription} 
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Ex: Adiantamento semanal, Compra de café, Desconto por quebra..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Total Value */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Valor Total (R$) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontWeight: 'bold' }}>R$</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      placeholder="0.00"
                      value={newTotalAmount} 
                      onChange={e => setNewTotalAmount(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.2rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontWeight: 'bold' }}
                    />
                  </div>
                </div>

                {/* Distribution Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Distribuição *</label>
                  <select 
                    value={newDistribution} 
                    onChange={e => {
                      setNewDistribution(e.target.value as any);
                      setNewSelectedParticipants([]);
                    }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  >
                    <option value="individual">Individual</option>
                    <option value="selecionados">Dividir entre selecionados</option>
                    <option value="todos">Dividir entre todos os Profissionais</option>
                    <option value="todos_owner">Dividir entre Profissionais + Lojista</option>
                  </select>
                </div>
              </div>

              {/* Select Participants Checklist (Only visible if individual or selecionados) */}
              {(newDistribution === 'individual' || newDistribution === 'selecionados') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '8px', fontWeight: '800', textTransform: 'uppercase' }}>
                    {newDistribution === 'individual' ? 'Selecione a Pessoa *' : 'Selecione as Pessoas *'}
                  </label>
                  <div style={{ 
                    maxHeight: '130px', overflowY: 'auto', background: '#111', border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '10px', padding: '10px', display: 'grid', gap: '8px'
                  }}>
                    {/* Option for Owner */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type={newDistribution === 'individual' ? 'radio' : 'checkbox'} 
                        name="participants"
                        checked={newSelectedParticipants.includes('owner')}
                        onChange={() => {
                          if (newDistribution === 'individual') {
                            setNewSelectedParticipants(['owner']);
                          } else {
                            if (newSelectedParticipants.includes('owner')) {
                              setNewSelectedParticipants(prev => prev.filter(x => x !== 'owner'));
                            } else {
                              setNewSelectedParticipants(prev => [...prev, 'owner']);
                            }
                          }
                        }}
                      />
                      <span>Lojista (Proprietário)</span>
                    </label>

                    {/* Active professionals options */}
                    {activeProfessionals.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type={newDistribution === 'individual' ? 'radio' : 'checkbox'} 
                          name="participants"
                          checked={newSelectedParticipants.includes(p.id)}
                          onChange={() => {
                            if (newDistribution === 'individual') {
                              setNewSelectedParticipants([p.id]);
                            } else {
                              if (newSelectedParticipants.includes(p.id)) {
                                setNewSelectedParticipants(prev => prev.filter(x => x !== p.id));
                              } else {
                                setNewSelectedParticipants(prev => [...prev, p.id]);
                              }
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Observações Internas (Opcional)</label>
                <textarea 
                  value={newNotes} 
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Division Preview */}
              {distributionPreview.length > 0 && (
                <div style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    <Info size={14} />
                    <span>Divisão de Valores ({distributionPreview.length} Participantes)</span>
                  </div>
                  <div style={{ display: 'grid', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                    {distributionPreview.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ddd' }}>
                        <span>{p.name}</span>
                        <span style={{ fontWeight: '800' }}>R$ {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                className="gold-button"
                style={{ padding: '1rem', borderRadius: '10px', fontWeight: '800', marginTop: '0.5rem', width: '100%', fontSize: '1rem' }}
              >
                Confirmar e Salvar Abate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedAbatementDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'white', margin: 0 }}>Detalhes do Abate</h2>
              <button onClick={() => setSelectedAbatementDetails(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Data de Registro</span>
                  <span style={{ color: 'white', fontWeight: '700' }}>{new Date(selectedAbatementDetails.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Valor Total</span>
                  <span style={{ color: 'white', fontWeight: '900', fontSize: '1.1rem' }}>R$ {selectedAbatementDetails.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Tipo</span>
                  <span style={{ 
                    display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', 
                    background: `${getTypeColor(selectedAbatementDetails.type)}15`, color: getTypeColor(selectedAbatementDetails.type), marginTop: '4px'
                  }}>
                    {getTypeLabel(selectedAbatementDetails.type)}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Status Geral</span>
                  <span style={{ 
                    display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', 
                    background: `${getStatusColor(selectedAbatementDetails.status)}15`, color: getStatusColor(selectedAbatementDetails.status), marginTop: '4px'
                  }}>
                    {getStatusLabel(selectedAbatementDetails.status)}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Distribuição</span>
                <span style={{ color: 'white', fontWeight: '600' }}>{getDistributionLabel(selectedAbatementDetails.distributionType)}</span>
              </div>

              <div>
                <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Descrição</span>
                <span style={{ color: '#ddd' }}>{selectedAbatementDetails.description}</span>
              </div>

              {selectedAbatementDetails.notes && (
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '700' }}>Observações</span>
                  <span style={{ color: '#999', fontSize: '0.85rem', fontStyle: 'italic' }}>{selectedAbatementDetails.notes}</span>
                </div>
              )}

              {/* Participants breakdown */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '15px' }}>
                <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Detalhamento da Divisão</span>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {abatementParticipants
                    .filter(p => p.abatementId === selectedAbatementDetails.id)
                    .map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#bbb' }}>{p.participantName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: 'white' }}>R$ {p.amount.toFixed(2)}</span>
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: '800', color: getStatusColor(p.status)
                          }}>
                            ({getStatusLabel(p.status)})
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal footer status transitions */}
              {isOwner && selectedAbatementDetails.status === 'pendente' && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => { handleUpdateStatus(selectedAbatementDetails.id, 'quitado'); setSelectedAbatementDetails(null); }}
                    style={{ flex: 1, padding: '0.8rem', background: '#00cc44', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle size={16} /> Quitar Abate
                  </button>
                  <button 
                    onClick={() => { handleUpdateStatus(selectedAbatementDetails.id, 'cancelado'); setSelectedAbatementDetails(null); }}
                    style={{ flex: 1, padding: '0.8rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <XCircle size={16} /> Cancelar Abate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
