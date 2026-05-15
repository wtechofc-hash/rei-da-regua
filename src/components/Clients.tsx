import React, { useState } from 'react';
import { Plus, Search, Phone, Calendar, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Clients: React.FC = () => {
  const { clients = [], addClient } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addClient({ name: formData.name, phone: formData.phone, email: formData.email, totalSpent: 0, appointmentsCount: 0 });
    setFormData({ name: '', phone: '', email: '' });
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
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
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
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Cadastrar Cliente</h3>
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
              <button type="submit" className="gold-button" style={{ flex: 1 }}>Salvar Cliente</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(client => (
          <div key={client.id} className="premium-card" style={{ padding: '1.25rem' }}>
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

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <Calendar size={13} />
                {client.lastVisit ? new Date(client.lastVisit + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem visitas'}
              </span>
              <button style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 12px', borderRadius: '8px' }}>
                Histórico
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="premium-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Search size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)' }}>{searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
