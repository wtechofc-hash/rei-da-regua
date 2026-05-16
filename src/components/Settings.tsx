import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Banknote, Upload, CheckCircle, ShieldAlert, Power, Clock, Copy, Plus } from 'lucide-react';

const Settings: React.FC = () => {
  const { logout, shopData: contextShopData } = useApp();
  const [shopData, setShopData] = useState<any>(contextShopData);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchGlobalConfig();
    if (contextShopData?.id) {
      fetchShopData();
    }
  }, [contextShopData?.id]);

  const fetchGlobalConfig = async () => {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'subscription_plans').maybeSingle();
    if (data?.value) setGlobalConfig(data.value);
  };

  const fetchShopData = async () => {
    setIsSyncing(true);
    const { data } = await supabase.from('shops').select('*').eq('id', contextShopData.id).single();
    if (data) setShopData(data);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleUploadReceipt = async () => {
    if (!receiptUrl) return alert("Cole o link da imagem do comprovante primeiro.");
    setIsUploading(true);
    
    // Create payment notification
    const { error } = await supabase.from('payment_notifications').insert([{
      shop_id: shopData?.id,
      amount: globalConfig?.basica?.price || 70,
      receipt_url: receiptUrl,
      status: 'pending'
    }]);

    setIsUploading(false);
    
    if (error) {
      alert("Erro ao enviar comprovante: " + error.message);
    } else {
      alert("Comprovante enviado com sucesso! Aguarde a aprovação do administrador.");
      setReceiptUrl('');
    }
  };

  const copyPix = () => {
    if (globalConfig?.basica?.key) {
      navigator.clipboard.writeText(globalConfig.basica.key);
      alert('Chave PIX copiada!');
    }
  };

  const isSuspended = shopData?.subscription_status === 'suspended';

  const getDaysRemaining = () => {
    if (!shopData?.subscription_ends_at) return 0;
    const end = new Date(shopData.subscription_ends_at).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Banknote color="var(--accent-gold)" /> Assinatura e Configurações
      </h1>

      {/* Card 1: Status da Assinatura */}
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
          
          {/* Left Info */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.2rem', color: 'white' }}>Status da Assinatura</h2>
            <button 
              onClick={fetchShopData}
              style={{ background: 'transparent', border: 'none', padding: 0, color: '#888', fontSize: '0.85rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              Dados sincronizados em tempo real <Power size={12} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isSuspended ? 'rgba(255,68,68,0.1)' : 'rgba(0,204,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle color={isSuspended ? '#ff4444' : '#00cc44'} size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Situação Atual</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: isSuspended ? '#ff4444' : '#00cc44' }}>{isSuspended ? 'Suspensa' : 'Ativa'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock color="#aaa" size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Vencimento</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white' }}>
                  {shopData?.subscription_ends_at ? new Date(shopData.subscription_ends_at).toLocaleDateString('pt-BR') : 'Indefinido'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>{getDaysRemaining()} dia(s) restante(s)</div>
              </div>
            </div>
          </div>

          {/* Right Info: QR Code Box */}
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
              PLANO {shopData?.plan_type || 'BÁSICA'}
            </span>
            
            <div style={{ background: 'white', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '180px', height: '180px', overflow: 'hidden', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {globalConfig?.basica?.url ? (
                <img 
                  src={globalConfig.basica.url} 
                  alt="QR Code" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg'; }}
                />
              ) : (
                <div style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center' }}>Sem QR Code</div>
              )}
            </div>

            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Valor da Mensalidade</span>
            <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#00cc44', marginBottom: '1.5rem' }}>
              R$ {globalConfig?.basica?.price?.toFixed(2) || '0.00'}
            </span>

            <button onClick={copyPix} style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Copy size={16} /> Copiar Código
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Informar Pagamento */}
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.4rem', color: 'white' }}>Informar Pagamento</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Faça o pagamento via PIX acima, anexe o comprovante e clique em <strong style={{ color: '#aaa' }}>Confirmar Envio</strong>.
        </p>
        
        <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
          <Plus color="var(--accent-gold)" size={32} style={{ marginBottom: '8px' }} />
          <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: 'white', display: 'block', marginBottom: '8px' }}>Selecionar Comprovante</span>
            <input 
              type="text" 
              placeholder="Cole a URL da imagem do comprovante aqui..." 
              value={receiptUrl} 
              onChange={e => setReceiptUrl(e.target.value)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '8px', color: 'white', textAlign: 'center', fontSize: '0.85rem', width: '100%', outline: 'none' }} 
            />
            <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginTop: '12px' }}>Apenas Link de Imagem (por enquanto)</span>
          </div>
        </div>

        <button 
          onClick={handleUploadReceipt} 
          disabled={isUploading || !receiptUrl} 
          style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: receiptUrl ? '#00cc44' : 'rgba(0,204,68,0.2)', color: receiptUrl ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', fontWeight: '800', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: receiptUrl ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}
        >
          <CheckCircle size={20} /> Confirmar Envio da Solicitação
        </button>
      </div>

      <div className="premium-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Perfil</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Ajustes de conta e saída do sistema.</p>
        <button onClick={logout} style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
          Sair da Conta
        </button>
      </div>
    </div>
  );
};

export default Settings;
