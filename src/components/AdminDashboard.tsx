import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  QrCode, 
  Plus, 
  ExternalLink, 
  ShieldCheck, 
  LayoutDashboard,
  Search,
  Key
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

interface Shop {
  id: string;
  name: string;
  slug: string;
  qr_code_link: string;
  active: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { setAuth } = useApp();
  const [shops, setShops] = useState<Shop[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShop, setNewShop] = useState({ name: '', slug: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchShops();
    fetchStats();
  }, []);

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (data) setShops(data);
  };

  const fetchStats = async () => {
    const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    setClientsCount(count || 0);
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('shops').insert([newShop]).select();
    if (data) {
      setShops([data[0], ...shops]);
      setIsAddingShop(false);
      setNewShop({ name: '', slug: '' });
    }
  };

  const enterShop = (shopId: string) => {
    // Switch to 'owner' view for this specific shop
    setAuth('owner', 'admin-support', shopId);
  };

  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            <ShieldCheck size={24} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>Painel Central</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestão de Lojistas e Controle Global</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="premium-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Users size={18} color="var(--accent-gold)" />
             <div>
               <p style={{ margin: 0, fontSize: '0.65rem', color: '#555', fontWeight: '800' }}>TOTAL CLIENTES</p>
               <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900' }}>{clientsCount}</p>
             </div>
          </div>
          <button 
            onClick={() => setIsAddingShop(true)}
            className="gold-button" 
            style={{ padding: '0 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Plus size={20} /> Novo Lojista
          </button>
        </div>
      </header>

      {/* Search and Filters */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
        <input 
          type="text" 
          placeholder="Buscar lojista por nome ou slug..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '1.1rem 1.1rem 1.1rem 3.5rem', borderRadius: '16px',
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            color: 'white', fontSize: '0.95rem', outline: 'none'
          }}
        />
      </div>

      {/* Shops Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredShops.map(shop => (
          <div key={shop.id} className="premium-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{shop.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#555' }}>/{shop.slug}</p>
                </div>
              </div>
              <div style={{ padding: '4px 8px', borderRadius: '6px', background: shop.active ? 'rgba(0,255,0,0.05)' : 'rgba(255,0,0,0.05)', color: shop.active ? '#00ff00' : '#ff0000', fontSize: '0.65rem', fontWeight: '900' }}>
                {shop.active ? 'ATIVO' : 'INATIVO'}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.8rem' }}>
                <QrCode size={14} />
                <span>QR Code: {shop.qr_code_link || 'Não gerado'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.8rem' }}>
                <Key size={14} />
                <span>ID: {shop.id.substring(0, 8)}...</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                onClick={() => enterShop(shop.id)}
                style={{ 
                  padding: '0.75rem', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', 
                  border: '1px solid rgba(212,175,55,0.2)', color: 'var(--accent-gold)', 
                  fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                }}
              >
                <LayoutDashboard size={14} /> Entrar na Loja
              </button>
              <button 
                style={{ 
                  padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)', color: 'white', 
                  fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                }}
              >
                <ExternalLink size={14} /> Ver Vitrine
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Shop Modal */}
      {isAddingShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Novo Lojista</h2>
            <form onSubmit={handleAddShop} style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>NOME DA BARBEARIA</label>
                <input 
                  required type="text" 
                  value={newShop.name} 
                  onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                  placeholder="Ex: Barbearia do João"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SLUG (URL)</label>
                <input 
                  required type="text" 
                  value={newShop.slug} 
                  onChange={e => setNewShop({ ...newShop, slug: e.target.value.toLowerCase().replace(/\\s+/g, '-') })}
                  placeholder="ex: barbearia-joao"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddingShop(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '12px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: '800' }}>Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
