import React, { useState } from 'react';
import { Plus, Package, Trash2, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Products: React.FC = () => {
  const { products = [], addProduct, updateProduct, deleteProduct } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', commission: '10', stock: '0'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProduct({
      name: formData.name, description: formData.description,
      price: Number(formData.price), commission: Number(formData.commission), stock: Number(formData.stock)
    });
    setFormData({ name: '', description: '', price: '', commission: '10', stock: '0' });
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Produtos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>Gestão de estoque e vitrine</p>
        </div>
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
          <Plus size={18} /> Novo Produto
        </button>
      </header>

      {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Cadastrar Novo Produto</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome do Produto</label>
              <input required type="text" placeholder="Ex: Pomada Modeladora 150g" style={inputStyle}
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Preço de Venda (R$)</label>
              <input required type="number" step="0.01" style={inputStyle}
                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Estoque Inicial</label>
              <input required type="number" style={inputStyle}
                value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comissão (%)</label>
              <input required type="number" style={inputStyle}
                value={formData.commission} onChange={e => setFormData({ ...formData, commission: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Descrição</label>
              <input type="text" style={inputStyle}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }}>Salvar Produto</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {products.map(product => (
          <div key={product.id} className="premium-card" style={{ padding: '1.25rem' }}>
            {/* Product image area */}
            <div style={{ height: '130px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', position: 'relative', border: '1px solid rgba(255,255,255,0.04)' }}>
              <Package size={42} style={{ color: 'var(--accent-gold)', opacity: 0.25 }} />
              {product.stock < 5 && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,23,68,0.12)', color: '#ff5252', padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid rgba(255,23,68,0.2)' }}>
                  ⚠ ESTOQUE BAIXO
                </div>
              )}
            </div>

            <h4 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{product.name}</h4>
            {product.description && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{product.description}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-gold)' }}>
                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '6px' }}>
                {product.commission}% comissão
              </span>
            </div>

            {/* Stock control */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Em Estoque</p>
                <p style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: product.stock < 5 ? '#ff5252' : 'white' }}>{product.stock} un</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => updateProduct(product.id, { stock: Math.max(0, product.stock - 1) })}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => updateProduct(product.id, { stock: product.stock + 1 })}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-gold-soft)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => deleteProduct(product.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                <Trash2 size={14} /> Remover
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="premium-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Package size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum produto cadastrado.</p>
            <button className="gold-button" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
              <Plus size={18} /> Adicionar primeiro produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
