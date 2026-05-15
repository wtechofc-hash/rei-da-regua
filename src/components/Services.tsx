import React, { useState } from 'react';
import { Plus, Scissors, Trash2, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Services: React.FC = () => {
  const { services = [], addService, deleteService } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', commission: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addService({ name: formData.name, description: formData.description, price: Number(formData.price), commission: Number(formData.commission) });
    setFormData({ name: '', description: '', price: '', commission: '' });
    setIsAdding(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.85rem', borderRadius: '10px',
    background: '#1a1a1a', border: '1px solid var(--glass-border)', color: 'white', width: '100%'
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Serviços</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>Catálogo de serviços e comissões</p>
        </div>
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
          <Plus size={18} /> Novo Serviço
        </button>
      </header>

      {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Adicionar Serviço</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome do Serviço</label>
              <input required type="text" placeholder="Ex: Corte Degradê" style={inputStyle}
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Preço (R$)</label>
              <input required type="number" step="0.01" style={inputStyle}
                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comissão (%)</label>
              <input required type="number" style={inputStyle}
                value={formData.commission} onChange={e => setFormData({ ...formData, commission: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Descrição</label>
              <input type="text" style={inputStyle}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }}>Salvar Serviço</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {services.map(service => (
          <div key={service.id} className="premium-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'var(--accent-gold-soft)', padding: '14px', borderRadius: '14px', color: 'var(--accent-gold)', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)' }}>
              <Scissors size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontWeight: '700', fontSize: '1rem', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</h4>
              {service.description && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.description}</p>
              )}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-gold)' }}>
                  R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <Percent size={11} /> {service.commission}% comissão
                </span>
              </div>
            </div>
            <button onClick={() => deleteService(service.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '8px', flexShrink: 0 }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {services.length === 0 && (
          <div className="premium-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Scissors size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum serviço cadastrado.</p>
            <button className="gold-button" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
              <Plus size={18} /> Adicionar primeiro serviço
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
