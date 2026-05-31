import React from 'react';
import { Crown, Calendar, Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CustomerSubscription: React.FC = () => {
  const { userId, subscriptions = [], subscriptionPlans = [] } = useApp();

  // Find active subscription for current customer
  const activeSub = subscriptions.find(
    s => s.clientId === userId && s.status === 'active'
  );

  const plan = activeSub
    ? subscriptionPlans.find(p => p.id === activeSub.planId)
    : null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Indefinido';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    }
  };

  const activePlans = subscriptionPlans.filter(p => p.active);

  const used = activeSub?.servicesUsed ?? 0;
  const total = activeSub?.servicesTotal ?? 0;
  const remaining = Math.max(0, total - used);
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crown color="var(--accent-gold)" /> Minha Assinatura
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
          Consulte o status do seu plano VIP e seus créditos disponíveis
        </p>
      </header>

      {activeSub ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Subscription Details Card */}
          <div className="premium-card" style={{ padding: '2rem', border: '1px solid rgba(212,175,55,0.25)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Plano Ativo</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '4px 0', color: 'white' }}>
                  {plan?.name || 'Plano VIP'}
                </h2>
              </div>
              <span style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                background: 'rgba(0, 204, 68, 0.1)', color: '#00cc44', border: '1px solid rgba(0, 204, 68, 0.2)',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                Ativa
              </span>
            </div>

            {/* Date Details */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="#888" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: '700' }}>Início</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#ccc' }}>{formatDate(activeSub.startDate)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="var(--accent-gold)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: '700' }}>Próximo Vencimento</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{formatDate(activeSub.endDate)}</p>
                </div>
              </div>
            </div>

            {/* Tickets Indicator */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={20} color="var(--accent-gold)" />
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Créditos Utilizados</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>{used}</strong> de <strong>{total}</strong>
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                <div style={{
                  width: `${percentage}%`, height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-gold), #8e6d2d)',
                  borderRadius: '5px', transition: 'width 0.4s ease-out'
                }} />
              </div>

              {/* Big Remaining Tickets block */}
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(212,175,55,0.04)', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: '16px' }}>
                <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-gold)', display: 'block', lineHeight: 1 }}>
                  {remaining}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px', display: 'block' }}>
                  {remaining === 1 ? 'Ticket Restante' : 'Tickets Restantes'}
                </span>
              </div>
            </div>
          </div>

          {/* Usage Tip */}
          <div style={{
            display: 'flex', gap: '12px', padding: '1.2rem',
            background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px', alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa', lineHeight: '1.5' }}>
              💡 <strong>Dica de Uso:</strong> Seus tickets dão direito aos serviços inclusos no seu plano VIP sem pagar nada a mais. Ao realizar um agendamento e finalizar o atendimento na barbearia, informe ao profissional para abater o crédito diretamente do seu plano.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Benefit Explanation Banner */}
          <div className="premium-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', background: 'radial-gradient(circle at top right, rgba(212,175,55,0.08) 0%, transparent 60%)' }}>
            <Crown size={36} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'white' }}>
              Faça Parte do Nosso Clube VIP!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Assine um dos nossos planos mensais e garanta seu visual sempre em dia com vantagens exclusivas. Com o plano VIP, você economiza no valor total dos serviços, tem facilidade de agendamento e atendimento preferencial.
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                'Desconto exclusivo no valor unitário dos serviços',
                'Créditos (Tickets) mensais acumulados na sua conta',
                'Prioridade na marcação de horários concorridos',
                'Pagamento mensal recorrente simplificado'
              ].map(benefit => (
                <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                  <CheckCircle2 size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Plans list */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#aaa' }}>
              Planos Disponíveis
            </h3>

            {activePlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                <AlertCircle size={24} color="#555" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>Nenhum plano VIP ativo no momento. Fale com a equipe da barbearia.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {activePlans.map(p => (
                  <div key={p.id} className="premium-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px', borderRadius: '12px', color: 'var(--accent-gold)' }}>
                        <Crown size={22} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: 'white' }}>{p.name}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Inclui <strong>{p.servicesCount}</strong> serviços/mês
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--accent-gold)', display: 'block' }}>
                        R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>por mês</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Call to action / support info */}
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: '700' }}>Ficou interessado?</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', lineHeight: '1.4' }}>
              Para contratar ou tirar dúvidas sobre as assinaturas, por favor converse com nosso profissional no seu próximo atendimento ou entre em contato diretamente conosco. Ativamos na hora para você!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSubscription;
