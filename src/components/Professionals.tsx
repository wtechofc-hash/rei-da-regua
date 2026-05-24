import React, { useState } from 'react';
import { Plus, Users, Trash2, Mail, Percent, Shield, Edit2, Eye, EyeOff } from 'lucide-react';
import { useApp, Profile } from '../context/AppContext';
import { supabase } from '../lib/supabase';

const Professionals: React.FC = () => {
  const { profiles = [], addProfile, updateProfile, deleteProfile } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', commission: '30' });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const data: any = {
    name: formData.name,
    email: formData.email,
    commission: Number(formData.commission),
    role: 'professional' as const,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`
  };
  if (editingId) {
    updateProfile(editingId, data);
    setFormData({ name: '', email: '', password: '', commission: '30' });
    setEditingId(null);
    setIsAdding(false);
  } else {
    try {
      const { error: signupError } = await supabase.auth.signUp({ email: data.email, password: formData.password });
      if (signupError) throw signupError;
      const { data: profileData } = await supabase.from('professionals').insert([data]);
      if (profileData) setProfiles(prev => [...prev, { ...data, id: profileData[0].id }]);
    } catch (err: any) {
      alert("Erro ao criar profissional: " + err.message);
    }
  }
  setFormData({ name: '', email: '', password: '', commission: '30' });
  setIsAdding(false);
};

  const handleEditClick = (pro: Profile) => {
    setEditingId(pro.id);
    setFormData({
      name: pro.name,
      email: pro.email || '',
      commission: (pro.commission ?? 30).toString()
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', commission: '30' });
    setEditingId(null);
    setIsAdding(false);
  };

  const staff = profiles.filter(p => p.role === 'professional');
  const inputStyle: React.CSSProperties = {
    padding: '0.85rem', borderRadius: '10px',
    background: '#1a1a1a', border: '1px solid var(--glass-border)', color: 'white', width: '100%'
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Equipe</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>{staff.length} profissional(is) ativo(s)</p>
        </div>
        <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { handleCancel(); setIsAdding(true); }}>
          <Plus size={18} /> Novo Profissional
        </button>
      </header>

      {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {editingId ? 'Editar Profissional' : 'Cadastrar Profissional'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome Completo</label>
              <input required type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Email</label>
                <input required type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Senha</label>
                <input required type="password" style={inputStyle} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comissão (%)</label>
              <input required type="number" style={inputStyle} value={formData.commission} onChange={e => setFormData({ ...formData, commission: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }}>
                {editingId ? 'Salvar Alterações' : 'Salvar'}
              </button>
              <button type="button" onClick={handleCancel} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {staff.map(pro => (
          <div key={pro.id} className="premium-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={pro.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${pro.name}`}
                    alt={pro.name}
                    style={{ width: '54px', height: '54px', borderRadius: '14px', border: '1px solid rgba(212,175,55,0.3)' }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&background=1a1a1a&color=d4af37`; }}
                  />
                  <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '14px', height: '14px', borderRadius: '50%', background: '#00c853', border: '2px solid #111' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>{pro.name}</h3>
                  <p style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', margin: '3px 0 0', fontWeight: '600' }}>Barbeiro Especialista</p>
                </div>
              </div>
              <button onClick={() => deleteProfile(pro.id)} style={{ background: 'transparent', border: 'none', color: '#ff1744', cursor: 'pointer', padding: '6px' }}>
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {pro.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Mail size={13} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                  {pro.email}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Percent size={13} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                {pro.commission ?? 0}% de comissão
              </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#00c853' }}>
                <Shield size={13} /> Acesso Ativo
              </div>
              <button onClick={() => handleEditClick(pro)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
                Editar
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="premium-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Users size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum profissional cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Professionals;

