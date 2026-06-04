import React from 'react';
import { Banknote, CreditCard, AlertCircle, QrCode } from 'lucide-react';

interface PaymentMethodBadgeProps {
  method?: string;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method }) => {
  const normalized = method ? method.toLowerCase().trim() : '';

  if (normalized === 'dinheiro') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        color: '#f3e5ab',
        fontSize: '0.75rem',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>
        <Banknote size={13} style={{ color: '#d4af37' }} />
        Dinheiro
      </span>
    );
  }

  if (normalized === 'pix') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: 'rgba(0, 230, 118, 0.08)',
        border: '1px solid rgba(0, 230, 118, 0.25)',
        color: '#a7ffeb',
        fontSize: '0.75rem',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>
        <QrCode size={13} style={{ color: '#00e676' }} />
        Pix
      </span>
    );
  }

  if (normalized === 'cartao') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: 'rgba(124, 77, 255, 0.08)',
        border: '1px solid rgba(124, 77, 255, 0.25)',
        color: '#d1c4e9',
        fontSize: '0.75rem',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>
        <CreditCard size={13} style={{ color: '#b388ff' }} />
        Cartão
      </span>
    );
  }

  if (normalized === 'cartao_pix') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: 'rgba(33, 150, 243, 0.08)',
        border: '1px solid rgba(33, 150, 243, 0.25)',
        color: '#bbdefb',
        fontSize: '0.75rem',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>
        <CreditCard size={13} style={{ color: '#2196f3' }} />
        Cartão / Pix
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#aaa',
      fontSize: '0.75rem',
      fontWeight: '700',
      whiteSpace: 'nowrap'
    }}>
      <AlertCircle size={13} style={{ color: '#888' }} />
      Não informado
    </span>
  );
};
