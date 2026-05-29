import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  User, 
  Scissors, 
  XCircle, 
  Check,
  ChevronDown,
  Crown
} from 'lucide-react';
import { useApp, Appointment } from '../context/AppContext';
import { generateAvailableSlots, addMinutesToTime, resolveApptEndTime, getLocalDateString } from '../utils/timeSlots';

// Date helpers
const getWeekRange = (base: Date) => {
  const d = new Date(base);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday)
  };
};

const getMonthRange = (base: Date) => {
  const y = base.getFullYear();
  const m = base.getMonth();
  const start = getLocalDateString(new Date(y, m, 1));
  const end = getLocalDateString(new Date(y, m + 1, 0));
  return { start, end };
};

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

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
    updateAppointmentEndTime,
    deleteAppointment,
    subscriptions = [],
    useSubscriptionCredit
  } = useApp();

  const today = getLocalDateString();

  // Status filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDateStart, setCustomDateStart] = useState(today);
  const [customDateEnd, setCustomDateEnd] = useState(today);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Professional filter
  const [proFilter, setProFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientToggle, setNewClientToggle] = useState(false);
  const [newApptData, setNewApptData] = useState({
    clientId: '',
    clientName: '',
    serviceId: '',
    professionalId: '',
    date: today,
    time: '',
    price: 0
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  React.useEffect(() => {
    if (newApptData.serviceId && newApptData.professionalId && newApptData.date) {
      const service = services.find(s => s.id === newApptData.serviceId);
      const duration = service?.duration || 30;
      const slots = generateAvailableSlots(newApptData.date, newApptData.professionalId, duration, appointments, '08:00', '20:00', 15, services);
      setAvailableSlots(slots);
      
      if (slots.length > 0 && !slots.includes(newApptData.time)) {
        setNewApptData(prev => ({ ...prev, time: slots[0] }));
      } else if (slots.length === 0) {
        setNewApptData(prev => ({ ...prev, time: '' }));
      }
    }
  }, [newApptData.serviceId, newApptData.professionalId, newApptData.date, appointments, services]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate for admins/professionals. Clients auto-fill their own info.
    if (!newApptData.serviceId || !newApptData.professionalId || (role !== 'customer' && !newApptData.clientName)) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const service = services.find(s => s.id === newApptData.serviceId);
    const duration = service?.duration || 30;
    const endTime = newApptData.time ? addMinutesToTime(newApptData.time, duration) : newApptData.time;

    try {
      const added = await addAppointment({
        clientId: role === 'customer' ? (userId || '') : (newClientToggle ? 'online-customer' : newApptData.clientId),
        clientName: role === 'customer' ? (profiles.find(p => p.id === userId)?.name || 'Cliente') : newApptData.clientName,
        professionalId: newApptData.professionalId,
        serviceId: newApptData.serviceId,
        date: newApptData.date,
        time: newApptData.time,
        endTime,
        status: role === 'customer' ? 'pending' : 'confirmed',
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
          date: today,
          time: '',
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

  // Compute date range for the current filter
  const getDateRange = (): { start: string; end: string } | null => {
    const now = new Date();
    if (dateFilter === 'today') return { start: today, end: today };
    if (dateFilter === 'week') return getWeekRange(now);
    if (dateFilter === 'month') return getMonthRange(now);
    if (dateFilter === 'custom') return { start: customDateStart, end: customDateEnd };
    return null;
  };

  // Full filter pipeline
  const filteredAppointments = appointments.filter(appt => {
    // Role filter: professional sees only theirs
    if (role === 'professional' && appt.professionalId !== userId) return false;

    // Role filter: client sees only theirs
    if (role === 'customer' && appt.clientId !== userId) return false;

    // Professional filter (for admin/owner)
    if (role !== 'professional' && role !== 'customer' && proFilter !== 'all' && appt.professionalId !== proFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && appt.status !== statusFilter) return false;

    // Date filter
    const range = getDateRange();
    if (range) {
      if (appt.date < range.start || appt.date > range.end) return false;
    }

    // Search by client name
    const clientName = (appt.clientName || clients.find(c => c.id === appt.clientId)?.name || '').toLowerCase();
    if (searchTerm && !clientName.includes(searchTerm.toLowerCase())) return false;

    return true;
  }).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pendente',   color: '#ffb300', bg: 'rgba(255,179,0,0.12)' },
    confirmed: { label: 'Confirmado', color: '#00e676', bg: 'rgba(0,230,118,0.12)' },
    completed: { label: 'Concluído',  color: '#2196f3', bg: 'rgba(33,150,243,0.12)' },
    cancelled: { label: 'Cancelado',  color: '#ff1744', bg: 'rgba(255,23,68,0.12)' },
  };

  const dateFilterLabels: Record<DateFilter, string> = {
    all: 'Todas as datas',
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês',
    custom: 'Período personalizado'
  };

  const statusFilters: StatusFilter[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const dateFilters: DateFilter[] = ['all', 'today', 'week', 'month', 'custom'];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Agenda</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {role === 'customer' ? 'Histórico e agendamentos realizados.' : role === 'professional' ? 'Gerencie seus horários e atendimentos.' : 'Gestão completa de agendamentos da barbearia.'}
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="gold-button" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      {/* Filters & Search */}
      {role !== 'customer' && (
        <div className="premium-card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Row 1: Search + Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '0.875rem' }}
            />
          </div>

          {/* Professional filter dropdown (only for non-professionals and non-clients) */}
          {role !== 'professional' && (
            <div style={{ position: 'relative', minWidth: '180px' }}>
              <select
                value={proFilter}
                onChange={e => setProFilter(e.target.value)}
                style={{
                  width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.03)',
                  border: proFilter !== 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', color: proFilter !== 'all' ? 'var(--accent-gold)' : '#aaa',
                  outline: 'none', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', appearance: 'none'
                }}
              >
                <option value="all" style={{ background: '#050505' }}>Todos Profissionais</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#050505' }}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            </div>
          )}

          {/* Date filter dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCustomPicker(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1rem',
                background: dateFilter !== 'all' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                border: dateFilter !== 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', color: dateFilter !== 'all' ? 'var(--accent-gold)' : '#aaa',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap'
              }}
            >
              <Calendar size={15} />
              {dateFilterLabels[dateFilter]}
              <ChevronDown size={14} />
            </button>

            {showCustomPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
                background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                padding: '1rem', minWidth: '240px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {dateFilters.map(df => (
                    <button
                      key={df}
                      onClick={() => {
                        setDateFilter(df);
                        if (df !== 'custom') setShowCustomPicker(false);
                      }}
                      style={{
                        padding: '0.6rem 0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: dateFilter === df ? 'rgba(212,175,55,0.15)' : 'transparent',
                        color: dateFilter === df ? 'var(--accent-gold)' : '#ccc',
                        fontWeight: dateFilter === df ? '800' : '500', fontSize: '0.85rem'
                      }}
                    >
                      {dateFilterLabels[df]}
                    </button>
                  ))}
                </div>

                {dateFilter === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: '700', display: 'block', marginBottom: '4px' }}>DE</label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={e => setCustomDateStart(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: '700', display: 'block', marginBottom: '4px' }}>ATÉ</label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={e => setCustomDateEnd(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>
                    <button
                      onClick={() => setShowCustomPicker(false)}
                      className="gold-button"
                      style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px' }}
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Status filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {statusFilters.map(f => (
            <button 
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '0.55rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: statusFilter === f ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                color: statusFilter === f ? '#000' : '#888',
                fontSize: '0.78rem', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {f === 'all' ? 'Todos' : statusMap[f].label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Stats bar */}
      {role !== 'customer' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
          { label: 'Total filtrado', value: filteredAppointments.length, color: '#888' },
          { label: 'Pendentes', value: filteredAppointments.filter(a => a.status === 'pending').length, color: '#ffb300' },
          { label: 'Confirmados', value: filteredAppointments.filter(a => a.status === 'confirmed').length, color: '#00e676' },
          { label: 'Concluídos', value: filteredAppointments.filter(a => a.status === 'completed').length, color: '#2196f3' },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: stat.color }}>{stat.value}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>{stat.label}</p>
          </div>
        ))}
        </div>
      )}

      {/* List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <Calendar size={48} style={{ color: '#222', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum agendamento encontrado para este filtro.</p>
          </div>
        ) : (
          (role === 'customer' ? filteredAppointments.slice(0, 3) : filteredAppointments).map(appt => {
            const svc = services.find(s => s.id === appt.serviceId);
            const prof = profiles.find(p => p.id === appt.professionalId);
            const status = statusMap[appt.status] || statusMap.pending;
            const displayName = appt.clientName || clients.find(c => c.id === appt.clientId)?.name || 'Cliente';
            const apptDate = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
            const isToday = appt.date === today;
            // Always compute the real end time (fixes legacy data where end_time === start_time)
            const resolvedEnd = resolveApptEndTime(appt, services);

            return (
              <div key={appt.id} className="premium-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', opacity: appt.status === 'cancelled' ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1, minWidth: '260px' }}>
                  {/* Time + Date block */}
                  <div style={{ textAlign: 'center', minWidth: '80px', padding: '10px 12px', background: isToday ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', border: isToday ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent-gold)', lineHeight: 1 }}>{appt.time?.slice(0, 5)}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>até {resolvedEnd.slice(0, 5)}</p>
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {isToday && <span style={{ fontSize: '0.6rem', color: 'var(--accent-gold)', fontWeight: '900', display: 'block', letterSpacing: '0.05em' }}>HOJE</span>}
                      <p style={{ margin: 0, fontSize: '0.65rem', color: isToday ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: '700' }}>{apptDate}</p>
                    </div>
                  </div>

                  {/* Main Info */}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {svc && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Scissors size={13} /> {svc.name}</span>}
                      {prof && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={13} /> {prof.name}</span>}
                      {appt.priceAtTime > 0 && <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>R$ {appt.priceAtTime.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                </div>

                {/* Status + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <div style={{ 
                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', 
                    textTransform: 'uppercase', background: status.bg, color: status.color, border: `1px solid ${status.color}33`,
                    whiteSpace: 'nowrap'
                  }}>
                    {status.label}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {appt.status === 'pending' && (role === 'professional' || role === 'owner') && (
                      <button 
                        onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}
                        style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#00e676', color: '#000', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Check size={13} /> Confirmar
                      </button>
                    )}
                    
                    {appt.status === 'confirmed' && (
                      <>
                        <button 
                          onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                          style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#2196f3', color: 'white', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                          title="Finalizar com pagamento padrão"
                        >
                          Finalizar
                        </button>
                        {(() => {
                           const activeSub = subscriptions.find(s => s.clientId === appt.clientId && s.status === 'active' && s.servicesUsed < s.servicesTotal);
                           if (activeSub) {
                             return (
                               <button 
                                 onClick={async () => {
                                   if (window.confirm('Deseja abater 1 crédito VIP para este agendamento?')) {
                                     const success = await useSubscriptionCredit(activeSub.id, appt.id);
                                     if (success) {
                                       updateAppointmentStatus(appt.id, 'completed');
                                     } else {
                                       alert('Erro ao usar crédito VIP.');
                                     }
                                   }
                                 }}
                                 style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--accent-gold)', color: 'black', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                 title="Abater do plano VIP do cliente"
                               >
                                 <Crown size={14} /> Usar Crédito VIP
                               </button>
                             );
                           }
                           return null;
                        })()}
                      </>
                    )}

                    {(appt.status === 'pending' || appt.status === 'confirmed') && 
                     appt.date === today && 
                     (role === 'professional' || role === 'owner') && (
                      <button 
                        onClick={() => {
                          const now = new Date();
                          const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                          updateAppointmentEndTime(appt.id, currentStr);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.3)' }}
                        title="Finalizar atendimento agora e liberar o resto do horário"
                      >
                        Adiantar
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
      {isModalOpen && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: '3rem 1rem 2rem', overflowY: 'auto'
        }}>
          <div className="premium-card" style={{
            width: '100%', maxWidth: '500px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)',
            margin: '0 auto', position: 'relative'
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
                    date: today,
                    time: '',
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
              
              {/* Toggle e Input Cliente (Oculto para Clientes) */}
              {role !== 'customer' && (
                <>
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
                </>
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
                    <option key={s.id} value={s.id} style={{ background: '#050505' }}>{s.name} - R$ {s.price.toFixed(2)} ({s.duration || 30}min)</option>
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
                  {!newApptData.professionalId || !newApptData.serviceId ? (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                      Selecione serviço e profissional.
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,50,50,0.1)', borderRadius: '10px', border: '1px solid rgba(255,50,50,0.2)', textAlign: 'center', color: '#ff5252', fontSize: '0.85rem', fontWeight: '700' }}>
                      Nenhum horário livre.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewApptData(prev => ({ ...prev, time: slot }))}
                          style={{
                            padding: '0.6rem 0.4rem',
                            borderRadius: '8px',
                            background: newApptData.time === slot ? 'var(--accent-gold)' : '#111',
                            border: newApptData.time === slot ? '1px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                            color: newApptData.time === slot ? '#000' : 'white',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor (Oculto para Clientes, o preço é atrelado ao serviço) */}
              {role !== 'customer' && (
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
              )}

              <button
                type="submit"
                className="gold-button"
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', fontWeight: '800' }}
              >
                Agendar Horário
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Appointments;
