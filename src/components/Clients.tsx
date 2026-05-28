import React, { useState } from 'react';
import { Plus, Search, Phone, Calendar, Trash2, Edit2, Crown } from 'lucide-react';
import { useApp, Client, Subscription, SubscriptionPlan } from '../context/AppContext';

const Clients: React.FC = () => {
  const { clients = [], subscriptions = [], subscriptionPlans = [], addClient, updateClient, deleteClient } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  const vipClients = filtered.filter(c => subscriptions.some(s => s.clientId === c.id && s.status !== 'canceled'));
  const commonClients = filtered.filter(c => !subscriptions.some(s => s.clientId === c.id && s.status !== 'canceled'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: formData.name, phone: formData.phone, email: formData.email };
    
    if (editingId) {
      updateClient(editingId, data);
    } else {
      addClient({ ...data, totalSpent: 0, appointmentsCount: 0 });
    }

    setFormData({ name: '', phone: '', email: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEditClick = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || ''
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', phone: '', email: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.85rem', borderRadius: '10px',
    background: '#1a1a1a', border: '1px solid var(--glass-border)', color: 'white', width: '100%'
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Clientes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>{clients.length} clientes cadastrados</p>
        </div>
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { handleCancel(); setIsAdding(true); }}>
          <Plus size={18} /> Novo Cliente
        </button>
      </header>

      {/* Search */}
      <div className="premium-card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <Search size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
        <input
          type="text" placeholder="Buscar por nome ou telefone..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, fontSize: '0.9rem', outline: 'none' }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        )}
      </div>

      {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome Completo</label>
              <input required type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Telefone</label>
              <input required type="text" placeholder="(00) 00000-0000" style={inputStyle} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Email (opcional)</label>
              <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }}>
                {editingId ? 'Salvar Alterações' : 'Salvar Cliente'}
              </button>
              <button type="button" onClick={handleCancel} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Clientes Comuns */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Clientes Comuns ({commonClients.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {commonClients.map(client => (
              <div key={client.id} className="premium-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.15rem', fontWeight: '800', color: 'white'
                  }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} /> {client.phone}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Total Gasto</p>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-gold)', margin: 0 }}>
                      R$ {(client.totalSpent ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '0.75rem' }}>
                    <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Visitas</p>
                    <p style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{client.appointmentsCount ?? 0}</p>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Calendar size={13} style={{ flexShrink: 0 }} />
                    {client.lastVisit ? new Date(client.lastVisit + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem visitas'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleEditClick(client)} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.75rem', padding: '6px', borderRadius: '8px' }} title="Editar">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteClient(client.id)} style={{ background: 'rgba(255,23,68,0.05)', border: 'none', color: '#ff1744', cursor: 'pointer', fontSize: '0.75rem', padding: '6px', borderRadius: '8px' }} title="Remover">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {commonClients.length === 0 && (
              <div className="premium-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Nenhum cliente comum encontrado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Clientes VIP */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={20} /> Assinantes VIP ({vipClients.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {vipClients.map(client => {
              const sub = subscriptions.find(s => s.clientId === client.id && s.status !== 'canceled');
              const plan = subscriptionPlans.find(p => p.id === sub?.planId);
              
              return (
                <div key={client.id} className="premium-card" style={{ padding: '1.25rem', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent-gold) 0%, #8e6d2d 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.15rem', fontWeight: '800', color: '#000'
                    }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} /> {client.phone}
                      </p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(212,175,55,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{plan?.name || 'Plano Desconhecido'}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: sub?.status === 'active' ? '#00cc44' : '#ffaa00', color: '#000', fontWeight: 'bold' }}>
                        {sub?.status === 'active' ? 'ATIVO' : sub?.status === 'expired' ? 'VENCIDO' : 'PENDENTE'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '0 0 2px' }}>Créditos Restantes</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', margin: 0 }}>
                          {(sub?.servicesTotal ?? 0) - (sub?.servicesUsed ?? 0)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ {sub?.servicesTotal}</span>
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '0 0 2px' }}>Vencimento</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                          {sub?.endDate ? new Date(sub.endDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => handleEditClick(client)} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Editar">
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => deleteClient(client.id)} style={{ background: 'rgba(255,23,68,0.05)', border: 'none', color: '#ff1744', cursor: 'pointer', fontSize: '0.75rem', padding: '6px', borderRadius: '8px' }} title="Remover">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {vipClients.length === 0 && (
              <div className="premium-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Nenhum cliente VIP encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;

