import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Trash2, Plus, Minus, ShoppingCart, CreditCard,
  Banknote, Smartphone, CheckCircle2, X, Package, Barcode, Hash
} from 'lucide-react';
import { useApp, Product } from '../context/AppContext';
import { supabase } from '../lib/supabase';

interface CartItem {
  product: Product;
  quantity: number;
}

const PDV: React.FC = () => {
  const { products, updateProduct, shopId } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro');
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
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

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const finalizeSale = async () => {
    if (cart.length === 0) return;

    try {
      // 1. Create the sale record
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        shop_id: shopId,
        total_amount: cartTotal,
        payment_method: paymentMethod,
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
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));

      await supabase.from('sale_items').insert(saleItems);

      // 3. Update stock for each product
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProduct(item.product.id, { stock: Math.max(0, newStock) });
      }

      // 4. Show success and reset
      setShowSuccess(true);
      setCart([]);
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
          Leia o código de barras ou digite o código do item para adicionar ao carrinho.
        </p>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
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
          <p style={{ color: '#888', marginTop: '8px' }}>O estoque foi atualizado automaticamente.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>

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
                        R$ {product.price.toFixed(2)}
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

        {/* Cart */}
        <div className="premium-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={20} /> Carrinho
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
                <Trash2 size={12} /> Limpar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <ShoppingCart size={48} style={{ color: '#222', marginBottom: '1rem' }} />
              <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>Carrinho vazio</p>
              <p style={{ color: '#444', fontSize: '0.75rem', margin: '4px 0 0' }}>
                Escaneie um código de barras ou digite o código do item
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
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
                        R$ {item.product.price.toFixed(2)} × {item.quantity}
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
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.78rem', color: '#888', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Forma de Pagamento
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
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

              {/* Total & Finalize */}
              <div style={{
                background: 'rgba(212,175,55,0.05)', borderRadius: '16px',
                border: '1px solid rgba(212,175,55,0.15)', padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#888' }}>Total ({cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'})</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#d4af37' }}>
                    R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={finalizeSale}
                  className="gold-button"
                  style={{
                    width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '900',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    borderRadius: '14px'
                  }}
                >
                  <CheckCircle2 size={20} /> Finalizar Venda
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}} />
    </div>
  );
};

export default PDV;
