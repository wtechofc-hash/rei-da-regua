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
  LogOut,
  ShoppingCart,
  Crown,
  Percent
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import './index.css';
import { Store } from 'lucide-react';

export type Page = 'dashboard' | 'agendamentos' | 'servicos' | 'produtos' | 'clientes' | 'relatorios' | 'configuracoes' | 'profissionais' | 'pdv' | 'vipplans' | 'assinatura' | 'vitrine' | 'abates' | '__more__';

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
const PDV          = React.lazy(() => import('./components/PDV'));
const VIPPlans     = React.lazy(() => import('./components/VIPPlans'));
const CustomerSubscription = React.lazy(() => import('./components/CustomerSubscription'));
const Abatements   = React.lazy(() => import('./components/Abatements'));

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
  { id: 'assinatura',   label: 'VIP',      icon: Crown },
  { id: 'clientes',     label: 'Clientes', icon: Users },
  { id: 'vitrine',      label: 'Vitrine',  icon: Store },
  { id: '__more__',     label: 'Mais',     icon: Menu },
  { id: '__logout__',   label: 'Sair',     icon: LogOut },
];

const MORE_NAV = [
  { id: 'vitrine',       label: 'Vitrine',        icon: Store },
  { id: 'pdv',           label: 'Ponto de Venda', icon: ShoppingCart },
  { id: 'servicos',      label: 'Serviços',      icon: Scissors },
  { id: 'vipplans',      label: 'Planos VIP',    icon: Crown },
  { id: 'produtos',      label: 'Produtos',      icon: Package },
  { id: 'profissionais', label: 'Equipe',         icon: User },
  { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações',  icon: SettingsIcon },
  { id: 'abates',        label: 'Abates',         icon: Percent },
];

const AppContent: React.FC = () => {
  const { role, userId, shopData, setAuth, logout, profiles = [], appointments = [], clearProNotifications, config, clients = [] } = useApp();
  const [page, setPage] = useState<Page>('dashboard');
  const isPopState = React.useRef(false);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const handleOpenMore = () => setPage('__more__');

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopState.current = true;
      if (event.state && event.state.page) {
        setPage(event.state.page as Page);
      } else {
        setPage('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    if (!window.history.state) {
      window.history.replaceState({ page: 'dashboard' }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isPopState.current) {
      isPopState.current = false;
      return;
    }
    const currentState = window.history.state;
    if (currentState && currentState.page !== page) {
      window.history.pushState({ page }, '');
    }
  }, [page]);

  // Reset scroll to top on every page change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [page]);

  // Dynamically update favicon to match the shop's logo
  useEffect(() => {
    const logoUrl = config?.logoUrl || '/logo_main.jpg';
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) {
      link.href = logoUrl;
    }
  }, [config?.logoUrl]);

  
  const currentProfile = role === 'customer' 
    ? null 
    : (profiles.find(p => p.id === userId) ?? profiles.find(p => p.role === role) ?? profiles[0]);
  const currentClient = role === 'customer' ? clients.find(c => c.id === userId) : null;
  const userAvatar = role === 'customer'
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentClient?.name || 'Cliente'}`
    : (currentProfile?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`);

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
      case '__more__':
        return (
          <div style={{
            padding: '1.5rem 1rem',
            minHeight: '100%',
            background: '#050505',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>Menu</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem',
              width: '100%'
            }}>
              {(() => {
                const dynamicMoreNav = [
                  ...MORE_NAV,
                  ...(role === 'owner' ? [{ id: 'assinatura', label: 'Assinatura VIP', icon: Crown }] : []),
                  { id: '__logout__', label: 'Sair da Conta', icon: LogOut }
                ];
                return dynamicMoreNav.map(item => {
                  const Icon = item.icon;
                  const isLogout = item.id === '__logout__';
                  return (
                    <button key={item.id} onClick={() => {
                      if (isLogout) {
                        logout();
                      } else {
                        setPage(item.id as Page);
                      }
                    }} style={{
                      background: '#111111', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '16px', 
                      padding: '1.25rem 0.5rem', 
                      color: 'white',
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      width: '100%'
                    }}>
                      <div style={{ 
                        background: isLogout ? 'rgba(255,23,68,0.12)' : 'rgba(212,175,55,0.12)', 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: isLogout ? '#ff1744' : '#d4af37' 
                      }}>
                        <Icon size={20} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', textAlign: 'center' }}>{item.label}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        );
      case 'dashboard':
        if (role === 'customer') return <Storefront />;
        return <Dashboard onViewAll={() => setPage('agendamentos')} />;
      case 'agendamentos':  return <Appointments />;
      case 'servicos':      return <Services />;
      case 'vipplans':      return <VIPPlans />;
      case 'produtos':      return <Products />;
      case 'clientes':      return <Clients />;
      case 'relatorios':    return <Reports />;
      case 'profissionais': return <Professionals />;
      case 'configuracoes': return <Settings />;
      case 'pdv':           return <PDV />;
      case 'abates':        return <Abatements />;
      case 'vitrine':       return <Storefront />;
      case 'assinatura':    return <CustomerSubscription />;
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
          display: 'none', 
          alignItems: 'flex-start', 
          height: '48px', 
          background: 'transparent',
          zIndex: 100,
          position: 'relative'
        }}>
          {/* Left Wing */}
          <div style={{
            flex: 1,
            height: '100%',
            background: '#0a0a0a',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '0 0 0 16px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '1.25rem'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Olá,</p>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '900', color: 'white' }}>
                {role === 'customer' ? (clients.find(c => c.id === userId)?.name?.split(' ')[0] || 'Cliente') : (profiles.find(p => p.id === userId)?.name?.split(' ')[0] || 'Usuário')}
              </p>
            </div>
          </div>

          {/* Center Notch */}
          <div style={{
            width: '80px',
            height: '60px',
            background: '#0a0a0a',
            borderRadius: '0 0 40px 40px',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            borderLeft: '1px solid rgba(212,175,55,0.15)',
            borderRight: '1px solid rgba(212,175,55,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
            alignSelf: 'flex-start',
            zIndex: 1
          }}>
            <img 
              src={config?.logoUrl || "/logo_main.jpg"} 
              alt="Logo" 
              style={{ height: '42px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.2))' }} 
              onError={e => (e.target as any).style.display = 'none'} 
            />
          </div>

          {/* Right Wing */}
          <div style={{
            flex: 1,
            height: '100%',
            background: '#0a0a0a',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '1.25rem'
          }}>
            {/* User avatar removed as requested */}
          </div>
        </header>

        <main 
          ref={mainRef} 
          className={(role === 'customer' && page === 'dashboard') ? "" : "main-content"} 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            paddingBottom: (role === 'customer' && page === 'dashboard') ? '0' : '88px',
            background: 'var(--bg-primary)'
          }}
        >
          <div 
            className={(role === 'customer' && page === 'dashboard') ? "" : "page-container"}
            style={{ 
              padding: (role === 'customer' && page === 'dashboard') ? '0' : undefined 
            }}
          >
            <ErrorBoundary>
              <Suspense key={page} fallback={<Spinner />}>
                {renderPage()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

      {/* Mobile Nav */}
      {role !== 'superadmin' && (
        <nav id="nav-mobile" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '72px',
          background: '#0a0a0a',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 10000
        }}>
          {BOTTOM_NAV.filter(item => {
            if (role === 'customer') {
              return ['dashboard', 'agendamentos', 'assinatura', '__logout__'].includes(item.id);
            }
            if (role === 'professional') {
              return ['dashboard', 'agendamentos', '__fab__', 'vitrine', '__logout__'].includes(item.id);
            }
            // Owner sees: Inicio, Agenda, +, Clientes, Mais
            return ['dashboard', 'agendamentos', '__fab__', 'clientes', '__more__'].includes(item.id);
          }).map(item => {
            const Icon = item.icon;
            if (item.isFab) return (
              <button key={item.id} onClick={() => {
                if (page === 'agendamentos') {
                  // Already on appointments page — dispatch immediately
                  window.dispatchEvent(new CustomEvent('open-appointment-modal'));
                } else {
                  // Set flag before navigating so Appointments.tsx reads it on mount
                  sessionStorage.setItem('openApptModal', '1');
                  setPage('agendamentos');
                }
              }} style={{
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
              <button key={item.id} onClick={() => {
                if (item.id === '__logout__') return logout();
                if (isMais) return setPage('__more__');
                setPage(item.id as Page);
              }} style={{
                background: 'transparent', border: 'none', flex: 1, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                color: (isActive || (isMais && page === '__more__')) ? '#d4af37' : '#555',
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
