import React, { useState } from 'react';
import { Mail, Lock, LogIn, Eye, EyeOff, Shield, User } from 'lucide-react';
import { useApp, UserRole } from '../context/AppContext';

const Login: React.FC = () => {
  const { setAuth, config } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Para propósitos de teste/demonstração, vamos definir o papel baseado no email ou apenas um padrão
    // No futuro, isso viria de uma verificação real no banco de dados
    let role: UserRole = 'owner';
    let userId = '1';

    if (email.includes('pro')) {
      role = 'professional';
      userId = '2';
    } else if (email.includes('cli')) {
      role = 'customer';
      userId = 'c1';
    }
    
    setTimeout(() => {
      setAuth(role, userId);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif"
    }}>
      {/* Animated Gradient Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(-45deg, #000, #0a0a0a, #1a1508, #000)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 15s ease infinite',
        zIndex: 0
      }} />

      {/* Subtle Glow behind the Logo */}
      <div style={{
        position: 'absolute', left: '15%', top: '50%', transform: 'translateY(-50%)',
        width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        filter: 'blur(100px)', zIndex: 0
      }} />

      {/* Decorative Brand on the Left (Desktop) */}
      <div id="login-brand-side" style={{
        position: 'absolute', left: '2%', top: '50%', transform: 'translateY(-50%)',
        zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <img 
          src={config?.logoUrl || "/logo3.png"} 
          alt="Logo" 
          style={{ 
            width: '900px', 
            height: 'auto'
          }} 
        />
      </div>

      {/* Login Card */}
      <div className="login-card-container" style={{ 
        width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative', zIndex: 2,
        marginLeft: 'auto', marginRight: '8%'
      }}>
        <div className="premium-card" style={{ 
          padding: '3rem 2.5rem', 
          background: 'rgba(15, 15, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.2)', 
          borderRadius: '32px',
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.05)'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
             <div style={{ 
              width: '140px', height: '140px', 
              margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
               <img src={config?.logoUrl || "/logo3.png"} style={{ width: '100%', height: 'auto', mixBlendMode: 'screen' }} alt="Logo" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>
              Bem-vindo de volta!
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              Faça login para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Input Email */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>
                E-mail ou telefone
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input 
                  required type="text" placeholder="Digite seu e-mail ou telefone" 
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', padding: '1.1rem 1.1rem 1.1rem 3.5rem', borderRadius: '14px', 
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem'
                  }} 
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input 
                  required type={showPassword ? "text" : "password"} placeholder="Digite sua senha" 
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ 
                    width: '100%', padding: '1.1rem 3.5rem 1.1rem 3.5rem', borderRadius: '14px', 
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem'
                  }} 
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', 
                    background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' 
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#888', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ 
                    width: '16px', height: '16px', borderRadius: '4px', accentColor: 'var(--accent-gold)',
                    background: 'transparent', border: '1px solid #444' 
                  }} 
                />
                Lembrar de mim
              </label>
              <a href="#" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                Esqueci minha senha
              </a>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="gold-button" 
              style={{ 
                padding: '1.25rem', fontSize: '1rem', marginTop: '1rem', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                borderRadius: '14px', fontWeight: '800'
              }}
            >
              {isLoading ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>Entrar</>
              )}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#555', fontSize: '0.8rem' }}>
              <Shield size={14} />
              <span>Acesso seguro e criptografado</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (max-width: 1024px) {
          #login-brand-side { display: none !important; }
          .login-card-container { margin: 0 auto !important; }
        }
      `}} />
    </div>
  );
};

export default Login;

