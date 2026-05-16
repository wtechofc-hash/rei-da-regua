import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Storefront: React.FC = () => {
  const { services = [], products = [], addAppointment, profiles = [], config, logout } = useApp();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00');
  const [clientName, setClientName] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    
    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    addAppointment({
      clientId: 'online-customer',
      clientName,
      professionalId: profiles.find(p => p.role === 'professional')?.id || '2',
      serviceId: selectedService,
      date: bookingDate,
      time: bookingTime,
      status: 'pending',
      priceAtTime: service.price,
      commissionAtTime: (service.price * (service.commission || 0)) / 100
    });

    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      setSelectedService(null);
      setClientName('');
    }, 5000);
  };

  return (
    <div className="animate-fade-in" style={{ background: '#050505', minHeight: '100vh', paddingBottom: '6rem' }}>
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
          
          <div className="storefront-content">
            {/* Services Carousel */}
            <section style={{ marginBottom: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Serviços em Destaque</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1.5rem',
                scrollbarWidth: 'none', msOverflowStyle: 'none'
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
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>R$ {service.price}</span>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>• 45m</span>
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
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Produtos Premium</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: '700', cursor: 'pointer' }}>Ver todos</div>
              </div>
              
              <div className="netflix-row" style={{ 
                display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1.5rem',
                scrollbarWidth: 'none', msOverflowStyle: 'none'
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
                
                {isBooked ? (
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
                  <form onSubmit={handleBooking} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>Serviço Selecionado</label>
                      <p style={{ margin: 0, fontWeight: '700', color: 'var(--accent-gold)' }}>{services.find(s => s.id === selectedService)?.name}</p>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>Seu Nome</label>
                      <input 
                        required 
                        type="text" 
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        placeholder="Como podemos te chamar?" 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>Data</label>
                        <input 
                          required 
                          type="date" 
                          style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                          value={bookingDate} 
                          onChange={e => setBookingDate(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>Hora</label>
                        <input 
                          required 
                          type="time" 
                          style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid var(--glass-border)', color: 'white', fontSize: '1rem' }} 
                          value={bookingTime} 
                          onChange={e => setBookingTime(e.target.value)} 
                        />
                      </div>
                    </div>

                    <button type="submit" className="gold-button" style={{ padding: '1.25rem', width: '100%', marginTop: '1rem', fontSize: '1rem', boxShadow: '0 8px 25px rgba(212,175,55,0.3)' }}>
                      Confirmar Solicitação
                    </button>
                    
                    <button type="button" onClick={() => setSelectedService(null)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s' }}>
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
        
        .netflix-row::-webkit-scrollbar { display: none; }
        
        .netflix-card:hover {
          transform: scale(1.05);
          z-index: 10;
        }
        
        .netflix-card:hover > div {
          border-color: var(--accent-gold) !important;
          box-shadow: 0 0 30px rgba(212,175,55,0.2);
        }

        .premium-card:hover { border-color: rgba(212,175,55,0.3) !important; transform: translateY(-2px); }
      `}} />
    </div>
  );
};

export default Storefront;
