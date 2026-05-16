import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Banknote, Upload, CheckCircle, ShieldAlert } from 'lucide-react';

const Settings: React.FC = () => {
  const { logout, shopData } = useApp();
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchGlobalConfig();
  }, []);

  const fetchGlobalConfig = async () => {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'subscription_plans').maybeSingle();
    if (data?.value) setGlobalConfig(data.value);
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

  const isSuspended = shopData?.subscription_status === 'suspended';

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Banknote color="var(--accent-gold)" /> Assinatura e Configurações
      </h1>

      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: isSuspended ? '1px solid #ff4444' : '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: isSuspended ? '#ff4444' : 'white' }}>
          {isSuspended ? '⚠️ Assinatura Suspensa' : '✅ Assinatura Ativa'}
        </h2>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
          Plano atual: <strong style={{ color: 'var(--accent-gold)' }}>{shopData?.plan_type || 'Básica'}</strong><br/>
          Vencimento: <strong style={{ color: 'white' }}>{new Date(shopData?.subscription_ends_at).toLocaleDateString()}</strong>
        </p>

        {globalConfig && globalConfig.basica && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--accent-gold)' }}>Pagar via PIX</h3>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
              Valor da mensalidade: <strong style={{ color: 'white', fontSize: '1rem' }}>R$ {globalConfig.basica.price?.toFixed(2)}</strong>
            </p>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {globalConfig.basica.url && (
                <div style={{ background: 'white', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                  <img src={globalConfig.basica.url} alt="QR Code PIX" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '800' }}>CHAVE PIX</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                  <input type="text" readOnly value={globalConfig.basica.key || ''} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#111', border: '1px solid #222', color: 'var(--accent-gold)', fontWeight: '700' }} />
                </div>

                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '800' }}>ENVIAR COMPROVANTE (Link da Imagem)</label>
                <input 
                  type="text" 
                  placeholder="https://..." 
                  value={receiptUrl}
                  onChange={e => setReceiptUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#111', border: '1px solid #222', color: 'white', marginBottom: '10px' }} 
                />
                <button 
                  onClick={handleUploadReceipt}
                  disabled={isUploading || !receiptUrl}
                  className="gold-button" 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isUploading ? 0.5 : 1 }}
                >
                  <Upload size={18} /> {isUploading ? 'Enviando...' : 'Enviar Comprovante'}
                </button>
              </div>
            </div>
          </div>
        )}
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
