import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Scissors, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  ShoppingCart,
  Crown,
  Store,
  Percent,
  Camera,
  X
} from 'lucide-react';
import { useApp, UserRole } from '../context/AppContext';
import { convertToWebP, uploadImage } from '../utils/imageUtils';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: any) => void;
  notificationCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, notificationCount = 0 }) => {
  const { role, logout, profiles = [], userId, config, clients = [], shopData, updateProfile } = useApp();

  const currentProfile = profiles.find(p => p.id === userId) ?? profiles.find(p => p.role === role);

  // States for profile editing
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const getUserRoleLabel = () => {
    switch (role) {
      case 'customer':
        return 'Cliente';
      case 'professional':
        return 'Profissional';
      case 'owner':
        return 'Lojista';
      case 'superadmin':
        return 'Super Admin';
      default:
        return 'Usuário';
    }
  };

  const getUserNameLabel = () => {
    switch (role) {
      case 'customer':
        return clients.find(c => c.id === userId)?.name || 'Cliente';
      case 'professional':
        return profiles.find(p => p.id === userId)?.name || 'Profissional';
      case 'owner':
        return profiles.find(p => p.id === userId)?.name || profiles.find(p => p.role === 'owner')?.name || shopData?.name || config?.businessName || 'Lojista';
      case 'superadmin':
        return 'Administrador';
      default:
        return currentProfile?.name || 'Usuário';
    }
  };

  const userRoleLabel = getUserRoleLabel();
  const userNameLabel = getUserNameLabel();

  const handleProfileClick = () => {
    if (role === 'customer' || role === 'superadmin') return;
    setProfileName(currentProfile?.name || userNameLabel || '');
    setAvatarPreview(currentProfile?.avatar || '');
    setProfileFile(null);
    setShowEditProfile(true);
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !updateProfile) return;
    setIsSavingProfile(true);
    try {
      let avatarUrl = avatarPreview;
      if (profileFile) {
        // Convert to WebP
        const webpBlob = await convertToWebP(profileFile);
        // Upload to storage
        avatarUrl = await uploadImage('avatars', webpBlob, shopData?.id || 'common', `profile-${userId}`);
      }
      
      await updateProfile(userId, {
        name: profileName,
        avatar: avatarUrl
      });
      
      alert('Perfil atualizado com sucesso!');
      setShowEditProfile(false);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao atualizar perfil: ' + (err.message || err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const menuItems = [
    { id: 'dashboard',    label: (role === 'customer' || role === 'professional') ? 'Início' : 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'professional', 'customer'] },
    { id: 'agendamentos', label: role === 'customer' ? 'Meus Agendamentos' : 'Agenda', icon: Calendar, roles: ['owner', 'professional', 'customer'], badge: notificationCount },
    { id: 'assinatura',   label: 'Assinatura',    icon: Crown,           roles: ['customer'] },
    { id: 'vitrine',      label: 'Vitrine',        icon: Store,           roles: ['owner', 'professional'] },
    { id: 'pdv',           label: 'Ponto de Venda', icon: ShoppingCart,    roles: ['owner'] },
    { id: 'abates',        label: 'Ponto de Abate', icon: Percent,         roles: ['owner', 'professional'] },
    { id: 'servicos',      label: 'Serviços',      icon: Scissors,        roles: ['owner'] },
    { id: 'vipplans',      label: 'Planos VIP',    icon: Crown,           roles: ['owner'] },
    { id: 'produtos',      label: 'Produtos',      icon: Package,         roles: ['owner'] },
    { id: 'clientes',     label: 'Clientes',     icon: Users,           roles: ['owner'] },
    { id: 'profissionais', label: 'Equipe',         icon: User,            roles: ['owner'] },
    { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3,       roles: ['owner'] },
    { id: 'configuracoes', label: 'Configurações',  icon: Settings,        roles: ['owner'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role as string));

  return (
    <>
      <aside style={{
        width: '240px', height: '100vh', background: 'rgba(10, 10, 10, 0.98)',
        borderRight: '1px solid rgba(212,175,55,0.1)', display: 'flex', flexDirection: 'column',
        padding: '2rem 1rem', zIndex: 100, position: 'relative'
      }}>
        {/* Brand */}
        <div style={{ padding: '0 1rem 3rem', textAlign: 'center' }}>
          <img 
            src={config?.logoUrl || "/logo_main.jpg"} 
            alt="Logo" 
            style={{ width: '40px', height: 'auto', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.2))' }} 
            onError={e => (e.target as any).style.display = 'none'}
          />
          <h1 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '0.05em' }}>{config?.businessName || 'REI DA RÉGUA'}</h1>
          <p style={{ fontSize: '0.6rem', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.2em', marginTop: '4px' }}>PREMIUM</p>
        </div>

        {/* Profile */}
        <div 
          onClick={handleProfileClick}
          style={{
            padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '16px',
            border: '1px solid rgba(212,175,55,0.1)', marginBottom: '2rem',
            display: 'flex', alignItems: 'center', gap: '12px',
            cursor: (role === 'customer' || role === 'superadmin') ? 'default' : 'pointer'
          }}
          title={role !== 'customer' && role !== 'superadmin' ? 'Editar Perfil' : undefined}
        >
          {role !== 'customer' && (
            <img 
              src={currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userNameLabel}`} 
              alt="Avatar" 
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)' }} 
            />
          )}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: 'white' }}>{userRoleLabel}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userNameLabel}</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem 1rem',
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                  border: 'none', borderRadius: '12px', color: isActive ? 'var(--accent-gold)' : '#888',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', position: 'relative'
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? '700' : '600' }}>{item.label}</span>
                
                {(item.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', right: '12px', background: '#ff4444', color: 'white',
                    fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px', borderRadius: '6px',
                    boxShadow: '0 0 10px rgba(255,68,68,0.3)'
                  }}>
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div style={{ position: 'absolute', left: '-1rem', width: '4px', height: '20px', background: 'var(--accent-gold)', borderRadius: '0 4px 4px 0' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button 
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem',
            marginTop: 'auto', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.1)',
            borderRadius: '16px', color: '#ff4444', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <LogOut size={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Sair da Conta</span>
        </button>
      </aside>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="premium-card" style={{
            width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid var(--accent-gold)',
            position: 'relative', background: '#0a0a0a', animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <button onClick={() => setShowEditProfile(false)} style={{
              position: 'absolute', top: '1rem', right: '1rem', background: 'transparent',
              border: 'none', color: '#888', cursor: 'pointer', padding: '4px'
            }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', marginBottom: '1.5rem', textAlign: 'center' }}>
              Editar Perfil
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Photo Upload area */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                  <img
                    src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileName}`}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
                  />
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: 0, right: 0, background: 'var(--accent-gold)',
                      border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)', color: 'black'
                    }}
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    type="file"
                    ref={profileFileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Toque na câmera para alterar</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: '600' }}>Nome</label>
                <input
                  required
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  style={{
                    padding: '0.8rem', borderRadius: '8px', background: '#151515',
                    border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '0.9rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="gold-button"
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '10px',
                  fontWeight: '800', fontSize: '1rem', marginTop: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
