// Deployment update: 2026-05-16 00:15
import React, { useState, Suspense, Component, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon, 
  Menu, 
  User, 
  Plus,
  LogOut
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import './index.css';

export type Page = 'dashboard' | 'agendamentos' | 'servicos' | 'produtos' | 'clientes' | 'relatorios' | 'configuracoes' | 'profissionais';

const Sidebar      = React.lazy(() => import('./components/Sidebar'));
const Dashboard    = React.lazy(() => import('./components/Dashboard'));
const Appointments = React.lazy(() => import('./components/Appointments'));
const Services     = React.lazy(() => import('./components/Services'));
const Products     = React.lazy(() => import('./components/Products'));
const Clients      = React.lazy(() => import('./components/Clients'));
const Reports      = React.lazy(() => import('./components/Reports'));
const Professionals = React.lazy(() => import('./components/Professionals'));
const Storefront   = React.lazy(() => import('./components/Storefront'));
const Login        = React.lazy(() => import('./components/Login'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const Settings     = React.lazy(() => import('./components/Settings'));

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: any) { return { error: String(e) }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem' }}>
          <div style={{ background: '#1a0000', border: '1px solid #ff4444', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: '#ff4444', marginBottom: '0.75rem', fontSize: '1rem' }}>Erro ao renderizar</h3>
            <pre style={{ fontSize: '0.72rem', color: '#ff8888', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', background: '#d4af37', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#050505' }}>
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(212,175,55,0.15)', borderTopColor: '#d4af37', animation: 'spin 0.8s linear infinite' }} />
    <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
  </div>
);

/* ─── bottom nav items ──────────────────────────────────────────── */
const BOTTOM_NAV = [
  { id: 'dashboard',    label: 'Início',   icon: LayoutDashboard },
  { id: 'agendamentos', label: 'Agenda',   icon: Calendar },
  { id: '__fab__',      label: '+',        icon: Plus,  isFab: true },
  { id: 'clientes',     label: 'Clientes', icon: Users },
  { id: '__more__',     label: 'Mais',     icon: Menu },
];

const MORE_NAV = [
  { id: 'servicos',      label: 'Serviços',      icon: Scissors },
  { id: 'produtos',      label: 'Produtos',      icon: Package },
  { id: 'profissionais', label: 'Equipe',         icon: User },
  { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações',  icon: Settings },
];

const AppContent: React.FC = () => {
  const { role, userId, shopData, setAuth, logout, profiles = [], appointments = [], clearProNotifications, config } = useApp();
  const [page, setPage] = useState<Page>('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreOpenTime, setMoreOpenTime] = useState(0);

  const handleOpenMore = () => {
    setMoreOpen(true);
    setMoreOpenTime(Date.now());
  };
  
  const currentProfile = profiles.find(p => p.id === userId) ?? profiles.find(p => p.role === role) ?? profiles[0];

  // Contagem de notificações (Agendamentos novos pendentes para o profissional)
  const notificationCount = role === 'professional' 
    ? appointments.filter(a => a.professionalId === userId && a.isNewForPro).length
    : 0;

  useEffect(() => {
    if (page === 'agendamentos' && role === 'professional' && userId) {
      clearProNotifications(userId);
    }
  }, [page, role, userId, clearProNotifications]);

  if (!role) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Spinner />}>
          <Login />
        </Suspense>
      </ErrorBoundary>
    );
  }


  const diffDays = shopData?.subscription_ends_at 
    ? Math.ceil((new Date(shopData.subscription_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
    : 0;
  const isExpired = !!shopData?.subscription_ends_at && diffDays <= 0;
  const isSuspended = shopData?.subscription_status === 'suspended';
  const isBlocked = isExpired || isSuspended;

  const renderPage = () => {
    if (role === 'superadmin') return <AdminDashboard />;
    
    
    switch (page) {
      case 'dashboard':
        if (role === 'customer') return <Storefront />;
        return <Dashboard onViewAll={() => setPage('agendamentos')} />;
      case 'agendamentos':  return <Appointments />;
      case 'servicos':      return <Services />;
      case 'produtos':      return <Products />;
      case 'clientes':      return <Clients />;
      case 'relatorios':    return <Reports />;
      case 'profissionais': return <Professionals />;
      case 'configuracoes': return <Settings />;
      default: 
        if (role === 'customer') return <Storefront />;
        return <Dashboard onViewAll={() => setPage('agendamentos')} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', width: '100vw', background: 'var(--bg-primary)', color: 'white', overflow: 'hidden' }}>

      {role !== 'superadmin' && (
        <div id="sb-desktop">
          <ErrorBoundary>
            <Suspense fallback={<div style={{ width: '240px', background: '#0a0a0a', height: '100dvh' }} />}>
              <Sidebar activePage={page} setActivePage={setPage} notificationCount={notificationCount} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
        
        {/* Impersonation Banner */}
        {role === 'owner' && userId === 'admin-support' && (
          <div style={{ background: '#ffaa00', color: '#000', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', zIndex: 1000 }}>
            <span style={{ fontSize: '0.8rem' }}>⚠️ Você está acessando a loja como Super Admin.</span>
            <button 
              onClick={() => setAuth('superadmin', '0')}
              style={{ background: 'rgba(0,0,0,0.2)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '900', color: '#000', fontSize: '0.75rem' }}
            >
              Voltar ao Painel ADM
            </button>
          </div>
        )}

        {/* Subscription Lock Banners */}
        {(() => {
          if ((role !== 'owner' && role !== 'professional') || !shopData) return null;

          if (isBlocked) {
            return (
               <div style={{ background: '#ff4444', color: '#fff', padding: '8px 15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800', zIndex: 999 }}>
                  <span style={{ fontSize: '0.8rem' }}>⚠️ Sua assinatura está {isSuspended ? 'SUSPENSA' : 'VENCIDA'}. Efetue o pagamento para liberar o sistema.</span>
               </div>
            );
          }

          if (role === 'owner' && diffDays > 0 && diffDays <= 5) {
            return (
              <div style={{ background: '#ffaa00', color: '#000', padding: '8px 15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800', zIndex: 999 }}>
                <span style={{ fontSize: '0.8rem' }}>⚠️ Atenção: Sua assinatura vence em {diffDays} dia(s).</span>
              </div>
            );
          }
          
          return null;
        })()}

        <header id="header-mobile" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.25rem', background: 'rgba(10, 10, 10, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={config?.logoUrl || "/logo_main.jpg"} alt="Logo" style={{ height: '32px', width: 'auto' }} onError={e => (e.target as any).style.display = 'none'} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: 'white', letterSpacing: '0.05em' }}>REI DA RÉGUA</p>
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.1em' }}>BARBEARIA PREMIUM</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={currentProfile?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} 
              style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)' }} 
              alt="User"
              onClick={logout}
            />
          </div>
        </header>

        <main className="main-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: '160px' }}>
          <div style={{ padding: '1.25rem 1.25rem 40px' }}>
            <ErrorBoundary>
              <Suspense fallback={<Spinner />}>
                {renderPage()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

      {/* Mobile Nav */}
      {role !== 'superadmin' && (
        <nav id="nav-mobile" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '72px',
        background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 10000
      }}>
        {BOTTOM_NAV.filter(item => {
          if (role === 'customer') {
            return ['dashboard', 'agendamentos', '__more__'].includes(item.id);
          }
          return true;
        }).map(item => {
          const Icon = item.icon;
          if (item.isFab) return (
            <button key={item.id} onClick={() => setPage('agendamentos')} style={{
              width: '56px', height: '56px', borderRadius: '18px', border: 'none',
              background: 'linear-gradient(135deg,#c5a059,#8e6d2d)', color: '#000',
              fontSize: '1.6rem', fontWeight: '900', marginBottom: '32px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.4), 0 0 15px rgba(197,160,89,0.3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Plus size={28} strokeWidth={3} />
            </button>
          );
          
          const isMais  = item.id === '__more__';
          const isActive = page === item.id;
          const isAgenda = item.id === 'agendamentos';

          return (
            <button key={item.id} onClick={() => isMais ? handleOpenMore() : setPage(item.id as Page)} style={{
              background: 'transparent', border: 'none', flex: 1, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
              color: (isActive || (isMais && moreOpen)) ? '#d4af37' : '#555',
              transition: 'all 0.2s', position: 'relative'
            }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.02em' }}>{item.label}</span>
              
              {isAgenda && notificationCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '15px', background: '#ff4444', color: 'white',
                  fontSize: '0.6rem', minWidth: '16px', height: '16px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900',
                  boxShadow: '0 0 10px rgba(255,68,68,0.5)', border: '2px solid #0a0a0a'
                }}>
                  {notificationCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      )}

        {/* More menu */}
        {moreOpen && (
          <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '72px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: '#0d0d0d', borderRadius: '32px 32px 0 0',
            padding: '1.5rem 1.25rem 2rem', borderTop: '1px solid rgba(212,175,55,0.2)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 2.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {MORE_NAV.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => { 
                    if (Date.now() - moreOpenTime < 300) return;
                    setPage(item.id as Page); 
                    setMoreOpen(false); 
                  }} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px', padding: '1.5rem 0.5rem', color: 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <div style={{ background: 'rgba(212,175,55,0.1)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                      <Icon size={22} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          #sb-desktop  { display: block !important; }
          #nav-mobile  { display: none  !important; }
          #header-mobile { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
        }
        @media (max-width: 768px) {
          #sb-desktop  { display: none  !important; }
          #nav-mobile  { display: flex  !important; }
          #header-mobile { display: flex !important; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
