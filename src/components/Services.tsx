import React, { useState } from 'react';
import { Plus, Scissors, Trash2, Percent, Edit2 } from 'lucide-react';
import { useApp, Service } from '../context/AppContext';

const Services: React.FC = () => {
  const { services = [], addService, updateService, deleteService } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', promotionPrice: '', commission: '', duration: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      name: formData.name, 
      description: formData.description, 
      price: Number(formData.price), 
      promotionPrice: formData.promotionPrice ? Number(formData.promotionPrice) : undefined,
      commission: Number(formData.commission),
      duration: Number(formData.duration) || 30
    };

    if (editingId) {
      updateService(editingId, data);
    } else {
      addService(data);
    }

    setFormData({ name: '', description: '', price: '', promotionPrice: '', commission: '', duration: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEditClick = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      promotionPrice: service.promotionPrice ? service.promotionPrice.toString() : '',
      commission: service.commission.toString(),
      duration: service.duration ? service.duration.toString() : '30'
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', price: '', promotionPrice: '', commission: '', duration: '' });
    setEditingId(null);
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
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { handleCancel(); setIsAdding(true); }}>
          <Plus size={18} /> Novo Serviço
        </button>
      </header>

      {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {editingId ? 'Editar Serviço' : 'Adicionar Serviço'}
          </h3>
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
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Preço Promocional (R$)</label>
              <input type="number" step="0.01" placeholder="Opcional" style={inputStyle}
                value={formData.promotionPrice} onChange={e => setFormData({ ...formData, promotionPrice: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comissão (%)</label>
              <input required type="number" style={inputStyle}
                value={formData.commission} onChange={e => setFormData({ ...formData, commission: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Duração Média (min)</label>
              <input required type="number" placeholder="Ex: 30" style={inputStyle}
                value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Descrição</label>
              <input type="text" style={inputStyle}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }}>
                {editingId ? 'Salvar Alterações' : 'Salvar Serviço'}
              </button>
              <button type="button" onClick={handleCancel} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {service.promotionPrice && (
                    <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                      R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-gold)' }}>
                    R$ {(service.promotionPrice || service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <Percent size={11} /> {service.commission}% comissão
                </span>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>• {service.duration || 30} min</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => handleEditClick(service)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '6px', transition: 'color 0.2s' }} title="Editar">
                <Edit2 size={15} />
              </button>
              <button onClick={() => deleteService(service.id)} style={{ background: 'transparent', border: 'none', color: '#ff1744', cursor: 'pointer', padding: '6px', transition: 'color 0.2s' }} title="Remover">
                <Trash2 size={15} />
              </button>
            </div>
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

