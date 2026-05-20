import React from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { useApp, UserRole } from '../context/AppContext';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: any) => void;
  notificationCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, notificationCount = 0 }) => {
  const { role, logout, profiles, userId, config } = useApp();

  const currentProfile = profiles.find(p => p.id === userId) ?? profiles.find(p => p.role === role);

  const menuItems = [
    { id: 'dashboard',    label: role === 'customer' ? 'Vitrine' : 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'professional', 'customer'] },
    { id: 'agendamentos', label: role === 'customer' ? 'Meus Agendamentos' : 'Agenda', icon: Calendar, roles: ['owner', 'professional', 'customer'], badge: notificationCount },
    { id: 'pdv',           label: 'Ponto de Venda', icon: ShoppingCart,    roles: ['owner'] },
    { id: 'servicos',      label: 'Serviços',      icon: Scissors,        roles: ['owner', 'professional'] },
    { id: 'produtos',      label: 'Produtos',      icon: Package,         roles: ['owner', 'professional'] },
    { id: 'clientes',     label: 'Clientes',     icon: Users,           roles: ['owner'] },
    { id: 'profissionais', label: 'Equipe',         icon: User,            roles: ['owner'] },
    { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3,       roles: ['owner', 'professional'] },
    { id: 'configuracoes', label: 'Configurações',  icon: Settings,        roles: ['owner', 'customer'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role as string));

  return (
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
      <div style={{
        padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '16px',
        border: '1px solid rgba(212,175,55,0.1)', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <img 
          src={currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} 
          alt="Avatar" 
          style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)' }} 
        />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentProfile?.name || 'Usuário'}</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', margin: 0, textTransform: 'capitalize' }}>{role === 'owner' ? 'Administrador' : 'Profissional'}</p>
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
  );
};

export default Sidebar;
