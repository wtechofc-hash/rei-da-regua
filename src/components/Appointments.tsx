import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Scissors, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  Check
} from 'lucide-react';
import { useApp, Appointment } from '../context/AppContext';

const Appointments: React.FC = () => {
  const { 
    role, 
    userId,
    appointments = [], 
    clients = [], 
    services = [], 
    profiles = [],
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientToggle, setNewClientToggle] = useState(false);
  const [newApptData, setNewApptData] = useState({
    clientId: '',
    clientName: '',
    serviceId: '',
    professionalId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    price: 0
  });

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptData.serviceId || !newApptData.professionalId || !newApptData.clientName) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const added = await addAppointment({
        clientId: newClientToggle ? 'online-customer' : newApptData.clientId,
        clientName: newApptData.clientName,
        professionalId: newApptData.professionalId,
        serviceId: newApptData.serviceId,
        date: newApptData.date,
        time: newApptData.time,
        status: 'confirmed',
        priceAtTime: newApptData.price,
        commissionAtTime: 0
      });

      if (added) {
        setIsModalOpen(false);
        setNewApptData({
          clientId: '',
          clientName: '',
          serviceId: '',
          professionalId: '',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          price: 0
        });
        setNewClientToggle(false);
      } else {
        alert("Erro ao criar o agendamento no banco de dados.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao agendar: " + err.message);
    }
  };

  // Filtro por Papel e ID
  const filteredAppointments = appointments.filter(appt => {
    // Se for profissional, vê apenas os dele
    if (role === 'professional' && appt.professionalId !== userId) return false;
    
    // Filtro por status
    const matchesFilter = filter === 'all' || appt.status === filter;
    
    // Filtro por busca
    const client = clients.find(c => c.id === appt.clientId);
    const matchesSearch = (client?.name || appt.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const statusMap = {
    pending:   { label: 'Pendente',   color: '#ffb300', bg: 'rgba(255,179,0,0.1)' },
    confirmed: { label: 'Confirmado', color: '#00e676', bg: 'rgba(0,230,118,0.1)' },
    completed: { label: 'Concluído',  color: '#2196f3', bg: 'rgba(33,150,243,0.1)' },
    cancelled: { label: 'Cancelado',  color: '#ff1744', bg: 'rgba(255,23,68,0.1)' },
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Agenda</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {role === 'professional' ? 'Gerencie seus horários e atendimentos.' : 'Gestão completa de agendamentos da barbearia.'}
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="gold-button" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      {/* Filters & Search */}
      <div className="premium-card" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', outline: 'none' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {(['all', 'pending', 'confirmed', 'completed'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.6rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: filter === f ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                color: filter === f ? '#000' : '#888',
                fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {f === 'all' ? 'Todos' : statusMap[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <Calendar size={48} style={{ color: '#222', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum agendamento encontrado para este filtro.</p>
          </div>
        ) : (
          filteredAppointments.map(appt => {
            const svc = services.find(s => s.id === appt.serviceId);
            const prof = profiles.find(p => p.id === appt.professionalId);
            const status = statusMap[appt.status];

            return (
              <div key={appt.id} className="premium-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                  {/* Time info */}
                  <div style={{ textAlign: 'center', minWidth: '70px', padding: '10px', background: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>{appt.time}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{new Date(appt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>

                  {/* Main Info */}
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '800' }}>{appt.clientName}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Scissors size={14} /> {svc?.name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><User size={14} /> {prof?.name}</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>R$ {appt.priceAtTime?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', 
                    textTransform: 'uppercase', background: status.bg, color: status.color, border: `1px solid ${status.color}33` 
                  }}>
                    {status.label}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {appt.status === 'pending' && role === 'professional' && (
                      <button 
                        onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}
                        style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#00e676', color: '#000', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Check size={14} /> Confirmar
                      </button>
                    )}
                    
                    {appt.status === 'confirmed' && (
                      <button 
                        onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                        style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#2196f3', color: 'white', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        Finalizar
                      </button>
                    )}

                    {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                       <button 
                        onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                        style={{ padding: '8px', borderRadius: '10px', border: 'none', background: 'rgba(255,23,68,0.1)', color: '#ff1744', cursor: 'pointer' }}
                        title="Cancelar"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Agendamento */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', padding: '1rem'
        }}>
          <div className="premium-card" style={{
            width: '100%', maxWidth: '500px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Novo Agendamento</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setNewApptData({
                    clientId: '',
                    clientName: '',
                    serviceId: '',
                    professionalId: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    price: 0
                  });
                  setNewClientToggle(false);
                }}
                style={{ background: 'none', border: 'none', color: '#ff1744', cursor: 'pointer', fontWeight: '800' }}
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Toggle Cliente */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Tipo de Cliente</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewClientToggle(false)}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: !newClientToggle ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                      color: !newClientToggle ? '#000' : '#888', fontSize: '0.75rem', fontWeight: '700'
                    }}
                  >
                    Cadastrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientToggle(true)}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: newClientToggle ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                      color: newClientToggle ? '#000' : '#888', fontSize: '0.75rem', fontWeight: '700'
                    }}
                  >
                    Novo Cliente
                  </button>
                </div>
              </div>

              {/* Input Cliente */}
              {!newClientToggle ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Cliente</label>
                  <select
                    required
                    value={newApptData.clientId}
                    onChange={e => {
                      const selected = clients.find(c => c.id === e.target.value);
                      setNewApptData(prev => ({ ...prev, clientId: e.target.value, clientName: selected?.name || '' }));
                    }}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                  >
                    <option value="" style={{ background: '#050505' }}>Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#050505' }}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Nome do Novo Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome..."
                    value={newApptData.clientName}
                    onChange={e => setNewApptData(prev => ({ ...prev, clientName: e.target.value, clientId: 'new' }))}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                  />
                </div>
              )}

              {/* Serviço */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Serviço</label>
                <select
                  required
                  value={newApptData.serviceId}
                  onChange={e => {
                    const selected = services.find(s => s.id === e.target.value);
                    setNewApptData(prev => ({ ...prev, serviceId: e.target.value, price: selected?.price || 0 }));
                  }}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                >
                  <option value="" style={{ background: '#050505' }}>Selecione um serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#050505' }}>{s.name} - R$ {s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {/* Profissional */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Profissional</label>
                <select
                  required
                  value={newApptData.professionalId}
                  onChange={e => setNewApptData(prev => ({ ...prev, professionalId: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                >
                  <option value="" style={{ background: '#050505' }}>Selecione um profissional...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#050505' }}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Data e Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Data</label>
                  <input
                    type="date"
                    required
                    value={newApptData.date}
                    onChange={e => setNewApptData(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Horário</label>
                  <input
                    type="time"
                    required
                    value={newApptData.time}
                    onChange={e => setNewApptData(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Valor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700' }}>Preço do Serviço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newApptData.price}
                  onChange={e => setNewApptData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="gold-button"
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', fontWeight: '800' }}
              >
                Agendar Horário
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
