import React, { useState, useRef } from 'react';
import { Plus, Users, Trash2, Mail, Shield, Edit2, Camera, X } from 'lucide-react';
import { useApp, Profile } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { convertToWebP, uploadImage } from '../utils/imageUtils';

const Professionals: React.FC = () => {
  const { profiles = [], addProfile, updateProfile, deleteProfile, shopId } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  // Image states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', password: '' });
    setImagePreview('');
    setSelectedFile(null);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalAvatarUrl = imagePreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`;

      if (editingId) {
        if (selectedFile) {
          const webpBlob = await convertToWebP(selectedFile);
          finalAvatarUrl = await uploadImage('avatars', webpBlob, shopId || 'common', `profile-${editingId}`);
        }
        const data = {
          name: formData.name,
          email: formData.email,
          avatar: finalAvatarUrl
        };
        await updateProfile(editingId, data);
        handleCancel();
      } else {
        const { data: authData, error: signupError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });

        let userId: string | null = null;

        if (signupError) {
          if (signupError.message?.toLowerCase().includes('already registered') || signupError.message?.toLowerCase().includes('already exists')) {
            const { data: existing } = await supabase.from('professionals').select('id').eq('email', formData.email).maybeSingle();
            if (existing) {
              alert('Este e-mail já está cadastrado como profissional.');
              return;
            }
            alert('Este e-mail já está registrado no sistema de autenticação. Use um e-mail diferente ou contate o suporte.');
            return;
          }
          throw signupError;
        }

        if (!authData.user) throw new Error('Falha ao obter dados do usuário.');
        userId = authData.user.id;

        if (selectedFile) {
          const webpBlob = await convertToWebP(selectedFile);
          finalAvatarUrl = await uploadImage('avatars', webpBlob, shopId || 'common', `profile-${userId}`);
        }

        const dbPayload = {
          id: userId,
          name: formData.name,
          email: formData.email,
          role: 'professional',
          photo_url: finalAvatarUrl,
          shop_id: shopId
        };
        const { data: profileData, error: insertError } = await supabase.from('professionals').insert([dbPayload]).select();
        if (insertError) throw insertError;
        
        if (profileData && addProfile) {
          addProfile({
            id: userId,
            name: formData.name,
            role: 'professional',
            avatar: finalAvatarUrl,
            email: formData.email
          });
        }

        handleCancel();
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        alert('Este e-mail já está cadastrado. Use um e-mail diferente.');
      } else {
        alert('Erro ao salvar profissional: ' + msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (pro: Profile) => {
    setEditingId(pro.id);
    setFormData({
      name: pro.name,
      email: pro.email || '',
      password: '',
    });
    setImagePreview(pro.avatar || '');
    setSelectedFile(null);
    setIsAdding(true);
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
          <form autoComplete="off" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            
            {/* Foto Upload */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                <img
                  src={imagePreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name || 'avatar')}`}
                  alt="Avatar Preview"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 0, right: 0, background: 'var(--accent-gold)',
                    border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    color: 'black'
                  }}
                >
                  <Camera size={12} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>Foto do Profissional (Opcional)</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Convertida automaticamente para WebP ao salvar.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome Completo</label>
              <input required autoComplete="off" type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Email</label>
              <input required autoComplete="new-email" type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Senha</label>
              <input required={!editingId} placeholder={editingId ? 'Preencha apenas para alterar' : ''} autoComplete="new-password" type="password" style={inputStyle} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" disabled={isSaving} className="gold-button" style={{ flex: 1 }}>
                {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar'}
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
                    style={{ width: '54px', height: '54px', borderRadius: '14px', border: '1px solid rgba(212,175,55,0.3)', objectFit: 'cover' }}
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
