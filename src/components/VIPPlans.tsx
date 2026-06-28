import React, { useState, useRef, useEffect } from 'react';
import { Plus, Crown, Trash2, Edit2, Check, Camera, X, Settings } from 'lucide-react';
import { useApp, SubscriptionPlan } from '../context/AppContext';
import { convertToWebP, uploadImage } from '../utils/imageUtils';

const VIPPlans: React.FC = () => {
  const { subscriptionPlans = [], addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, shopId, config, updateConfig } = useApp();
  const [activeTab, setActiveTab] = useState<'plans' | 'settings'>('plans');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', servicesCount: '', price: '', active: true });
  
  // Settings Form State
  const defaultVipSettings = {
    title: 'Faça Parte do Nosso Clube VIP!',
    description: 'Assine um dos nossos planos mensais e garanta seu visual sempre em dia com vantagens exclusivas. Com o plano VIP, você economiza no valor total dos serviços, tem facilidade de agendamento e atendimento preferencial.',
    benefits: [
      'Desconto exclusivo no valor unitário dos serviços',
      'Créditos (Tickets) mensais acumulados na sua conta',
      'Prioridade na marcação de horários concorridos',
      'Pagamento mensal recorrente simplificado'
    ],
    showFooter: true,
    footerTitle: 'Ficou interessado?',
    footerText: 'Para contratar ou tirar dúvidas sobre as assinaturas, por favor converse com nosso profissional no seu próximo atendimento ou entre em contato diretamente conosco. Ativamos na hora para você!'
  };
  const [settingsForm, setSettingsForm] = useState(config?.layoutConfig?.vipSettings || defaultVipSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (config?.layoutConfig?.vipSettings) {
      setSettingsForm(config.layoutConfig.vipSettings);
    }
  }, [config?.layoutConfig?.vipSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const newLayoutConfig = {
        ...config?.layoutConfig,
        vipSettings: settingsForm
      } as any;
      await updateConfig({ layoutConfig: newLayoutConfig });
      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar configurações: ' + (err.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddBenefit = () => {
    setSettingsForm(prev => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const handleRemoveBenefit = (index: number) => {
    setSettingsForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleBenefitChange = (index: number, value: string) => {
    setSettingsForm(prev => {
      const newBenefits = [...prev.benefits];
      newBenefits[index] = value;
      return { ...prev, benefits: newBenefits };
    });
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let imageUrl = imagePreview;

      if (selectedFile) {
        const webpBlob = await convertToWebP(selectedFile);
        imageUrl = await uploadImage('subscriptions', webpBlob, shopId || 'common', 'plan');
      }

      const data = { 
        name: formData.name, 
        servicesCount: Number(formData.servicesCount) || 1, 
        price: Number(formData.price) || 0,
        active: formData.active,
        image: imageUrl || undefined
      };

      if (editingId) {
        await updateSubscriptionPlan(editingId, data);
      } else {
        await addSubscriptionPlan(data);
      }

      handleCancel();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar plano VIP: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      servicesCount: plan.servicesCount.toString(),
      price: plan.price.toString(),
      active: plan.active
    });
    setImagePreview(plan.image || '');
    setSelectedFile(null);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', servicesCount: '', price: '', active: true });
    setImagePreview('');
    setSelectedFile(null);
    setEditingId(null);
    setIsAdding(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.85rem', borderRadius: '10px',
    background: '#1a1a1a', border: '1px solid var(--glass-border)', color: 'white', width: '100%'
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Planos VIP</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>Gerencie pacotes de assinatura para seus clientes</p>
        </div>
        {activeTab === 'plans' && (
          <button className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { handleCancel(); setIsAdding(true); }}>
            <Plus size={18} /> Novo Plano
          </button>
        )}
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('plans')}
          style={{
            background: 'transparent', border: 'none', padding: '0.75rem 1rem', fontSize: '0.95rem', fontWeight: '700',
            color: activeTab === 'plans' ? 'var(--accent-gold)' : '#888',
            borderBottom: activeTab === 'plans' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Crown size={16} /> Planos
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'transparent', border: 'none', padding: '0.75rem 1rem', fontSize: '0.95rem', fontWeight: '700',
            color: activeTab === 'settings' ? 'var(--accent-gold)' : '#888',
            borderBottom: activeTab === 'settings' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Settings size={16} /> Configurações da Aba
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="premium-card" style={{ padding: '2rem', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Textos da Aba Cliente</h3>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Título Principal</label>
              <input required type="text" style={inputStyle} value={settingsForm.title} onChange={e => setSettingsForm({ ...settingsForm, title: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descrição Completa</label>
              <textarea required style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={settingsForm.description} onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tópicos de Benefícios (Visíveis para o cliente)</label>
                <button type="button" onClick={handleAddBenefit} style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={12} /> Adicionar Tópico
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {settingsForm.benefits.map((benefit, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input required type="text" style={{ ...inputStyle, flex: 1 }} placeholder="Descreva um benefício..." value={benefit} onChange={e => handleBenefitChange(index, e.target.value)} />
                    <button type="button" onClick={() => handleRemoveBenefit(index)} style={{ background: 'transparent', border: 'none', color: '#ff1744', cursor: 'pointer', padding: '8px' }} title="Remover benefício">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {settingsForm.benefits.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>Nenhum tópico adicionado.</p>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', color: 'white', marginBottom: '1rem' }}>Rodapé (Chamada para Ação)</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="showFooter" 
                  checked={settingsForm.showFooter ?? true} 
                  onChange={e => setSettingsForm({ ...settingsForm, showFooter: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }} 
                />
                <label htmlFor="showFooter" style={{ fontSize: '0.9rem', color: 'white' }}>Mostrar rodapé "Ficou interessado?"</label>
              </div>

              {(settingsForm.showFooter ?? true) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Título do Rodapé</label>
                    <input type="text" style={inputStyle} value={settingsForm.footerTitle || 'Ficou interessado?'} onChange={e => setSettingsForm({ ...settingsForm, footerTitle: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Texto do Rodapé</label>
                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={settingsForm.footerText || ''} onChange={e => setSettingsForm({ ...settingsForm, footerText: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              <button type="submit" disabled={isSavingSettings} className="gold-button" style={{ width: 'auto', minWidth: '200px' }}>
                {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {isAdding && (
        <div className="premium-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-gold)', animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {editingId ? 'Editar Plano VIP' : 'Adicionar Plano VIP'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            
            {/* Upload de Foto do Plano VIP */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Plan Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Crown size={30} style={{ color: 'var(--accent-gold)', opacity: 0.3 }} />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: '4px', right: '4px', background: 'var(--accent-gold)',
                    border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
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
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>Foto do Plano VIP</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Anexe uma foto para exibir na vitrine. Convertida automaticamente para WebP.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nome do Plano</label>
              <input required type="text" placeholder="Ex: VIP 4 Cortes" style={inputStyle}
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Quantidade de Serviços/Mês</label>
              <input required type="number" placeholder="Ex: 4" style={inputStyle}
                value={formData.servicesCount} onChange={e => setFormData({ ...formData, servicesCount: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Preço Mensal (R$)</label>
              <input required type="number" step="0.01" style={inputStyle}
                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: '1 / -1' }}>
              <input type="checkbox" id="activePlan" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }} />
              <label htmlFor="activePlan" style={{ fontSize: '0.9rem', color: 'white' }}>Plano Ativo (Disponível para clientes)</label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="gold-button" style={{ flex: 1 }} disabled={isSaving}>
                {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Plano')}
              </button>
              <button type="button" onClick={handleCancel} disabled={isSaving} style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {subscriptionPlans.map(plan => (
          <div key={plan.id} className="premium-card" style={{ padding: '1.5rem', position: 'relative', border: plan.active ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
            {!plan.active && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>INATIVO</div>
            )}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
                overflow: 'hidden',
                flexShrink: 0,
                background: plan.active ? 'var(--accent-gold-soft)' : 'rgba(255,255,255,0.05)', 
                color: plan.active ? 'var(--accent-gold)' : '#888',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: plan.active ? '1px solid rgba(212,175,55,0.15)' : 'none'
              }}>
                {plan.image ? (
                  <img
                    src={plan.image}
                    alt={plan.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Crown size={28} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontWeight: '800', fontSize: '1.1rem', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: plan.active ? 'white' : '#888' }}>{plan.name}</h4>
                <p style={{ fontSize: '1.2rem', fontWeight: '900', color: plan.active ? 'var(--accent-gold)' : '#888', margin: 0 }}>
                  R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/mês</span>
                </p>
              </div>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '0.9rem' }}>
                <Check size={16} color="var(--accent-gold)" />
                <strong>{plan.servicesCount}</strong> serviços mensais
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => handleEditClick(plan)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }} title="Editar">
                <Edit2 size={14} /> Editar
              </button>
              <button onClick={() => deleteSubscriptionPlan(plan.id)} style={{ background: 'rgba(255,23,68,0.1)', border: 'none', color: '#ff1744', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }} title="Remover">
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        ))}

        {subscriptionPlans.length === 0 && (
          <div className="premium-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <Crown size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum plano VIP cadastrado.</p>
            <button className="gold-button" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
              <Plus size={18} /> Criar primeiro plano
            </button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default VIPPlans;
