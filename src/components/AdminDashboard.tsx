import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  ExternalLink, 
  ShieldCheck, 
  LayoutDashboard,
  Search,
  Banknote,
  Settings,
  Landmark,
  CheckCircle,
  XCircle,
  Trash2,
  CalendarDays,
  LogOut,
  Power,
  Phone,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

type Tab = 'lojistas' | 'clientes' | 'pagamentos' | 'configuracoes' | 'ganhos';

const AdminDashboard: React.FC = () => {
  const { setAuth, logout } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('lojistas');
  const [shops, setShops] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>({
    basica: { name: "Básica", price: 70, url: "", bank: "", receiver: "", key: "" }
  });
  
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [newShop, setNewShop] = useState({ name: '', slug: '', plan_type: 'Básica', login_email: '', login_password: '' });
  const [editShop, setEditShop] = useState({ name: '', slug: '', plan_type: 'Básica', login_email: '', login_password: '', subscription_ends_at: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [visibleClientPasswords, setVisibleClientPasswords] = useState<Record<string, boolean>>({});
  
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', password: '', shop_id: '' });
  const [editClient, setEditClient] = useState({ name: '', phone: '', email: '', password: '', shop_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch Shops
    const { data: shopsData } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (shopsData) setShops(shopsData);

    // Fetch Clients (All global clients)
    const { data: clientsData } = await supabase.from('clients').select('*, shops(name)').order('created_at', { ascending: false });
    if (clientsData) setClients(clientsData);

    // Fetch Payments
    const { data: payData } = await supabase.from('payment_notifications').select('*, shops(name)').order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    // Fetch Config
    const { data: configData } = await supabase.from('system_config').select('*').eq('key', 'subscription_plans').maybeSingle();
    if (configData?.value) {
      setSystemConfig(configData.value);
    }
  };

  const createAuthUser = async (email: string, password: string, role: string, metadata?: any) => {
    try {
      const res = await fetch('https://oongrdgcdxqijonjroam.supabase.co/functions/v1/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, metadata })
      });
      const data = await res.json();
      if (data.error) console.warn('Auth user creation warning:', data.error);
      return data;
    } catch (err) {
      console.error('Failed to create auth user:', err);
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    now.setDate(now.getDate() + 30); // 30 days free trial or initial period

    const { data, error } = await supabase.from('shops').insert([{
      name: newShop.name,
      slug: newShop.slug,
      plan_type: newShop.plan_type,
      login_email: newShop.login_email,
      login_password: newShop.login_password,
      subscription_ends_at: now.toISOString(),
      subscription_status: 'active'
    }]).select();

    if (data) {
      // Also register this logista in Supabase Auth
      await createAuthUser(newShop.login_email, newShop.login_password, 'owner', {
        shop_id: data[0].id,
        shop_name: newShop.name
      });
      
      setShops([data[0], ...shops]);
      setIsAddingShop(false);
      setNewShop({ name: '', slug: '', plan_type: 'Básica', login_email: '', login_password: '' });
      alert("Lojista criado com sucesso! Login registrado no sistema.");
    } else if (error) {
      alert("Erro ao criar lojista: " + error.message);
    }
  };

  const openEditModal = (shop: any) => {
    setEditingShopId(shop.id);
    
    // Format date for <input type="date"> which requires YYYY-MM-DD
    let formattedDate = '';
    if (shop.subscription_ends_at) {
      const d = new Date(shop.subscription_ends_at);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    setEditShop({
      name: shop.name,
      slug: shop.slug,
      plan_type: shop.plan_type || 'Básica',
      login_email: shop.login_email || '',
      login_password: shop.login_password || '',
      subscription_ends_at: formattedDate
    });
    setIsEditingShop(true);
  };

  const handleEditShop = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert back to full ISO string for Supabase timestamp
    let finalDate = undefined;
    if (editShop.subscription_ends_at) {
      finalDate = new Date(editShop.subscription_ends_at).toISOString();
    }

    const { error } = await supabase.from('shops').update({
      name: editShop.name,
      slug: editShop.slug,
      login_email: editShop.login_email,
      login_password: editShop.login_password,
      subscription_ends_at: finalDate
    }).eq('id', editingShopId);

    if (!error) {
      // Sync updated credentials to Supabase Auth (creates or updates the user)
      if (editShop.login_email && editShop.login_password) {
        await createAuthUser(editShop.login_email, editShop.login_password, 'owner', {
          shop_id: editingShopId,
          shop_name: editShop.name
        });
      }
      alert("Dados atualizados com sucesso! Credenciais sincronizadas.");
      setIsEditingShop(false);
      loadData();
    } else {
      alert("Erro: " + error.message);
    }
  };


  const handleSaveConfig = async () => {
    const { error } = await supabase.from('system_config').upsert({
      key: 'subscription_plans',
      value: systemConfig
    }, { onConflict: 'key' });
    
    if (!error) alert("Configurações salvas com sucesso!");
    else alert("Erro: " + error.message);
  };

  const handleApprovePayment = async (notif: any) => {
    const { error: notifErr } = await supabase.from('payment_notifications').update({ status: 'approved' }).eq('id', notif.id);
    if (notifErr) return alert(notifErr.message);

    const store = shops.find(s => s.id === notif.shop_id);
    if (store) {
      const currentEnd = store.subscription_ends_at ? new Date(store.subscription_ends_at) : new Date();
      if (currentEnd < new Date()) currentEnd.setTime(Date.now());
      currentEnd.setDate(currentEnd.getDate() + 30);

      await supabase.from('shops').update({
        subscription_ends_at: currentEnd.toISOString(),
        subscription_status: 'active'
      }).eq('id', notif.shop_id);
    }
    loadData();
  };

  const handleRejectPayment = async (id: string) => {
    await supabase.from('payment_notifications').update({ status: 'rejected' }).eq('id', id);
    loadData();
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de comprovante?")) return;
    const { error } = await supabase.from('payment_notifications').delete().eq('id', id);
    if (error) alert("Erro ao excluir: " + error.message);
    else loadData();
  };

  const handleClearAllPayments = async () => {
    if (!window.confirm("Deseja realmente LIMPAR TODO O HISTÓRICO de comprovantes de pagamento? Essa ação não pode ser desfeita e também impactará o faturamento total.")) return;
    const { error } = await supabase.from('payment_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) alert("Erro ao limpar histórico: " + error.message);
    else {
      alert("Histórico de comprovantes limpo com sucesso!");
      loadData();
    }
  };

  const handleClearApprovedRevenue = async () => {
    if (!window.confirm("Deseja realmente ZERAR O FATURAMENTO excluindo todos os pagamentos aprovados?")) return;
    const { error } = await supabase.from('payment_notifications').delete().eq('status', 'approved');
    if (error) alert("Erro ao zerar faturamento: " + error.message);
    else {
      alert("Faturamento zerado com sucesso!");
      loadData();
    }
  };

  const handleToggleSubscription = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await supabase.from('shops').update({ subscription_status: newStatus }).eq('id', id);
    loadData();
  };

  const handleExtendSubscription = async (id: string, currentEnd: string) => {
    const d = currentEnd ? new Date(currentEnd) : new Date();
    if (d.getTime() < Date.now()) d.setTime(Date.now());
    d.setDate(d.getDate() + 30);
    await supabase.from('shops').update({ subscription_ends_at: d.toISOString(), subscription_status: 'active' }).eq('id', id);
    loadData();
  };

  const handleSetSubscriptionStatus = async (id: string, status: string) => {
    await supabase.from('shops').update({ subscription_status: status }).eq('id', id);
    loadData();
  };

  const handleDeleteShop = async (shopId: string, shopName: string, loginEmail: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a loja "${shopName}"? Esta ação não pode ser desfeita.`)) return;
    
    // Delete from shops table
    const { error } = await supabase.from('shops').delete().eq('id', shopId);
    
    if (error) {
      alert('Erro ao excluir loja: ' + error.message);
      return;
    }

    // Also delete from Supabase Auth if email exists
    if (loginEmail) {
      try {
        await fetch('https://oongrdgcdxqijonjroam.supabase.co/functions/v1/create-auth-user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail })
        });
      } catch (e) {
        // Non-critical, just log
        console.warn('Could not remove auth user:', e);
      }
    }

    alert(`Loja "${shopName}" excluída com sucesso.`);
    loadData();
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.shop_id) {
      alert("Por favor, selecione uma barbearia para o cliente.");
      return;
    }

    const { error } = await supabase.from('clients').insert([{
      name: newClient.name,
      phone: newClient.phone,
      email: newClient.email.trim().toLowerCase() || null,
      password: newClient.password,
      shop_id: newClient.shop_id,
      total_spent: 0
    }]);

    if (error) {
      alert("Erro ao cadastrar cliente: " + error.message);
    } else {
      alert("Cliente cadastrado com sucesso!");
      setIsAddingClient(false);
      setNewClient({ name: '', phone: '', email: '', password: '', shop_id: '' });
      loadData();
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientId) return;

    const { error } = await supabase.from('clients').update({
      name: editClient.name,
      phone: editClient.phone,
      email: editClient.email.trim().toLowerCase() || null,
      password: editClient.password,
      shop_id: editClient.shop_id
    }).eq('id', editingClientId);

    if (error) {
      alert("Erro ao atualizar cliente: " + error.message);
    } else {
      alert("Cliente atualizado com sucesso!");
      setIsEditingClient(false);
      setEditingClientId(null);
      setEditClient({ name: '', phone: '', email: '', password: '', shop_id: '' });
      loadData();
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}" permanentemente?`)) return;

    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) {
      alert("Erro ao excluir cliente: " + error.message);
    } else {
      alert("Cliente excluído com sucesso!");
      loadData();
    }
  };

  const enterShop = (shopId: string) => {
    setAuth('owner', 'admin-support', shopId);
  };

  const getSubscriptionProgress = (end?: string) => {
    if (!end) return { percentage: 0, color: "#00ff00" };
    const e = new Date(end).getTime();
    const now = Date.now();
    if (now > e) return { percentage: 100, color: "#ff4444" };
    const remainingDays = (e - now) / (1000 * 60 * 60 * 24);
    let percentage = 100 - (remainingDays / 30) * 100;
    if (percentage < 2) percentage = 2;
    if (percentage > 100) percentage = 100;
    let color = "#00ff00";
    if (percentage >= 50 && percentage < 85) color = "#ffaa00";
    else if (percentage >= 85) color = "#ff4444";
    return { percentage, color, days: Math.ceil(remainingDays) };
  };

  const currentRevenue = payments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + Number(curr.amount || 70), 0);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            <ShieldCheck size={36} />
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>Painel Central ADM</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>Gestão global de Barbearias, Assinaturas e Clientes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === 'clientes' ? (
            <button 
              onClick={() => {
                setNewClient({ name: '', phone: '', email: '', password: '', shop_id: shops[0]?.id || '' });
                setIsAddingClient(true);
              }}
              className="gold-button" 
              style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}
            >
              <Plus size={22} /> Novo Cliente
            </button>
          ) : (
            <button 
              onClick={() => setIsAddingShop(true)}
              className="gold-button" 
              style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}
            >
              <Plus size={22} /> Novo Lojista
            </button>
          )}
          
          <button 
            onClick={logout}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'lojistas', label: `Lojistas (${shops.length})`, icon: Building2 },
          { id: 'clientes', label: `Clientes (${clients.length})`, icon: Users },
          { id: 'pagamentos', label: `Pagamentos`, icon: Banknote, badge: payments.filter(p => p.status === 'pending').length },
          { id: 'ganhos', label: `Faturamento`, icon: Landmark },
          { id: 'configuracoes', label: `Configurações`, icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            style={{
              padding: '1rem 1.5rem', background: 'transparent', border: 'none',
              color: activeTab === tab.id ? 'var(--accent-gold)' : '#888',
              borderBottom: activeTab === tab.id ? '3px solid var(--accent-gold)' : '3px solid transparent',
              fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
              whiteSpace: 'nowrap', transition: 'all 0.2s', fontSize: '1.1rem'
            }}
          >
            <tab.icon size={22} />
            {tab.label}
            {tab.badge ? <span style={{ background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Tab Content: Lojistas */}
      {activeTab === 'lojistas' && (
        <div>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
            <input 
              type="text" 
              placeholder="Buscar lojista por nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(shop => {
              const prog = getSubscriptionProgress(shop.subscription_ends_at);
              const showPass = visiblePasswords[shop.id];
              return (
                <div key={shop.id} className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    
                    {/* Left: Info */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <Building2 size={28} color="var(--accent-gold)" />
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{shop.name}</h3>
                          <span style={{ background: '#222', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>{shop.plan_type?.toUpperCase() || 'BÁSICA'}</span>
                          <span style={{ background: shop.subscription_status === 'active' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)', color: shop.subscription_status === 'active' ? '#00ff00' : '#ff4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
                            {shop.subscription_status?.toUpperCase() || 'ATIVA'}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.75rem', color: '#888', display: 'grid', gap: '4px', marginBottom: '12px' }}>
                          <span>Geral - R. Exemplo da Silva, 123</span>
                          <span>CNPJ: Não Informado</span>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '4px' }}>
                            <span>Início: <span style={{ color: '#fff' }}>{new Date(shop.created_at).toLocaleDateString()}</span></span>
                            <span>Venc.: <span style={{ color: '#fff' }}>{shop.subscription_ends_at ? new Date(shop.subscription_ends_at).toLocaleDateString() : 'N/A'}</span></span>
                            <span style={{ color: '#00ff00', fontWeight: '800' }}>R$ 0.00 <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.65rem' }}>(saldo)</span></span>
                          </div>
                        </div>

                        {/* Credentials */}
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#aaa' }}>Login: <span style={{ color: 'white', fontWeight: '500' }}>{shop.login_email || 'Não definido'}</span></span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Senha: <span style={{ color: 'white', fontWeight: '500' }}>{showPass ? (shop.login_password || 'Não definido') : '********'}</span>
                            <button onClick={() => setVisiblePasswords(prev => ({ ...prev, [shop.id]: !prev[shop.id] }))} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              {showPass ? <EyeOff size={14} /> : <Eye size={14} />} <span style={{ fontSize: '0.65rem', marginLeft: '4px' }}>Protegido</span>
                            </button>
                          </span>
                        </div>
                        
                        <div style={{ width: '100%', height: '4px', background: '#222', borderRadius: '2px', marginTop: '12px', overflow: 'hidden', maxWidth: '300px' }}>
                          <div style={{ width: `${prog.percentage}%`, height: '100%', background: prog.color, transition: 'all 0.3s' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <button onClick={() => handleSetSubscriptionStatus(shop.id, 'suspended')} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ff4444', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}>Suspender</button>
                      <button onClick={() => handleExtendSubscription(shop.id, shop.subscription_ends_at)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#00cc44', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}>Estender</button>
                      <button onClick={() => handleSetSubscriptionStatus(shop.id, 'paused')} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Power size={14} /> Pausar</button>
                      
                      <button style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#00cc44', border: '1px solid #00cc44', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Phone size={16} /></button>
                      <button style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#3399ff', border: '1px solid #3399ff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><MessageSquare size={16} /></button>
                      <button onClick={() => openEditModal(shop)} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#888', border: '1px solid #555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Settings size={16} /></button>
                      <button onClick={() => handleDeleteShop(shop.id, shop.name, shop.login_email)} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                      
                      <button onClick={() => enterShop(shop.id)} className="gold-button" style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        <LayoutDashboard size={14} /> Entrar
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content: Clientes Globais */}
      {activeTab === 'clientes' && (
        <div className="premium-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem' }}>Cliente</th>
                <th style={{ padding: '1rem' }}>Contato</th>
                <th style={{ padding: '1rem' }}>Credenciais (Login/Senha)</th>
                <th style={{ padding: '1rem' }}>Barbearia (Origem)</th>
                <th style={{ padding: '1rem' }}>Total Gasto</th>
                <th style={{ padding: '1rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const showClientPass = visibleClientPasswords[c.id];
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{c.name}</td>
                    <td style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem' }}>
                      <div style={{ display: 'grid', gap: '2px' }}>
                        <span>Tel: {c.phone || 'N/A'}</span>
                        <span>E-mail: {c.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#aaa' }}>Login: <span style={{ color: 'white', fontWeight: '500' }}>{c.email || c.phone || 'Não definido'}</span></span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Senha: <span style={{ color: 'white', fontWeight: '500' }}>{showClientPass ? (c.password || 'Sem senha') : '********'}</span>
                          <button onClick={() => setVisibleClientPasswords(prev => ({ ...prev, [c.id]: !prev[c.id] }))} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {showClientPass ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--accent-gold)' }}>{(c.shops as any)?.name || 'Desconhecida'}</td>
                    <td style={{ padding: '1rem', fontWeight: '900' }}>R$ {(c.total_spent || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          title="Editar Cliente"
                          onClick={() => {
                            setEditingClientId(c.id);
                            setEditClient({
                              name: c.name,
                              phone: c.phone || '',
                              email: c.email || '',
                              password: c.password || '',
                              shop_id: c.shop_id || ''
                            });
                            setIsEditingClient(true);
                          }}
                          style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#888', border: '1px solid #555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          title="Excluir Cliente"
                          onClick={() => handleDeleteClient(c.id, c.name)}
                          style={{ padding: '8px', borderRadius: '8px', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Pagamentos */}
      {activeTab === 'pagamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {payments.length > 0 && (
            <button 
              onClick={handleClearAllPayments}
              style={{
                alignSelf: 'flex-end',
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.2)',
                color: '#ff4444',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Trash2 size={16} /> Limpar Histórico de Pagamentos
            </button>
          )}
          
          <div className="premium-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: '0.8rem' }}>
                  <th style={{ padding: '1rem' }}>Barbearia</th>
                  <th style={{ padding: '1rem' }}>Data</th>
                  <th style={{ padding: '1rem' }}>Comprovante</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{(p.shops as any)?.name || 'Desconhecida'}</td>
                    <td style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      {p.receipt_url ? <a href={p.receipt_url} target="_blank" style={{ color: 'var(--accent-gold)', textDecoration: 'underline' }}>Ver Arquivo</a> : 'Nenhum'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', background: p.status === 'approved' ? 'rgba(0,255,0,0.1)' : p.status === 'rejected' ? 'rgba(255,0,0,0.1)' : 'rgba(255,170,0,0.1)', color: p.status === 'approved' ? '#00ff00' : p.status === 'rejected' ? '#ff0000' : '#ffaa00', fontSize: '0.7rem', fontWeight: '800' }}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {p.status === 'pending' && (
                        <>
                          <button title="Aprovar" onClick={() => handleApprovePayment(p)} style={{ background: '#00cc44', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><CheckCircle size={16} /></button>
                          <button title="Recusar" onClick={() => handleRejectPayment(p.id)} style={{ background: '#ffaa00', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><XCircle size={16} /></button>
                        </>
                      )}
                      <button title="Excluir do Histórico" onClick={() => handleDeletePayment(p.id)} style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Nenhum pagamento registrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Ganhos */}
      {activeTab === 'ganhos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="premium-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={40} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#888', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Faturamento (Pagamentos Aprovados)</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1.5rem', color: 'white' }}>R$ {currentRevenue.toFixed(2)}</p>
            {currentRevenue > 0 && (
              <button 
                onClick={handleClearApprovedRevenue}
                style={{
                  background: 'rgba(255, 68, 68, 0.1)',
                  border: '1px solid rgba(255, 68, 68, 0.2)',
                  color: '#ff4444',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Trash2 size={14} /> Limpar Faturamento
              </button>
            )}
          </div>
          <div className="premium-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={40} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#888', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Lojistas Ativos</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'white' }}>{shops.filter(s => s.subscription_status === 'active').length}</p>
          </div>
        </div>
      )}

      {/* Tab Content: Configurações */}
      {activeTab === 'configuracoes' && (
        <div className="premium-card" style={{ padding: '2rem', maxWidth: '900px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
            <Banknote size={20} /> Configurações: Assinatura Básica
          </h2>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                  <Plus size={12} /> URL DO QR CODE / COPIA E COLA
                </label>
                <input type="text" placeholder="https://..." value={systemConfig.basica?.url || ''} onChange={e => setSystemConfig({ ...systemConfig, basica: { ...systemConfig.basica, url: e.target.value } })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                  <Landmark size={12} /> NOME DO BANCO
                </label>
                <input type="text" placeholder="Ex: NUBANK" value={systemConfig.basica?.bank || ''} onChange={e => setSystemConfig({ ...systemConfig, basica: { ...systemConfig.basica, bank: e.target.value } })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                  <Users size={12} /> NOME DO RECEBEDOR
                </label>
                <input type="text" placeholder="Ex: JOÃO SILVA" value={systemConfig.basica?.receiver || ''} onChange={e => setSystemConfig({ ...systemConfig, basica: { ...systemConfig.basica, receiver: e.target.value } })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                  <CheckCircle size={12} /> CHAVE PIX
                </label>
                <input type="text" placeholder="Sua chave..." value={systemConfig.basica?.key || ''} onChange={e => setSystemConfig({ ...systemConfig, basica: { ...systemConfig.basica, key: e.target.value } })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <Banknote size={12} /> PREÇO DA ASSINATURA (R$)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: 'fit-content' }}>
                <span style={{ padding: '0.8rem 1rem', color: '#888', borderRight: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>R$</span>
                <input type="number" value={systemConfig.basica?.price || ''} onChange={e => setSystemConfig({ ...systemConfig, basica: { ...systemConfig.basica, price: Number(e.target.value) } })} style={{ width: '120px', padding: '0.8rem 1rem', background: 'transparent', border: 'none', color: 'white', fontWeight: '800' }} />
              </div>
            </div>

            <button onClick={handleSaveConfig} className="gold-button" style={{ padding: '1rem', borderRadius: '8px', fontWeight: '800', marginTop: '1rem', width: 'fit-content' }}>
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

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
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>E-MAIL DE LOGIN</label>
                <input 
                  required type="email" 
                  value={newShop.login_email} 
                  onChange={e => setNewShop({ ...newShop, login_email: e.target.value })}
                  placeholder="admin@barbearia.com"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SENHA</label>
                <input 
                  required type="text" 
                  value={newShop.login_password} 
                  onChange={e => setNewShop({ ...newShop, login_password: e.target.value })}
                  placeholder="senha123"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddingShop(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '12px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: '800' }}>Criar (30 Dias Grátis)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {isEditingShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Editar Lojista</h2>
            <form onSubmit={handleEditShop} style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>NOME DA BARBEARIA</label>
                <input 
                  required type="text" 
                  value={editShop.name} 
                  onChange={e => setEditShop({ ...editShop, name: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SLUG (URL)</label>
                <input 
                  required type="text" 
                  value={editShop.slug} 
                  onChange={e => setEditShop({ ...editShop, slug: e.target.value.toLowerCase().replace(/\\s+/g, '-') })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>E-MAIL DE LOGIN</label>
                <input 
                  required type="email" 
                  value={editShop.login_email} 
                  onChange={e => setEditShop({ ...editShop, login_email: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SENHA</label>
                <input 
                  required type="text" 
                  value={editShop.login_password} 
                  onChange={e => setEditShop({ ...editShop, login_password: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>DATA DE VENCIMENTO</label>
                <input 
                  required type="date" 
                  value={editShop.subscription_ends_at} 
                  onChange={e => setEditShop({ ...editShop, subscription_ends_at: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsEditingShop(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '12px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: '800' }}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Client Modal */}
      {isAddingClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Novo Cliente</h2>
            <form onSubmit={handleAddClient} style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>NOME DO CLIENTE</label>
                <input 
                  required type="text" 
                  value={newClient.name} 
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>TELEFONE</label>
                <input 
                  required type="text" 
                  value={newClient.phone} 
                  onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Ex: 75998736352"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>E-MAIL</label>
                <input 
                  type="email" 
                  value={newClient.email} 
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="cliente@email.com (Opcional)"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SENHA</label>
                <input 
                  required type="text" 
                  value={newClient.password} 
                  onChange={e => setNewClient({ ...newClient, password: e.target.value })}
                  placeholder="senha123"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>BARBEARIA (ORIGEM)</label>
                <select
                  required
                  value={newClient.shop_id}
                  onChange={e => setNewClient({ ...newClient, shop_id: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }}
                >
                  <option value="">Selecione uma barbearia...</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddingClient(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '12px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: '800' }}>Criar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditingClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Editar Cliente</h2>
            <form onSubmit={handleUpdateClient} style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>NOME DO CLIENTE</label>
                <input 
                  required type="text" 
                  value={editClient.name} 
                  onChange={e => setEditClient({ ...editClient, name: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>TELEFONE</label>
                <input 
                  required type="text" 
                  value={editClient.phone} 
                  onChange={e => setEditClient({ ...editClient, phone: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>E-MAIL</label>
                <input 
                  type="email" 
                  value={editClient.email} 
                  onChange={e => setEditClient({ ...editClient, email: e.target.value })}
                  placeholder="cliente@email.com (Opcional)"
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>SENHA</label>
                <input 
                  required type="text" 
                  value={editClient.password} 
                  onChange={e => setEditClient({ ...editClient, password: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '800' }}>BARBEARIA (ORIGEM)</label>
                <select
                  required
                  value={editClient.shop_id}
                  onChange={e => setEditClient({ ...editClient, shop_id: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #222', color: 'white' }}
                >
                  <option value="">Selecione uma barbearia...</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsEditingClient(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '12px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: '800' }}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};

export default AdminDashboard;
