import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Banknote, Upload, CheckCircle, ShieldAlert, Power, Clock, Copy, Plus, FileText, X, CreditCard, ArrowUp, ArrowDown, LayoutTemplate, Settings as SettingsIcon, Scissors, Crown, Package, Sparkles, ShoppingBag, Star, Calendar, Heart, Flame, Edit2, Trash2, PlusCircle, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { convertToWebP, uploadImage } from '../utils/imageUtils';

const Settings: React.FC = () => {
  const { logout, shopData: contextShopData, services, products, config, updateConfig, userId, profiles, updateProfile } = useApp();
  const [shopData, setShopData] = useState<any>(contextShopData);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Owner profile states
  const currentProfile = profiles.find(p => p.id === userId) || profiles.find(p => p.role === 'owner');
  const [profileName, setProfileName] = useState(currentProfile?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentProfile?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(currentProfile?.avatar || '');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProfile) {
      setProfileName(currentProfile.name || '');
      setProfileEmail(currentProfile.email || '');
      setAvatarPreview(currentProfile.avatar || '');
    }
  }, [currentProfile]);

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
        const webpBlob = await convertToWebP(profileFile);
        avatarUrl = await uploadImage('avatars', webpBlob, shopData?.id || 'common', `profile-${userId}`);
      }
      
      await updateProfile(userId, {
        name: profileName,
        email: profileEmail,
        avatar: avatarUrl
      });
      
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao atualizar perfil: ' + (err.message || err));
    } finally {
      setIsSavingProfile(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'assinatura' | 'layout'>('assinatura');

  // Mercado Pago Integration States
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [isSavingMp, setIsSavingMp] = useState(false);

  useEffect(() => {
    fetchGlobalConfig();
    if (contextShopData?.id) {
      fetchShopData();
    }
  }, [contextShopData?.id]);

  useEffect(() => {
    if (shopData) {
      setMpPublicKey(shopData.mp_public_key || '');
      setMpAccessToken(shopData.mp_access_token || '');
      setMpEnabled(shopData.mp_enabled || false);
    }
  }, [shopData]);

  const fetchGlobalConfig = async () => {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'subscription_plans').maybeSingle();
    if (data?.value) setGlobalConfig(data.value);
  };

  const isMountedRef = React.useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  const fetchShopData = async () => {
    setIsSyncing(true);
    const { data } = await supabase.from('shops').select('*').eq('id', contextShopData.id).single();
    if (data && isMountedRef.current) setShopData(data);
    setTimeout(() => { if (isMountedRef.current) setIsSyncing(false); }, 1000);
  };

  const handleSaveMercadoPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMp(true);

    try {
      const { error } = await supabase.from('shops').update({
        mp_public_key: mpPublicKey,
        mp_access_token: mpAccessToken,
        mp_enabled: mpEnabled
      }).eq('id', shopData.id);

      if (error) throw error;
      alert("Integração do Mercado Pago atualizada com sucesso!");
      fetchShopData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar integração: " + (err.message || err));
    } finally {
      setIsSavingMp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // If it's an image, create a preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      // PDF or other supported type
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadReceipt = async () => {
    if (!selectedFile) return alert("Selecione o comprovante primeiro.");
    setIsUploading(true);
    
    try {
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_comprovante.${fileExt}`;
      const filePath = `${shopData?.id || 'unknown'}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 3. Create payment notification in DB
      const { error: dbError } = await supabase.from('payment_notifications').insert([{
        shop_id: shopData?.id,
        amount: globalConfig?.basica?.price || 185,
        receipt_url: publicUrl,
        status: 'pending'
      }]);

      if (dbError) throw dbError;

      alert("Comprovante enviado com sucesso! Aguarde a aprovação do administrador.");
      handleRemoveFile();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao enviar comprovante: " + (err.message || err));
    } finally {
      setIsUploading(false);
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
    return diff;
  };

  const daysRemaining = getDaysRemaining();
  const showWarning = shopData?.subscription_ends_at && daysRemaining <= 5;

  const formatSafeDate = (dateStr: string) => {
    if (!dateStr) return 'Indefinido';
    try {
      // Split to avoid timezone offset issues pushing the date back 1 day
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsIcon color="var(--accent-gold)" /> Configurações
      </h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('assinatura')}
          style={{ flex: 1, padding: '1rem', background: activeTab === 'assinatura' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', color: activeTab === 'assinatura' ? '#000' : 'white', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Banknote size={20} /> Assinatura
        </button>
        <button 
          onClick={() => setActiveTab('layout')}
          style={{ flex: 1, padding: '1rem', background: activeTab === 'layout' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', color: activeTab === 'layout' ? '#000' : 'white', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LayoutTemplate size={20} /> Layout da Vitrine
        </button>
      </div>

      {activeTab === 'assinatura' ? (
        <>

      {/* Warning Banner */}
      {showWarning && (
        <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', borderRadius: '12px', padding: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <ShieldAlert color="#ff4444" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Atenção: Assinatura {daysRemaining <= 0 ? 'Expirada' : 'Vencendo em breve'}
            </h3>
            <p style={{ color: '#ffcccc', margin: 0, fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.4' }}>
              {daysRemaining <= 0 
                ? 'Sua assinatura expirou. Por favor, regularize seu pagamento para continuar utilizando a plataforma sem interrupções.'
                : `Sua assinatura vencerá em ${daysRemaining} dia(s). Antecipe seu pagamento para evitar a suspensão da sua loja.`}
            </p>
          </div>
        </div>
      )}

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
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: daysRemaining <= 5 && shopData?.subscription_ends_at ? '#ff4444' : 'white' }}>
                  {formatSafeDate(shopData?.subscription_ends_at)}
                </div>
                <div style={{ fontSize: '0.8rem', color: daysRemaining <= 5 && shopData?.subscription_ends_at ? '#ff4444' : '#666', marginTop: '2px', fontWeight: daysRemaining <= 5 ? '700' : 'normal' }}>
                  {shopData?.subscription_ends_at ? `${Math.max(0, daysRemaining)} dia(s) restante(s)` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Right Info: QR Code Box */}
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
              PLANO {shopData?.plan_type || 'BÁSICA'}
            </span>
            
            <div style={{ background: 'white', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '180px', height: '180px', overflow: 'hidden', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '12px' }}>
              {globalConfig?.basica?.url && !qrError ? (
                <img 
                  key={globalConfig.basica.url}
                  src={globalConfig.basica.url} 
                  alt="QR Code de Pagamento" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={() => setQrError(true)}
                />
              ) : globalConfig?.basica?.key ? (
                <QRCodeSVG 
                  value={globalConfig.basica.key} 
                  size={156}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div style={{ color: '#888', fontSize: '0.7rem', textAlign: 'center' }}>Sem QR Code ou Chave PIX</div>
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
          Faça o pagamento via PIX acima, anexe o comprovante (imagem ou PDF) e clique em <strong style={{ color: '#aaa' }}>Confirmar Envio</strong>.
        </p>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*,application/pdf" 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            border: '2px dashed rgba(255, 255, 255, 0.1)', 
            borderRadius: '16px', 
            padding: '2.5rem 1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px', 
            marginBottom: '2rem', 
            background: 'rgba(0,0,0,0.2)', 
            cursor: 'pointer',
            transition: 'all 0.3s',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        >
          {selectedFile ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }} onClick={e => e.stopPropagation()}>
              
              <button 
                onClick={handleRemoveFile}
                style={{ 
                  position: 'absolute', right: '10px', top: '-10px', 
                  background: 'rgba(255,68,68,0.2)', border: 'none', 
                  borderRadius: '50%', padding: '6px', cursor: 'pointer',
                  color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
              >
                <X size={16} />
              </button>

              {filePreview ? (
                <img 
                  src={filePreview} 
                  alt="Pré-visualização" 
                  style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '12px', objectFit: 'contain', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} 
                />
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <FileText color="var(--accent-gold)" size={48} />
                </div>
              )}

              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', wordBreak: 'break-all', textAlign: 'center' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          ) : (
            <>
              <Plus color="var(--accent-gold)" size={32} style={{ marginBottom: '8px' }} />
              <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'white', display: 'block', marginBottom: '6px' }}>
                  Selecionar Comprovante
                </span>
                <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>
                  Toque para tirar foto ou selecionar PDF/Imagem
                </span>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={handleUploadReceipt} 
          disabled={isUploading || !selectedFile} 
          style={{ 
            width: '100%', padding: '1rem', borderRadius: '12px', 
            background: selectedFile ? '#00cc44' : 'rgba(0,204,68,0.2)', 
            color: selectedFile ? 'white' : 'rgba(255,255,255,0.5)', 
            border: 'none', fontWeight: '800', fontSize: '1.05rem', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
            cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed', 
            transition: 'all 0.3s' 
          }}
        >
          {isUploading ? (
            <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear' }} />
          ) : (
            <><CheckCircle size={20} /> Confirmar Envio da Solicitação</>
          )}
        </button>
      </div>

      {/* Card 3: Integração Mercado Pago */}
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
          <CreditCard color="var(--accent-gold)" size={24} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'white' }}>Integração Mercado Pago</h2>
        </div>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Configure suas credenciais do Mercado Pago para receber pagamentos online de seus clientes via Cartão de Crédito/Débito ou PIX.
        </p>

        <form onSubmit={handleSaveMercadoPago} style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', display: 'block' }}>Ativar Pagamentos Online</span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>Habilitar Pix e Cartão na Vitrine da Barbearia</span>
            </div>
            <button 
              type="button"
              onClick={() => setMpEnabled(!mpEnabled)}
              style={{
                width: '50px', height: '26px', borderRadius: '13px',
                background: mpEnabled ? '#00cc44' : 'rgba(255,255,255,0.1)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'white', position: 'absolute', top: '3px',
                left: mpEnabled ? '27px' : '3px', transition: 'all 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
              Public Key (Chave Pública)
            </label>
            <input 
              type="text" 
              placeholder="Ex: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
              value={mpPublicKey} 
              onChange={e => setMpPublicKey(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px', color: 'white', fontSize: '0.9rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
              Access Token (Token de Acesso)
            </label>
            <input 
              type="password" 
              placeholder="Ex: APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxx" 
              value={mpAccessToken} 
              onChange={e => setMpAccessToken(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px', color: 'white', fontSize: '0.9rem', outline: 'none' }} 
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#888', background: 'rgba(212,175,55,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.1)', lineHeight: '1.5' }}>
            💡 Você pode encontrar suas credenciais de produção no painel do <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: '700', textDecoration: 'underline' }}>Mercado Pago Developers</a> em "Suas Aplicações".
          </div>

          <button 
            type="submit" 
            disabled={isSavingMp} 
            className="gold-button"
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '12px', 
              fontWeight: '800', fontSize: '1.05rem', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}
          >
            {isSavingMp ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              'Salvar Integração'
            )}
          </button>
        </form>
      </div>

      <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'white' }}>Perfil do Lojista</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Gerencie seus dados e foto de exibição.</p>
        
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Profile photo section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '70px', height: '70px' }}>
              <img
                src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileName || 'owner'}`}
                alt="Avatar"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
              />
              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
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
                ref={profileFileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleProfilePhotoChange}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>Foto de Perfil</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Formatos aceitos: JPG, PNG. Convertido automaticamente para WebP.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: '600' }}>Nome</label>
              <input
                required
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '12px', color: 'white', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: '600' }}>E-mail</label>
              <input
                required
                type="email"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '12px', color: 'white', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="gold-button"
            style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontWeight: '800' }}
          >
            {isSavingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <button onClick={logout} style={{ width: '100%', padding: '1rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
            Sair da Conta
          </button>
        </div>
      </div>
      </>
      ) : (
        <LayoutTab services={services} products={products} config={config} updateConfig={updateConfig} />
      )}
    </div>
  );
};

const IconMap: { [key: string]: any } = {
  Scissors,
  Crown,
  Package,
  Sparkles,
  ShoppingBag,
  Star,
  Calendar,
  Heart,
  Flame
};

const RenderSectionIcon = ({ name, color = 'var(--accent-gold)', size = 20 }: { name: string; color?: string; size?: number }) => {
  const IconComp = IconMap[name];
  if (!IconComp) return null;
  return <IconComp size={size} color={color} />;
};

const LayoutTab = ({ services, products, config, updateConfig }: any) => {
  const [sections, setSections] = useState<string[]>(config.layoutConfig?.sections || ['services', 'vipplans', 'products']);
  const [servicesOrder, setServicesOrder] = useState<string[]>(config.layoutConfig?.servicesOrder || []);
  const [productsOrder, setProductsOrder] = useState<string[]>(config.layoutConfig?.productsOrder || []);
  const [sectionsMetadata, setSectionsMetadata] = useState<{
    [key: string]: { name: string; icon: string };
  }>(config.layoutConfig?.sectionsMetadata || {
    services: { name: 'Serviços', icon: 'Scissors' },
    vipplans: { name: 'Planos VIP', icon: 'Crown' },
    products: { name: 'Produtos', icon: 'Package' }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [editingSecKey, setEditingSecKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  useEffect(() => {
    if (servicesOrder.length === 0 && services.length > 0) {
      setServicesOrder(services.map((s: any) => s.id));
    }
    if (services.length > 0 && servicesOrder.length > 0) {
      const missing = services.filter((s:any) => !servicesOrder.includes(s.id)).map((s:any) => s.id);
      if (missing.length > 0) setServicesOrder([...servicesOrder, ...missing]);
    }
  }, [services, servicesOrder]);

  useEffect(() => {
    if (productsOrder.length === 0 && products.length > 0) {
      setProductsOrder(products.map((p: any) => p.id));
    }
    if (products.length > 0 && productsOrder.length > 0) {
      const missing = products.filter((p:any) => !productsOrder.includes(p.id)).map((p:any) => p.id);
      if (missing.length > 0) setProductsOrder([...productsOrder, ...missing]);
    }
  }, [products, productsOrder]);

  const moveItem = (array: any[], index: number, direction: 'up' | 'down', setter: any) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === array.length - 1) return;
    const newArray = [...array];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newArray[index], newArray[swapIndex]] = [newArray[swapIndex], newArray[index]];
    setter(newArray);
  };

  const getSectionDefaultName = (key: string) => {
    if (key === 'services') return 'Serviços';
    if (key === 'vipplans') return 'Planos VIP';
    if (key === 'products') return 'Produtos';
    return key;
  };

  const getSectionDefaultIcon = (key: string) => {
    if (key === 'services') return 'Scissors';
    if (key === 'vipplans') return 'Crown';
    if (key === 'products') return 'Package';
    return 'Star';
  };

  const startEditing = (key: string) => {
    setEditingSecKey(key);
    setEditName(sectionsMetadata[key]?.name || getSectionDefaultName(key));
    setEditIcon(sectionsMetadata[key]?.icon || getSectionDefaultIcon(key));
  };

  const cancelEditing = () => {
    setEditingSecKey(null);
  };

  const saveSectionChanges = (key: string) => {
    if (!editName.trim()) return alert('O nome da categoria não pode estar vazio.');
    setSectionsMetadata(prev => ({
      ...prev,
      [key]: { name: editName.trim(), icon: editIcon }
    }));
    setEditingSecKey(null);
  };

  const removeSection = (key: string) => {
    if (confirm(`Tem certeza que deseja ocultar a categoria "${sectionsMetadata[key]?.name || getSectionDefaultName(key)}" na vitrine?`)) {
      setSections(prev => prev.filter(s => s !== key));
      if (editingSecKey === key) setEditingSecKey(null);
    }
  };

  const addSection = (key: string) => {
    setSections(prev => [...prev, key]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateConfig({ 
      layoutConfig: { 
        sections, 
        servicesOrder, 
        productsOrder, 
        sectionsMetadata 
      } 
    });
    setIsSaving(false);
    alert('Layout salvo com sucesso!');
  };

  const availableToAdd = ['services', 'vipplans', 'products'].filter(s => !sections.includes(s));
  const availableIcons = ['Scissors', 'Crown', 'Package', 'Sparkles', 'ShoppingBag', 'Star', 'Calendar', 'Heart', 'Flame'];

  return (
    <div className="animate-fade-in">
      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'white' }}>Ordem das Seções da Vitrine</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Altere a ordem, o nome e o ícone das categorias principais na vitrine do seu cliente. Oculte-as caso não as utilize.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map((sec: string, index: number) => {
            const currentMeta = sectionsMetadata[sec] || {
              name: getSectionDefaultName(sec),
              icon: getSectionDefaultIcon(sec)
            };
            const isEditing = editingSecKey === sec;

            return (
              <div key={sec} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(212,175,55,0.1)', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <RenderSectionIcon name={currentMeta.icon} size={18} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'white' }}>{currentMeta.name}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => moveItem(sections, index, 'up', setSections)} disabled={index === 0} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ArrowUp size={16} color="white" /></button>
                    <button onClick={() => moveItem(sections, index, 'down', setSections)} disabled={index === sections.length - 1} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer', opacity: index === sections.length - 1 ? 0.3 : 1 }}><ArrowDown size={16} color="white" /></button>
                    <button onClick={() => isEditing ? cancelEditing() : startEditing(sec)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)', border: 'none', cursor: 'pointer' }} title="Editar nome e ícone"><Edit2 size={16} color="var(--accent-gold)" /></button>
                    <button onClick={() => removeSection(sec)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,68,68,0.1)', border: 'none', cursor: 'pointer' }} title="Ocultar categoria"><Trash2 size={16} color="#ff4444" /></button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome Personalizado</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        style={{ width: '100%', padding: '0.8rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                        placeholder="Ex: Nossos Cortes"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ícone da Categoria</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px' }}>
                        {availableIcons.map(ic => {
                          const isSelected = editIcon === ic;
                          return (
                            <button
                              key={ic}
                              type="button"
                              onClick={() => setEditIcon(ic)}
                              style={{
                                aspectRatio: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                                border: isSelected ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                padding: 0
                              }}
                            >
                              <RenderSectionIcon name={ic} size={20} color={isSelected ? 'var(--accent-gold)' : '#666'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button onClick={() => saveSectionChanges(sec)} style={{ flex: 2, padding: '0.75rem', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}>Confirmar Alterações</button>
                      <button onClick={cancelEditing} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {availableToAdd.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categorias Disponíveis para Adicionar</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {availableToAdd.map(sec => {
                const defaultName = getSectionDefaultName(sec);
                const defaultIcon = getSectionDefaultIcon(sec);
                const currentMeta = sectionsMetadata[sec] || { name: defaultName, icon: defaultIcon };
                return (
                  <button 
                    key={sec}
                    onClick={() => addSection(sec)}
                    style={{
                      padding: '0.6rem 1rem',
                      background: 'rgba(212,175,55,0.02)',
                      border: '1px dashed rgba(212,175,55,0.15)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'}
                  >
                    <PlusCircle size={16} color="var(--accent-gold)" />
                    Adicionar {currentMeta.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {services.length > 0 && (
        <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Ordem dos Serviços</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {servicesOrder.map((id: string, index: number) => {
              const service = services.find((s: any) => s.id === id);
              if (!service) return null;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{service.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => moveItem(servicesOrder, index, 'up', setServicesOrder)} disabled={index === 0} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ArrowUp size={16} color="white" /></button>
                    <button onClick={() => moveItem(servicesOrder, index, 'down', setServicesOrder)} disabled={index === servicesOrder.length - 1} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: index === servicesOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: index === servicesOrder.length - 1 ? 0.3 : 1 }}><ArrowDown size={16} color="white" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Ordem dos Produtos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {productsOrder.map((id: string, index: number) => {
              const product = products.find((p: any) => p.id === id);
              if (!product) return null;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{product.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => moveItem(productsOrder, index, 'up', setProductsOrder)} disabled={index === 0} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ArrowUp size={16} color="white" /></button>
                    <button onClick={() => moveItem(productsOrder, index, 'down', setProductsOrder)} disabled={index === productsOrder.length - 1} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: index === productsOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: index === productsOrder.length - 1 ? 0.3 : 1 }}><ArrowDown size={16} color="white" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={isSaving} className="gold-button" style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '2rem', border: 'none', cursor: 'pointer' }}>
        {isSaving ? 'Salvando...' : 'Salvar Alterações de Layout'}
      </button>
    </div>
  );
};

export default Settings;
