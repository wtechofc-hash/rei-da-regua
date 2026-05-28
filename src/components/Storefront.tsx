import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  CreditCard,
  Trash2,
  Plus,
  Minus,
  Check,
  ArrowLeft,
  Crown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { generateAvailableSlots, getLocalDateString } from '../utils/timeSlots';
import TimePicker from './TimePicker';

/* Hook: detecta se está em mobile para ajustar o offset do botão flutuante */
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
};

const Storefront: React.FC = () => {
  const { 
    services = [], 
    products = [], 
    addAppointment, 
    profiles = [], 
    config, 
    logout, 
    shopData, 
    shopId, 
    userId, 
    clients = [], 
    appointments = [],
    updateProduct,
    subscriptionPlans = [],
    subscriptions = [],
    addSubscription
  } = useApp();

  // Selected state for the active card click
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Cart state
  const [cartServices, setCartServices] = useState<{ id: string; service: any; professional: any; date: string; time: string }[]>([]);
  const [cartProducts, setCartProducts] = useState<{ product: any; quantity: number }[]>([]);

  // Selection modal state
  const [openBookingModal, setOpenBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(getLocalDateString());
  const [bookingTime, setBookingTime] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');

  // Checkout and Success screens
  const [isCheckoutActive, setIsCheckoutActive] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'offline' | 'online'>('offline');
  const [onlineSuccess, setOnlineSuccess] = useState(false);
  const [useVipCredits, setUseVipCredits] = useState(false);

  // Mobile detection for floating bar offset
  const isMobile = useIsMobile();

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
      const slots = generateAvailableSlots(bookingDate, selectedProfessional, duration, appointments, '08:00', '20:00', 5, services);
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

  // Handle Mercado Pago redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('status');
    const shopRef = params.get('shop');

    if ((mpStatus === 'success' || mpStatus === 'approved') && shopRef) {
      const pendingId = localStorage.getItem('pending_mp_appointment_id');
      const pendingIdsStr = localStorage.getItem('pending_mp_appointment_ids');

      const confirmAppointments = async () => {
        try {
          if (pendingIdsStr) {
            const pendingIds = JSON.parse(pendingIdsStr);
            const { error } = await supabase.from('appointments')
              .update({ status: 'confirmed' })
              .in('id', pendingIds);
            if (error) throw error;
            localStorage.removeItem('pending_mp_appointment_ids');
          } else if (pendingId) {
            const { error } = await supabase.from('appointments')
              .update({ status: 'confirmed' })
              .eq('id', pendingId);
            if (error) throw error;
            localStorage.removeItem('pending_mp_appointment_id');
          }
          setOnlineSuccess(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Erro ao confirmar agendamentos da volta do Mercado Pago:", err);
        }
      };

      confirmAppointments();
    } else if (mpStatus === 'failure') {
      alert("O pagamento falhou ou foi cancelado. Por favor, tente novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Multi-service and products checkout handler
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartServices.length === 0 && cartProducts.length === 0) return;
    
    setIsCheckingOut(true);

    try {
      // 1. Create all scheduled appointments
      const createdAppts = [];
      const userSub = subscriptions.find(s => s.clientId === userId && s.status === 'active' && s.servicesUsed < s.servicesTotal);
      const maxCreditsToUse = userSub ? Math.min(userSub.servicesTotal - userSub.servicesUsed, cartServices.length) : 0;
      let creditsRemaining = useVipCredits ? maxCreditsToUse : 0;

      // Sort services by price descending to apply discount to most expensive ones
      const sortedCartServices = [...cartServices].sort((a, b) => b.service.price - a.service.price);

      for (const item of sortedCartServices) {
        const serviceDuration = item.service.duration || 30;
        const [startH, startM] = item.time.split(':').map(Number);
        const endTotalMin = startH * 60 + startM + serviceDuration;
        const endTime = `${Math.floor(endTotalMin / 60).toString().padStart(2, '0')}:${(endTotalMin % 60).toString().padStart(2, '0')}`;
        
        let finalPrice = item.service.price;
        let usedCredit = false;
        if (creditsRemaining > 0) {
           finalPrice = 0;
           creditsRemaining--;
           usedCredit = true;
        }

        const appt = await addAppointment({
          clientId: userId || 'online-customer',
          clientName,
          professionalId: item.professional.id,
          serviceId: item.service.id,
          date: item.date,
          time: item.time,
          endTime,
          status: 'pending',
          priceAtTime: finalPrice,
          commissionAtTime: 0
        });
        if (!appt) {
          throw new Error(`Não foi possível salvar o agendamento para o serviço ${item.service.name}. Por favor, tente novamente ou entre em contato.`);
        }
        
        if (usedCredit && userSub) {
           await useSubscriptionCredit(userSub.id, appt.id);
        }

        createdAppts.push(appt);
      }

      // 2. Create products sale if products exist in cart
      if (cartProducts.length > 0) {
        let resolvedShopId = shopId;
        if (!resolvedShopId) {
          const { data: shopMatch } = await supabase.from('shops').select('id').limit(1).maybeSingle();
          if (shopMatch) resolvedShopId = shopMatch.id;
        }

        const cartTotal = cartProducts.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
          shop_id: resolvedShopId,
          total_amount: cartTotal,
          payment_method: paymentMethod,
        }]).select();

        if (saleError || !saleData) {
          throw new Error('Erro ao registrar a venda de produtos: ' + (saleError?.message || 'Erro desconhecido'));
        }

        const saleId = saleData[0].id;
        const saleItems = cartProducts.map(item => ({
          sale_id: saleId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
        if (itemsError) throw itemsError;

        // Abate stock levels in real time
        for (const item of cartProducts) {
          const newStock = (item.product.stock || 0) - item.quantity;
          await updateProduct(item.product.id, { stock: Math.max(0, newStock) });
        }
      }

      // 3. Complete payment redirection or local checkout success
      if (paymentMethod === 'online' && shopData?.mp_enabled) {
        // Prepare Mercado Pago checkout
        const totalServicesPrice = cartServices.reduce((sum, item) => sum + item.service.price, 0);
        const totalProductsPrice = cartProducts.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const grandTotal = totalServicesPrice + totalProductsPrice;

        // Save appointment IDs to localStorage
        const apptIds = createdAppts.map(a => a.id);
        localStorage.setItem('pending_mp_appointment_ids', JSON.stringify(apptIds));
        if (apptIds.length > 0) {
          localStorage.setItem('pending_mp_appointment_id', apptIds[0]); // fallback
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            shopId: shopId,
            title: `Barbearia Premium - ${cartServices.length} Serviço(s) e ${cartProducts.length} Produto(s)`,
            price: grandTotal,
            appointmentData: {
              ids: apptIds,
              id: apptIds.length > 0 ? apptIds[0] : null
            }
          })
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || "Erro no checkout do Mercado Pago.");

        // Redirect to Mercado Pago checkout
        window.location.href = resData.initPoint;

      } else {
        // Local/Offline payment success state
        setIsSuccessState(true);
        // Clear local cart
        setCartServices([]);
        setCartProducts([]);
        setIsCheckingOut(false);
      }

    } catch (err: any) {
      console.error(err);
      alert("Erro ao finalizar checkout: " + err.message);
      setIsCheckingOut(false);
    }
  };

  // Math totals for bottom bar and checkout
  const userSub = subscriptions.find(s => s.clientId === userId && s.status === 'active' && s.servicesUsed < s.servicesTotal);
  const maxCreditsToUse = userSub ? Math.min(userSub.servicesTotal - userSub.servicesUsed, cartServices.length) : 0;
  
  const sortedServices = [...cartServices].sort((a, b) => b.service.price - a.service.price);
  let vipDiscount = 0;
  if (useVipCredits && maxCreditsToUse > 0) {
    for (let i = 0; i < maxCreditsToUse; i++) {
      vipDiscount += sortedServices[i].service.price;
    }
  }

  const totalServicesPrice = cartServices.reduce((sum, item) => sum + item.service.price, 0);
  const totalProductsPrice = cartProducts.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const grandTotal = totalServicesPrice + totalProductsPrice - vipDiscount;
  const cartItemCount = cartServices.length + cartProducts.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div style={{ background: '#050505', minHeight: '100vh', overflowX: 'hidden', width: '100%', position: 'relative' }}>
      {/* Principal content wrapper with animations and bottom padding to avoid floating card coverage */}
      <div className="animate-fade-in" style={{ width: '100%', minHeight: '100vh', paddingBottom: '12rem' }}>
      
      {/* Success View from online checkouts redirect */}
      {onlineSuccess && (
        <div style={{ maxWidth: '600px', margin: isMobile ? '1.5rem auto' : '4rem auto', padding: isMobile ? '0 0.5rem' : '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="premium-card" style={{ padding: isMobile ? '2.5rem 1.25rem' : '3.5rem', border: '1px solid rgba(0, 204, 68, 0.2)', background: 'rgba(5,5,5,0.95)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', borderRadius: '24px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0, 204, 68, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid rgba(0,204,68,0.2)' }}>
              <CheckCircle size={48} color="#00cc44" />
            </div>
            <h4 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '1rem', color: '#00cc44' }}>Pagamento Aprovado!</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              Seu pagamento foi confirmado com sucesso. Todos os agendamentos foram registrados no sistema e estão garantidos!
            </p>
            <button 
              type="button" 
              onClick={() => { setOnlineSuccess(false); setCartServices([]); setCartProducts([]); setSelectedService(null); }} 
              className="gold-button" 
              style={{ padding: '1.1rem 2.5rem', width: '100%', borderRadius: '14px', fontSize: '1rem' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Hero Section (Visible only when not in checkout/success) */}
      {!isCheckoutActive && !isSuccessState && !onlineSuccess && (
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
            {/* Logout Button */}
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
      )}

      {/* Main Storefront view (Visible when not checking out and not in success redirect) */}
      {!isCheckoutActive && !isSuccessState && !onlineSuccess && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ width: '100%' }}>
            
            {/* Services Section */}
            <section style={{ marginBottom: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Serviços</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem',
                overflowX: 'auto', overflowY: 'hidden',
                scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
                padding: '0.75rem 1.5rem',
                margin: '-0.75rem -1.5rem'
              }}>
                {services.map(service => {
                  const scheduledItem = cartServices.find(item => item.service.id === service.id);
                  const isScheduled = !!scheduledItem;

                  return (
                    <div 
                      key={service.id} 
                      onClick={() => setSelectedService(service.id)} 
                      style={{ 
                        flex: '0 0 240px', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }} 
                      className="netflix-card"
                    >
                      <div style={{ 
                        aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: selectedService === service.id ? '2px solid var(--accent-gold)' : isScheduled ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        position: 'relative', transition: 'all 0.3s'
                      }}>
                        
                        {/* Scheduled badge */}
                        {isScheduled && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(212, 175, 55, 0.9)',
                            color: '#000',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            zIndex: 2,
                            animation: 'fadeIn 0.2s'
                          }}>
                            <Check size={12} strokeWidth={3} />
                            Agendado ({scheduledItem.time})
                          </div>
                        )}

                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                           <Scissors size={48} style={{ opacity: 0.2, color: 'var(--accent-gold)' }} />
                        </div>
                        
                        {/* Gradient Overlay */}
                        <div style={{ 
                          position: 'absolute', inset: 0, 
                          background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))',
                          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
                        }}>
                          {selectedService === service.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const existing = cartServices.find(item => item.service.id === service.id);
                                if (existing) {
                                  setSelectedProfessional(existing.professional.id);
                                  setBookingDate(existing.date);
                                  setBookingTime(existing.time);
                                }
                                setOpenBookingModal(true);
                              }}
                              className="gold-button"
                              style={{
                                padding: '0.6rem 1rem',
                                fontSize: '0.85rem',
                                borderRadius: '8px',
                                marginBottom: '0.75rem',
                                width: '100%',
                                animation: 'fadeIn 0.2s ease-out'
                              }}
                            >
                              {isScheduled ? 'Editar' : 'Agendar'}
                            </button>
                          )}
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', color: 'white' }}>{service.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>• {service.duration || 30}m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* VIP Plans Section */}
            {subscriptionPlans.length > 0 && (
              <section style={{ marginBottom: '5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}><Crown size={24} color="var(--accent-gold)" /> Planos VIP</h2>
                </div>
                
                <div className="netflix-row" style={{ 
                  display: 'flex', gap: '1.5rem',
                  overflowX: 'auto', overflowY: 'hidden',
                  scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
                  padding: '0.75rem 1.5rem',
                  margin: '-0.75rem -1.5rem'
                }}>
                  {subscriptionPlans.filter(p => p.active).map(plan => {
                    const hasActiveSub = subscriptions.some(s => s.clientId === userId && s.status === 'active' && s.planId === plan.id);

                    return (
                      <div 
                        key={plan.id} 
                        style={{ 
                          flex: '0 0 240px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative'
                        }} 
                        className="netflix-card"
                      >
                        <div style={{ 
                          aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', 
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0.8) 100%)', 
                          border: hasActiveSub ? '2px solid #00cc44' : '1px solid rgba(212,175,55,0.3)',
                          position: 'relative', transition: 'all 0.3s'
                        }}>
                          {hasActiveSub && (
                            <div style={{
                              position: 'absolute', top: '12px', right: '12px',
                              background: '#00cc44', color: '#fff', padding: '4px 10px',
                              borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900',
                              display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2
                            }}>
                              <Check size={12} strokeWidth={3} /> Ativo
                            </div>
                          )}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                             <Crown size={48} style={{ opacity: 0.2, color: 'var(--accent-gold)' }} />
                          </div>
                          <div style={{ 
                            position: 'absolute', inset: 0, 
                            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.95))',
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
                          }}>
                            {!hasActiveSub && (
                              <button
                                onClick={async () => {
                                  if (!userId) {
                                    alert("Você precisa estar logado para assinar um plano.");
                                    return;
                                  }
                                  const confirm = window.confirm(`Deseja assinar o plano ${plan.name} por R$ ${plan.price}? O valor será cobrado no balcão.`);
                                  if (confirm) {
                                    const end = new Date();
                                    end.setMonth(end.getMonth() + 1);
                                    const sub = await addSubscription({
                                      clientId: userId,
                                      planId: plan.id,
                                      status: 'active',
                                      startDate: new Date().toISOString().split('T')[0],
                                      endDate: end.toISOString().split('T')[0],
                                      servicesUsed: 0,
                                      servicesTotal: plan.servicesCount
                                    });
                                    if (sub) alert("Assinatura realizada com sucesso!");
                                  }
                                }}
                                className="gold-button"
                                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderRadius: '8px', marginBottom: '0.75rem', width: '100%' }}
                              >
                                Assinar
                              </button>
                            )}
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', color: 'var(--accent-gold)' }}>{plan.name}</h3>
                            <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', margin: '0 0 8px 0' }}>R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#ccc' }}>
                              <Check size={14} color="var(--accent-gold)" /> {plan.servicesCount} serviços
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Products Section */}
            <section style={{ marginBottom: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Produtos</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem',
                overflowX: 'auto', overflowY: 'hidden',
                scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
                padding: '0.75rem 1.5rem',
                margin: '-0.75rem -1.5rem'
              }}>
                {products.map(product => {
                  const cartItem = cartProducts.find(item => item.product.id === product.id);
                  const isSelected = !!cartItem;

                  return (
                    <div 
                      key={product.id} 
                      onClick={() => {
                        if (!isSelected) {
                          setCartProducts(prev => [...prev, { product, quantity: 1 }]);
                        }
                      }}
                      style={{ 
                        flex: '0 0 240px', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} 
                      className="netflix-card"
                    >
                      <div style={{ 
                        aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: isSelected ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 20px rgba(212,175,55,0.15)' : undefined
                      }}>
                        
                        {/* Product Selected badge */}
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: '#00cc44',
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            zIndex: 2,
                            animation: 'fadeIn 0.2s'
                          }}>
                            <Check size={12} strokeWidth={3} />
                            No Carrinho
                          </div>
                        )}

                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Package size={48} style={{ opacity: 0.15, color: 'var(--accent-gold)' }} />
                        </div>
                        
                        {/* Gradient Overlay */}
                        <div style={{ 
                          position: 'absolute', inset: 0, 
                          background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))',
                          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
                        }}>
                          {isSelected && (
                            <div 
                              onClick={e => e.stopPropagation()} 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '4px',
                                marginBottom: '0.75rem',
                                animation: 'fadeIn 0.2s ease-out'
                              }}
                            >
                              <button
                                onClick={() => {
                                  setCartProducts(prev => 
                                    prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity - 1 } : item)
                                        .filter(item => item.quantity > 0)
                                  );
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'white',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'color 0.2s'
                                }}
                                className="qty-btn"
                              >
                                <Minus size={14} />
                              </button>
                              <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'white' }}>{cartItem.quantity}</span>
                              <button
                                onClick={() => {
                                  setCartProducts(prev => 
                                    prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
                                  );
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'white',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'color 0.2s'
                                }}
                                className="qty-btn"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', color: 'white' }}>{product.name}</h3>
                          <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)', margin: 0 }}>R$ {product.price}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Checkout Screen View */}
      {isCheckoutActive && !isSuccessState && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Checkout Header */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column-reverse' : 'row', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            justifyContent: 'space-between', 
            gap: isMobile ? '1.5rem' : '0',
            marginBottom: '3rem' 
          }}>
            <button 
              onClick={() => setIsCheckoutActive(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '700',
                transition: 'color 0.2s',
                padding: 0
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = '#888')}
            >
              <ArrowLeft size={20} /> {isMobile ? 'Voltar e editar pedido' : 'Voltar para Serviços e Produtos'}
            </button>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '1.8rem', fontWeight: '900', letterSpacing: '-0.02em', margin: 0, textAlign: isMobile ? 'left' : 'right' }}>Finalizar Agendamento</h2>
          </div>

          {/* Checkout Main Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '4rem' }} className="storefront-main-grid">
            
            {/* Left Column: Cart items details */}
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              
              {/* Scheduled services details */}
              {cartServices.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Serviços Agendados
                  </h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {cartServices.map(item => (
                      <div 
                        key={item.id} 
                        className="premium-card animate-fade-in"
                        style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? '1.5rem' : '0',
                          justifyContent: 'space-between',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          padding: isMobile ? '1.25rem' : '1.5rem',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ background: 'rgba(212,175,55,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', flexShrink: 0 }}>
                            <Scissors size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 4px', color: 'white' }}>{item.service.name}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                              Profissional: <strong style={{ color: '#ccc' }}>{item.professional.name}</strong> • Data: <strong style={{ color: '#ccc' }}>{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> às <strong style={{ color: '#ccc' }}>{item.time}</strong>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', borderTop: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingTop: isMobile ? '1rem' : '0' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>
                            R$ {item.service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCartServices(prev => prev.filter(i => i.id !== item.id))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px',
                              borderRadius: '8px',
                              transition: 'all 0.2s',
                            }}
                            className="delete-item-btn"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected products details */}
              {cartProducts.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Produtos Selecionados
                  </h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {cartProducts.map(item => (
                      <div 
                        key={item.product.id} 
                        className="premium-card animate-fade-in"
                        style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? '1.5rem' : '0',
                          justifyContent: 'space-between',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          padding: isMobile ? '1.25rem' : '1.5rem',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ background: 'rgba(212,175,55,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', flexShrink: 0 }}>
                            <Package size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 4px', color: 'white' }}>{item.product.name}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                              Preço Unitário: R$ {item.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between', borderTop: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingTop: isMobile ? '1rem' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '2px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setCartProducts(prev => 
                                  prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i)
                                      .filter(i => i.quantity > 0)
                                );
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: '800', fontSize: '0.85rem', width: '16px', textAlign: 'center' }}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                  setCartProducts(prev => 
                                    prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i)
                                  );
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)', minWidth: '90px', textAlign: 'right' }}>
                            R$ {(item.product.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCartProducts(prev => prev.filter(i => i.product.id !== item.product.id))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px',
                              borderRadius: '8px',
                              transition: 'all 0.2s',
                            }}
                            className="delete-item-btn"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Checkout forms & Payment summary */}
            <aside>
              <div style={{ position: 'sticky', top: '2rem' }}>
                <div className="premium-card" style={{ padding: isMobile ? '1.5rem 1.25rem' : '2.5rem', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '2rem', color: 'var(--accent-gold)', textAlign: 'center' }}>Resumo do Pedido</h3>
                  
                  <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Serviços ({cartServices.length}):</span>
                      <span>R$ {totalServicesPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {useVipCredits && vipDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00cc44' }}>
                        <span>Desconto VIP ({maxCreditsToUse} {maxCreditsToUse === 1 ? 'serviço' : 'serviços'}):</span>
                        <span>- R$ {vipDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Produtos ({cartProducts.reduce((s, p) => s + p.quantity, 0)}):</span>
                      <span>R$ {totalProductsPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '900' }}>
                      <span>Total Geral:</span>
                      <span style={{ color: 'var(--accent-gold)' }}>R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} style={{ display: 'grid', gap: '1.5rem' }}>
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

                    {maxCreditsToUse > 0 && cartServices.length > 0 && (
                      <div style={{ padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '14px', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          id="useVip" 
                          checked={useVipCredits} 
                          onChange={e => setUseVipCredits(e.target.checked)} 
                          style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                        />
                        <label htmlFor="useVip" style={{ color: 'white', fontSize: '0.9rem', cursor: 'pointer', flex: 1 }}>
                          Utilizar créditos do Plano VIP <br/>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>({userSub?.servicesTotal! - userSub?.servicesUsed!} restantes)</span>
                        </label>
                      </div>
                    )}

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
                      disabled={isCheckingOut || grandTotal === 0}
                      className={paymentMethod === 'online' && shopData?.mp_enabled ? '' : 'gold-button'}
                      style={{ 
                        padding: '1.25rem', width: '100%', marginTop: '1rem', fontSize: '1rem', 
                        boxShadow: paymentMethod === 'online' && shopData?.mp_enabled ? '0 8px 25px rgba(0, 204, 68, 0.2)' : '0 8px 25px rgba(212,175,55,0.3)',
                        background: paymentMethod === 'online' && shopData?.mp_enabled ? '#00cc44' : undefined,
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '800',
                        cursor: (isCheckingOut || grandTotal === 0) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: grandTotal === 0 ? 0.5 : 1
                      }}
                    >
                      {isCheckingOut ? (
                        <>
                          <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          Finalizando...
                        </>
                      ) : paymentMethod === 'online' && shopData?.mp_enabled ? (
                        'Pagar Online'
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Checkout Success View (Offline checks) */}
      {isSuccessState && (
        <div style={{ maxWidth: '600px', margin: isMobile ? '1.5rem auto' : '4rem auto', padding: isMobile ? '0 0.5rem' : '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="premium-card" style={{ padding: isMobile ? '2.5rem 1.25rem' : '3.5rem', border: '1px solid rgba(0, 204, 68, 0.2)', background: 'rgba(5,5,5,0.95)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', borderRadius: '24px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0, 204, 68, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid rgba(0,204,68,0.2)' }}>
              <CheckCircle size={48} color="#00cc44" />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '1rem', color: '#00cc44' }}>Tudo Pronto!</h3>
            <p style={{ fontSize: '1.05rem', color: 'white', fontWeight: '700', marginBottom: '1.5rem' }}>
              Seus agendamentos e compra foram realizados com sucesso.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              Obrigado pelo seu pedido! Recebemos sua solicitação e os profissionais já foram notificados.
              Você receberá a confirmação em breve. Nos vemos lá!
            </p>
            <button 
              onClick={() => {
                setIsSuccessState(false);
                setIsCheckoutActive(false);
              }} 
              className="gold-button" 
              style={{ padding: '1.1rem 2.5rem', fontSize: '1rem', borderRadius: '14px', width: '100%' }}
            >
              Entendido, Voltar para Home
            </button>
          </div>
        </div>
      )}



      {/* Sleek Premium Footer */}
      {!isCheckoutActive && !isSuccessState && !onlineSuccess && (
        <footer style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(5, 5, 5, 0.95)',
          padding: '4rem 1.5rem',
          marginTop: '6rem',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', textAlign: 'left' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'white', fontWeight: '900', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>{(config?.businessName || 'REI DA RÉGUA').toUpperCase()}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '320px' }}>
                Experiência premium de barbearia com profissionais altamente qualificados e produtos de altíssima qualidade.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--accent-gold)', fontWeight: '800', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contatos</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <MapPin size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', margin: '0 0 4px' }}>Localização</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Av. Villas Boas, 1200 - Centro</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Phone size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', margin: '0 0 4px' }}>Telefone</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>(11) 98888-7777</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--accent-gold)', fontWeight: '800', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Redes Sociais</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Compartilhe nosso estilo ou agende para um amigo!
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="premium-card" style={{ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>
                  <Share2 size={18} />
                </button>
                <button className="premium-card" style={{ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            © {new Date().getFullYear()} {(config?.businessName || 'REI DA RÉGUA')}. Todos os direitos reservados.
          </div>
        </footer>
      )}

      </div>

      {/* Reusable Dynamic Booking Modal (moved outside animate-fade-in to prevent fixed context bugs) */}
      {openBookingModal && selectedService && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '1rem',
          animation: 'fadeIn 0.25s ease-out'
        }} onClick={() => { setOpenBookingModal(false); setSelectedService(null); }}>
          <div 
            onClick={e => e.stopPropagation()}
            className="premium-card" 
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: isMobile 
                ? (cartItemCount > 0 ? '1.5rem 1rem 7rem 1rem' : '1.5rem 1rem') 
                : (cartItemCount > 0 ? '2.5rem 2.5rem 8rem 2.5rem' : '2.5rem'),
              boxSizing: 'border-box',
              border: '1px solid rgba(212,175,55,0.25)',
              background: 'rgba(15, 15, 15, 0.98)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.05)',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '24px'
            }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', color: 'var(--accent-gold)', textAlign: 'center' }}>
              Agendar {services.find(s => s.id === selectedService)?.name}
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
              {/* Professional selection list */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
                  Profissional
                </label>
                <select 
                  required
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

              {/* Date selector input */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
                  Data
                </label>
                <input 
                  required 
                  type="date" 
                  min={getLocalDateString()}
                  style={{ width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                  value={bookingDate} 
                  onChange={e => setBookingDate(e.target.value)} 
                />
              </div>

              {/* Clock-style Time Picker */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '14px' }}>
                  Horário
                </label>
                {!selectedProfessional ? (
                  <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                    Selecione um profissional para ver os horários.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {availableSlots.length === 0 && (
                      <div style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', background: 'rgba(255,50,50,0.08)', borderRadius: '10px', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5252', fontSize: '0.82rem', fontWeight: '700', textAlign: 'center', width: '100%' }}>
                        Nenhum horário disponível para este dia — todos marcados em vermelho.
                      </div>
                    )}
                    <TimePicker
                      availableSlots={availableSlots}
                      shopOpen="08:00"
                      shopClose="20:00"
                      intervalMinutes={5}
                      value={bookingTime}
                      onChange={(t) => setBookingTime(t)}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setOpenBookingModal(false); setSelectedService(null); }}
                  className="premium-card"
                  style={{
                    flex: 1,
                    padding: '1.1rem',
                    textAlign: 'center',
                    fontWeight: '800',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    borderRadius: '14px',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedProfessional || !bookingDate || !bookingTime}
                  onClick={() => {
                    const service = services.find(s => s.id === selectedService);
                    const professional = availableProfessionals.find(p => p.id === selectedProfessional);
                    if (service && professional && bookingDate && bookingTime) {
                      setCartServices(prev => {
                        const existingIdx = prev.findIndex(item => item.service.id === service.id);
                        if (existingIdx !== -1) {
                          const newCart = [...prev];
                          newCart[existingIdx] = { ...newCart[existingIdx], professional, date: bookingDate, time: bookingTime };
                          return newCart;
                        } else {
                          return [
                            ...prev, 
                            { 
                              id: Math.random().toString(36).substring(2, 9), 
                              service, 
                              professional, 
                              date: bookingDate, 
                              time: bookingTime 
                            }
                          ];
                        }
                      });
                      setOpenBookingModal(false);
                      setSelectedService(null);
                    }
                  }}
                  className="gold-button"
                  style={{
                    flex: 2,
                    padding: '1.1rem',
                    borderRadius: '14px',
                    fontSize: '0.9rem',
                    cursor: (!selectedProfessional || !bookingDate || !bookingTime) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedProfessional || !bookingDate || !bookingTime) ? 0.5 : 1
                  }}
                >
                  {cartServices.some(item => item.service.id === selectedService) ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar — portal renderiza direto no body, escapando qualquer overflow/stacking context */}
      {cartItemCount > 0 && !isCheckoutActive && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            bottom: isMobile ? '84px' : '24px',   /* acima da nav mobile (72px) + gap */
            left: '50%',
            transform: 'translateX(-50%)',
            width: isMobile ? 'calc(100vw - 2rem)' : 'min(92%, 650px)',
            maxWidth: isMobile ? '480px' : '650px',
            background: 'rgba(10, 10, 10, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: isMobile ? '18px' : '24px',
            padding: isMobile ? '0.85rem 1rem' : '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.75), 0 0 30px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            zIndex: 99999,
            animation: 'floatingBarSlideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
              Sua Seleção
            </p>
            <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: '900', color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cartServices.length > 0 && `${cartServices.length} ${cartServices.length === 1 ? 'Serviço' : 'Serviços'}`}
                {cartServices.length > 0 && cartProducts.length > 0 && ' + '}
                {cartProducts.length > 0 && `${cartProducts.reduce((s, p) => s + p.quantity, 0)} Prod.`}
              </span>
              <span style={{ fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: '900', color: '#d4af37', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsCheckoutActive(true)}
            className="gold-button"
            style={{
              padding: isMobile ? '0.7rem 1.1rem' : '0.9rem 1.8rem',
              borderRadius: '14px',
              fontSize: isMobile ? '0.82rem' : '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '900',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Avançar <CheckCircle size={isMobile ? 15 : 18} />
          </button>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) {
          .storefront-main-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          aside { position: static !important; }
        }
        
        .netflix-row::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .netflix-row::-webkit-scrollbar-track { display: none !important; background: transparent !important; }
        .netflix-row::-webkit-scrollbar-thumb { display: none !important; background: transparent !important; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slideUp {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        
        @keyframes floatingBarSlideUp {
          from { transform: translate(-50%, 120px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        
        .qty-btn:hover {
          color: var(--accent-gold) !important;
        }
        
        .delete-item-btn:hover {
          background: rgba(255, 68, 68, 0.1) !important;
          transform: scale(1.05);
        }
        
        /* Floating bottom summary responsive adjustments */
        @media (max-width: 768px) {
          .floating-cart-bar {
            padding: 0.9rem 1.1rem !important;
            border-radius: 18px !important;
            bottom: 84px !important; /* sits above mobile nav (72px) + 12px gap */
            width: calc(100% - 2rem) !important;
            max-width: 480px !important;
          }
          .floating-cart-bar-text {
            font-size: 0.88rem !important;
          }
          .floating-cart-bar-btn {
            padding: 0.7rem 1rem !important;
            font-size: 0.82rem !important;
            border-radius: 12px !important;
          }
        }
        
        @media (max-width: 380px) {
          .floating-cart-bar {
            bottom: 80px !important;
            padding: 0.75rem 0.9rem !important;
            border-radius: 16px !important;
          }
          .floating-cart-bar-text {
            font-size: 0.8rem !important;
          }
          .floating-cart-bar-btn {
            padding: 0.65rem 0.85rem !important;
            font-size: 0.78rem !important;
          }
        }

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
