import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Package, 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  Phone, 
  Share2, 
  ExternalLink,
  CheckCircle,
  LogOut,
  CreditCard
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { generateAvailableSlots } from '../utils/timeSlots';

const Storefront: React.FC = () => {
  const { services = [], products = [], addAppointment, profiles = [], config, logout, shopData, shopId, userId, clients = [], appointments = [] } = useApp();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'offline' | 'online'>('offline');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [onlineSuccess, setOnlineSuccess] = useState(false);

  const availableProfessionals = profiles.filter(p => p.role === 'professional' || p.role === 'owner');

  useEffect(() => {
    if (availableProfessionals.length === 1 && !selectedProfessional) {
      setSelectedProfessional(availableProfessionals[0].id);
    }
  }, [availableProfessionals, selectedProfessional]);

  // Update available slots when relevant state changes
  useEffect(() => {
    if (selectedService && selectedProfessional && bookingDate) {
      const service = services.find(s => s.id === selectedService);
      const duration = service?.duration || 30;
      const slots = generateAvailableSlots(bookingDate, selectedProfessional, duration, appointments);
      setAvailableSlots(slots);
      
      // Auto-select first slot or reset if current is invalid
      if (slots.length > 0 && !slots.includes(bookingTime)) {
        setBookingTime(slots[0]);
      } else if (slots.length === 0) {
        setBookingTime('');
      }
    }
  }, [selectedService, selectedProfessional, bookingDate, appointments, services]);

  useEffect(() => {
    if (userId && clients.length > 0) {
      const currentClient = clients.find(c => c.id === userId);
      if (currentClient) {
        setClientName(currentClient.name);
      }
    }
  }, [userId, clients]);

  useEffect(() => {
    // Check URL parameters for Mercado Pago redirect success
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('status');
    const shopRef = params.get('shop');

    if ((mpStatus === 'success' || mpStatus === 'approved') && shopRef) {
      const pendingId = localStorage.getItem('pending_mp_appointment_id');
      if (pendingId) {
        supabase.from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', pendingId)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao confirmar agendamento:", error);
            } else {
              setOnlineSuccess(true);
              localStorage.removeItem('pending_mp_appointment_id');
              // Clear search params
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          });
      }
    } else if (mpStatus === 'failure') {
      alert("O pagamento falhou ou foi cancelado. Por favor, tente novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    
    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    if (paymentMethod === 'online' && shopData?.mp_enabled) {
      setIsCheckingOut(true);
      try {
        const appt = await addAppointment({
          clientId: userId || 'online-customer',
          clientName,
          professionalId: selectedProfessional,
          serviceId: selectedService,
          date: bookingDate,
          time: bookingTime,
          status: 'pending',
          priceAtTime: service.price,
          commissionAtTime: 0
        });

        if (!appt) throw new Error("Erro ao registrar agendamento preliminar.");

        localStorage.setItem('pending_mp_appointment_id', appt.id);

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            shopId: shopId,
            title: service.name,
            price: service.price,
            appointmentData: {
              id: appt.id
            }
          })
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || "Erro no checkout do Mercado Pago.");

        window.location.href = resData.initPoint;

      } catch (err: any) {
        console.error(err);
        alert("Erro no checkout: " + err.message);
        setIsCheckingOut(false);
      }
    } else {
      addAppointment({
        clientId: userId || 'online-customer',
        clientName,
        professionalId: selectedProfessional,
        serviceId: selectedService,
        date: bookingDate,
        time: bookingTime,
        status: 'pending',
        priceAtTime: service.price,
        commissionAtTime: 0
      });

      setIsBooked(true);
      setTimeout(() => {
        setIsBooked(false);
        setSelectedService(null);
        setClientName('');
      }, 5000);
    }
  };

  return (
    <div className="animate-fade-in" style={{ background: '#050505', minHeight: '100vh', paddingBottom: '6rem', overflowX: 'hidden', width: '100%' }}>
      {/* Hero Section */}
      <section style={{ 
        height: '75vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', marginBottom: '4rem'
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img 
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop" 
            alt="Barber" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #050505)' }}></div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 1rem', width: '100%' }}>
          {/* Logout Button for Customers */}
          <button 
            onClick={logout}
            style={{ 
              position: 'absolute', top: '-50px', right: '20px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px 15px', borderRadius: '10px', color: '#ff4444', 
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700',
              cursor: 'pointer', backdropFilter: 'blur(10px)'
            }}
          >
            <LogOut size={14} /> Sair
          </button>

          <div style={{ marginBottom: '2rem' }}>
            <img 
              src={config?.logoUrl || "/logo3.png"} 
              alt="Logo" 
              style={{ width: '150px', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.4))' }} 
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)', fontWeight: '900', color: 'white', letterSpacing: '-0.02em', marginBottom: '1rem', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            {(config?.businessName || 'REI DA RÉGUA').toUpperCase()}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <div style={{ height: '1px', width: '40px', background: 'var(--accent-gold)' }}></div>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1.1rem)', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.4em', textTransform: 'uppercase', margin: 0 }}>
              Barbearia Premium
            </p>
            <div style={{ height: '1px', width: '40px', background: 'var(--accent-gold)' }}></div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '4rem' }} className="storefront-main-grid">
          
          <div className="storefront-content" style={{ minWidth: 0 }}>
            {/* Services Carousel */}
            <section style={{ marginBottom: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Serviços</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem',
                scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
                overflow: 'hidden auto'
              }}>
                {services.map(service => (
                  <div key={service.id} onClick={() => setSelectedService(service.id)} style={{ 
                    flex: '0 0 240px', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }} className="netflix-card">
                    <div style={{ 
                      aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', 
                      background: 'rgba(255,255,255,0.03)', border: selectedService === service.id ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                      position: 'relative', transition: 'all 0.3s'
                    }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                         <Scissors size={48} style={{ opacity: 0.2, color: 'var(--accent-gold)' }} />
                      </div>
                      
                      {/* Gradient Overlay */}
                      <div style={{ 
                        position: 'absolute', inset: 0, 
                        background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))',
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
                      }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', color: 'white' }}>{service.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>• {service.duration || 30}m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Products Carousel */}
            <section style={{ marginBottom: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Produtos</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem', paddingBottom: '0.5rem',
                scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
                overflow: 'hidden auto'
              }}>
                {products.map(product => (
                  <div key={product.id} style={{ 
                    flex: '0 0 240px', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} className="netflix-card">
                    <div style={{ 
                      aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', 
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      position: 'relative'
                    }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Package size={48} style={{ opacity: 0.15, color: 'var(--accent-gold)' }} />
                      </div>
                      
                      {/* Gradient Overlay */}
                      <div style={{ 
                        position: 'absolute', inset: 0, 
                        background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))',
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
                      }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', color: 'white' }}>{product.name}</h3>
                        <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)', margin: 0 }}>R$ {product.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div className="premium-card" style={{ padding: '2.5rem', border: '1px solid rgba(212,175,55,0.2)' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', color: 'var(--accent-gold)', textAlign: 'center' }}>Reserve seu Horário</h3>
                
                {onlineSuccess ? (
                  <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ background: 'rgba(0, 204, 68, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(0,204,68,0.2)' }}>
                      <CheckCircle size={40} color="#00cc44" />
                    </div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: '#00cc44' }}>Pagamento Aprovado!</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      Seu pagamento foi confirmado com sucesso. O agendamento foi registrado e está garantido!
                    </p>
                    <button type="button" onClick={() => { setOnlineSuccess(false); setSelectedService(null); setClientName(''); }} className="gold-button" style={{ padding: '0.8rem 1.5rem', width: '100%', marginTop: '2rem', fontSize: '0.85rem' }}>
                      Entendido
                    </button>
                  </div>
                ) : isBooked ? (
                  <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ background: 'rgba(0, 230, 118, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <CheckCircle size={40} color="#00e676" />
                    </div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>Solicitação Enviada!</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      Obrigado, <strong>{clientName}</strong>! Recebemos seu pedido de agendamento e entraremos em contato em breve para confirmar.
                    </p>
                  </div>
                ) : selectedService ? (
                  <form onSubmit={handleBooking} style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>Serviço Selecionado</label>
                      <p style={{ margin: 0, fontWeight: '700', color: 'var(--accent-gold)' }}>{services.find(s => s.id === selectedService)?.name}</p>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>Seu Nome</label>
                      <input 
                        required 
                        disabled={isCheckingOut}
                        type="text" 
                        style={{ width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        placeholder="Como podemos te chamar?" 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>Profissional</label>
                      <select 
                        required
                        disabled={isCheckingOut}
                        value={selectedProfessional}
                        onChange={e => setSelectedProfessional(e.target.value)}
                        style={{ width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }}
                      >
                        <option value="">Selecione o profissional...</option>
                        {availableProfessionals.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>Data</label>
                        <input 
                          required 
                          disabled={isCheckingOut}
                          type="date" 
                          min={new Date().toISOString().split('T')[0]}
                          style={{ width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                          value={bookingDate} 
                          onChange={e => setBookingDate(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>Horário</label>
                        {!selectedProfessional ? (
                          <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                            Selecione um profissional para ver os horários.
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div style={{ padding: '1.2rem', background: 'rgba(255,50,50,0.1)', borderRadius: '14px', border: '1px solid rgba(255,50,50,0.2)', textAlign: 'center', color: '#ff5252', fontSize: '0.85rem', fontWeight: '700' }}>
                            Nenhum horário livre para este dia.
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            paddingRight: '4px',
                            scrollbarWidth: 'thin',
                          }}>
                            {availableSlots.map(slot => (
                              <button
                                key={slot}
                                type="button"
                                disabled={isCheckingOut}
                                onClick={() => setBookingTime(slot)}
                                style={{
                                  padding: '1rem',
                                  borderRadius: '14px',
                                  background: bookingTime === slot ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                                  border: bookingTime === slot ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                                  color: bookingTime === slot ? '#000' : 'white',
                                  fontWeight: '800',
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  textAlign: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {shopData?.mp_enabled && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>Forma de Pagamento</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                          <button
                            type="button"
                            disabled={isCheckingOut}
                            onClick={() => setPaymentMethod('offline')}
                            style={{
                              padding: '0.8rem',
                              borderRadius: '12px',
                              background: paymentMethod === 'offline' ? 'rgba(212,175,55,0.1)' : '#111',
                              border: paymentMethod === 'offline' ? '1px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                              color: paymentMethod === 'offline' ? 'var(--accent-gold)' : '#ccc',
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Clock size={16} />
                            Pagar no Local
                          </button>
                          <button
                            type="button"
                            disabled={isCheckingOut}
                            onClick={() => setPaymentMethod('online')}
                            style={{
                              padding: '0.8rem',
                              borderRadius: '12px',
                              background: paymentMethod === 'online' ? 'rgba(0,204,68,0.1)' : '#111',
                              border: paymentMethod === 'online' ? '1px solid #00cc44' : '1px solid var(--glass-border)',
                              color: paymentMethod === 'online' ? '#00cc44' : '#ccc',
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <CreditCard size={16} />
                            Cartão / Pix
                          </button>
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isCheckingOut}
                      className={paymentMethod === 'online' && shopData?.mp_enabled ? '' : 'gold-button'}
                      style={{ 
                        padding: '1.25rem', width: '100%', marginTop: '1rem', fontSize: '1rem', 
                        boxShadow: paymentMethod === 'online' && shopData?.mp_enabled ? '0 8px 25px rgba(0, 204, 68, 0.2)' : '0 8px 25px rgba(212,175,55,0.3)',
                        background: paymentMethod === 'online' && shopData?.mp_enabled ? '#00cc44' : undefined,
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isCheckingOut ? (
                        <>
                          <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          Redirecionando...
                        </>
                      ) : paymentMethod === 'online' && shopData?.mp_enabled ? (
                        'Ir para Pagamento'
                      ) : (
                        'Confirmar Solicitação'
                      )}
                    </button>
                    
                    <button type="button" disabled={isCheckingOut} onClick={() => setSelectedService(null)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s' }}>
                      Alterar serviço selecionado
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 1.5rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                    <Calendar size={48} style={{ color: 'var(--accent-gold)', opacity: 0.2, marginBottom: '1.5rem' }} />
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Escolha um dos nossos serviços ao lado para iniciar seu agendamento.
                    </p>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div className="premium-card" style={{ marginTop: '1.5rem', padding: '2rem' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ color: 'var(--accent-gold)' }}><MapPin size={20} /></div>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: '800', margin: '0 0 5px' }}>Localização</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Av. Villas Boas, 1200 - Centro</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ color: 'var(--accent-gold)' }}><Phone size={20} /></div>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: '800', margin: '0 0 5px' }}>Telefone</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>(11) 98888-7777</p>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem', justifyContent: 'center' }}>
                  <button className="premium-card" style={{ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                    <Share2 size={18} />
                  </button>
                  <button className="premium-card" style={{ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) {
          .storefront-main-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          aside { position: static !important; }
        }
        
        .netflix-row::-webkit-scrollbar { display: none; width: 0; height: 0; }
        .netflix-row::-webkit-scrollbar-track { display: none; background: transparent; }
        .netflix-row::-webkit-scrollbar-thumb { display: none; background: transparent; }
        
        @media (hover: hover) and (pointer: fine) {
          .netflix-card:hover {
            transform: scale(1.05);
            z-index: 10;
          }
          
          .netflix-card:hover > div {
            border-color: var(--accent-gold) !important;
            box-shadow: 0 0 30px rgba(212,175,55,0.2);
          }
          
          .premium-card:hover { border-color: rgba(212,175,55,0.3) !important; transform: translateY(-2px); }
        }
      `}} />
    </div>
  );
};

export default Storefront;
