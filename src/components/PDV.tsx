import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, Trash2, Plus, Minus, ShoppingCart, CreditCard,
  Banknote, Smartphone, CheckCircle2, X, Package, Barcode, Hash, Clock
} from 'lucide-react';
import { useApp, Product, Profile } from '../context/AppContext';
import { supabase } from '../lib/supabase';

interface CartItem {
  product: Product;
  quantity: number;
}

const PDV: React.FC = () => {
  const { products, updateProduct, shopId, profiles = [], addSaleState } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro');
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedProId, setSelectedProId] = useState<string>('');
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const findProduct = (query: string): Product | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    // Try exact match on barcode first
    const byBarcode = products.find(p => p.barcode && p.barcode.toLowerCase() === q);
    if (byBarcode) return byBarcode;
    // Then try exact match on item code
    const byItemCode = products.find(p => p.itemCode && p.itemCode.toLowerCase() === q);
    if (byItemCode) return byItemCode;
    return undefined;
  };

  const searchProducts = (query: string): Product[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.itemCode && p.itemCode.toLowerCase().includes(q))
    ).slice(0, 8);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock <= 0) {
        alert(`Produto "${product.name}" sem estoque!`);
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      if (newQty > item.product.stock) {
        alert(`Estoque máximo: ${item.product.stock}`);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const product = findProduct(searchTerm);
      if (product) {
        addToCart(product);
        setSearchTerm('');
        setShowResults(false);
      } else {
        const results = searchProducts(searchTerm);
        if (results.length === 1) {
          addToCart(results[0]);
          setSearchTerm('');
          setShowResults(false);
        } else if (results.length > 1) {
          setSearchResults(results);
          setShowResults(true);
        }
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      setSearchResults(searchProducts(value));
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + ((item.product.promotionPrice || item.product.price) * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Active professional list
  const staff = profiles.filter(p => p.role === 'professional');
  const selectedPro = profiles.find(p => p.id === selectedProId);

  // Dynamic Commission Rate check
  const getProductCommissionRate = (product: Product): number => {
    if (product.commission !== undefined && product.commission > 0) {
      return product.commission;
    }
    if (selectedPro && selectedPro.commission !== undefined && selectedPro.commission > 0) {
      return selectedPro.commission;
    }
    return 0;
  };

  // Estimated Commission sum
  const estimatedCommission = cart.reduce((sum, item) => {
    const price = (item.product.promotionPrice || item.product.price) * item.quantity;
    const rate = getProductCommissionRate(item.product);
    return sum + (price * (rate / 100));
  }, 0);

  const finalizeSale = async () => {
    if (cart.length === 0) return;

    try {
      const productSummary = cart.map(item => `${item.product.name} (x${item.quantity})`).join(', ');

      // 1. Create the sale record
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        shop_id: shopId,
        total_amount: cartTotal,
        payment_method: paymentMethod,
        professional_id: selectedProId || null,
        commission_amount: estimatedCommission,
        notes: productSummary
      }]).select();

      if (saleError || !saleData) {
        alert('Erro ao registrar a venda: ' + (saleError?.message || 'Erro desconhecido'));
        return;
      }

      const saleId = saleData[0].id;

      // 2. Create sale items
      const saleItems = cart.map(item => ({
        sale_id: saleId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.promotionPrice || item.product.price,
        total_price: (item.product.promotionPrice || item.product.price) * item.quantity,
      }));

      await supabase.from('sale_items').insert(saleItems);

      // 3. Update stock for each product
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProduct(item.product.id, { stock: Math.max(0, newStock) });
      }

      // 4. Update local Sales state in AppContext
      if (addSaleState) {
        addSaleState({
          id: saleId,
          shopId: shopId || '',
          totalAmount: cartTotal,
          paymentMethod: paymentMethod,
          soldAt: saleData[0].sold_at || new Date().toISOString(),
          notes: productSummary,
          professionalId: selectedProId || undefined,
          commissionAmount: estimatedCommission,
        });
      }

      // 5. Show success and reset
      setShowSuccess(true);
      setCart([]);
      setSelectedProId('');
      setTimeout(() => {
        setShowSuccess(false);
        searchRef.current?.focus();
      }, 2500);

    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + err.message);
    }
  };

  const paymentMethods = [
    { id: 'dinheiro' as const, label: 'Dinheiro', icon: Banknote, color: '#4caf50' },
    { id: 'pix' as const, label: 'PIX', icon: Smartphone, color: '#00bcd4' },
    { id: 'cartao' as const, label: 'Cartão', icon: CreditCard, color: '#ff9800' },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingCart color="#d4af37" size={28} /> Ponto de Venda
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Registre as vendas presenciais da barbearia com comissionamento direto da equipe.
        </p>
      </div>

      {/* Success Overlay */}
      {showSuccess && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(76,175,80,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            border: '3px solid #4caf50', animation: 'scaleIn 0.4s ease-out'
          }}>
            <CheckCircle2 size={40} color="#4caf50" />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Venda Finalizada!</h2>
          <p style={{ color: '#888', marginTop: '8px' }}>O estoque foi atualizado e a comissão registrada.</p>
        </div>,
        document.body
      )}

      {/* Main Grid: Left side operational, Right side Summary Panel */}
      <div className="pdv-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Search bar & Cart List & Professional Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Search Bar */}
          <div className="premium-card" style={{ padding: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(212,175,55,0.3)',
                borderRadius: '16px', padding: '0.5rem 1rem', transition: 'all 0.2s'
              }}>
                <Barcode size={22} color="#d4af37" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="🔍 Código de barras, código do item ou nome do produto..."
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => { if (searchTerm.trim().length >= 2) setShowResults(true); }}
                  style={{
                    flex: 1, padding: '0.75rem 0', background: 'transparent', border: 'none',
                    color: 'white', fontSize: '1rem', outline: 'none'
                  }}
                  autoComplete="off"
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); setShowResults(false); }} style={{
                    background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px'
                  }}>
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div ref={resultsRef} style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px', overflow: 'hidden', zIndex: 100,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '320px', overflowY: 'auto'
                }}>
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => { addToCart(product); setSearchTerm(''); setShowResults(false); searchRef.current?.focus(); }}
                      style={{
                        width: '100%', padding: '1rem 1.25rem', background: 'transparent', border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                        transition: 'background 0.15s', textAlign: 'left'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: 'rgba(212,175,55,0.08)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Package size={18} color="#d4af37" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.name}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            {product.itemCode && (
                              <span style={{ fontSize: '0.68rem', color: '#888', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Hash size={10} /> {product.itemCode}
                              </span>
                            )}
                            {product.barcode && (
                              <span style={{ fontSize: '0.68rem', color: '#666', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Barcode size={10} /> {product.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontWeight: '800', color: '#d4af37', fontSize: '0.95rem' }}>
                          R$ {(product.promotionPrice || product.price).toFixed(2)}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: product.stock < 5 ? '#ff5252' : '#888' }}>
                          {product.stock} un
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showResults && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
                <div ref={resultsRef} style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px', padding: '2rem', textAlign: 'center',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}>
                  <Package size={32} style={{ color: '#333', marginBottom: '8px' }} />
                  <p style={{ color: '#666', margin: 0, fontSize: '0.85rem' }}>Nenhum produto encontrado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Operational Area */}
          <div className="premium-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} /> Itens da Venda
                {cartItemCount > 0 && (
                  <span style={{
                    background: '#d4af37', color: '#000', fontSize: '0.7rem', fontWeight: '900',
                    padding: '2px 8px', borderRadius: '10px', marginLeft: '4px'
                  }}>
                    {cartItemCount}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{
                  background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.15)',
                  borderRadius: '8px', padding: '6px 12px', color: '#ff5252', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Trash2 size={12} /> Limpar Tudo
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <ShoppingCart size={48} style={{ color: '#222', marginBottom: '1rem' }} />
                <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>Carrinho vazio</p>
                <p style={{ color: '#444', fontSize: '0.75rem', margin: '4px 0 0' }}>
                  Busque e adicione produtos para começar
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: 'rgba(212,175,55,0.08)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Package size={18} color="#d4af37" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.product.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>
                        R$ {(item.product.promotionPrice || item.product.price).toFixed(2)} × {item.quantity}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => item.quantity === 1 ? removeFromCart(item.product.id) : updateQuantity(item.product.id, -1)}
                        style={{
                          width: '30px', height: '30px', borderRadius: '8px', background: '#111',
                          border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {item.quantity === 1 ? <Trash2 size={12} color="#ff5252" /> : <Minus size={12} />}
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '800', fontSize: '0.9rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                          color: '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span style={{ fontWeight: '800', color: 'white', fontSize: '0.95rem', minWidth: '70px', textAlign: 'right' }}>
                      R$ {((item.product.promotionPrice || item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Professional Selector & Payment Method */}
          {cart.length > 0 && (
            <div className="premium-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Professional Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Responsável pela Venda (Profissional)
                </label>
                <select
                  value={selectedProId}
                  onChange={e => setSelectedProId(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                    color: 'white', outline: 'none', cursor: 'pointer', fontWeight: '700',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="" style={{ background: '#111' }}>Nenhum profissional (Apenas loja)</option>
                  {staff.map(pro => (
                    <option key={pro.id} value={pro.id} style={{ background: '#111' }}>
                      {pro.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Forma de Pagamento
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: '12px', cursor: 'pointer',
                          background: isActive ? `${method.color}15` : 'rgba(255,255,255,0.02)',
                          border: isActive ? `2px solid ${method.color}` : '1px solid rgba(255,255,255,0.06)',
                          color: isActive ? method.color : '#888',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          transition: 'all 0.2s', fontWeight: '700', fontSize: '0.75rem'
                        }}
                      >
                        <Icon size={20} />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Fixo/Sticky Premium Summary Panel */}
        <div>
          <div className="premium-card" style={{
            padding: '1.5rem',
            position: 'sticky',
            top: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(212,175,55,0.15)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            background: 'linear-gradient(145deg, #0e0e0e, #050505)'
          }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#eee' }}>
                Resumo da Venda
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                  <span>Quantidade de Itens</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>{cartItemCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                  <span>Descontos</span>
                  <span style={{ fontWeight: '700', color: '#ff5252' }}>R$ 0,00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                  <span>Pagamento</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>
                    {paymentMethod === 'dinheiro' ? 'Dinheiro' : paymentMethod === 'pix' ? 'Pix' : 'Cartão'}
                  </span>
                </div>
                {selectedPro && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                    <span>Profissional</span>
                    <span style={{ fontWeight: '700', color: 'white' }}>{selectedPro.name}</span>
                  </div>
                )}
                {selectedPro && estimatedCommission > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888', background: 'rgba(0, 200, 83, 0.05)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(0, 200, 83, 0.12)', marginTop: '4px' }}>
                    <span style={{ color: '#00c853', fontWeight: '600' }}>Comissão do Profissional</span>
                    <span style={{ fontWeight: '800', color: '#00c853' }}>R$ {estimatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Geral</span>
                <span style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>
                  R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={finalizeSale}
                disabled={cart.length === 0}
                className="gold-button"
                style={{
                  width: '100%',
                  padding: '1.1rem',
                  fontSize: '1rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  borderRadius: '14px',
                  boxShadow: cart.length > 0 ? '0 6px 20px rgba(212,175,55,0.15)' : 'none',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <CheckCircle2 size={20} /> Finalizar Venda
              </button>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (max-width: 900px) {
          .pdv-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
};

export default PDV;
