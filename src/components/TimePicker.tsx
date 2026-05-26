import React, { useState, useMemo, useEffect, useRef } from 'react';

interface TimePickerProps {
  availableSlots: string[];      // slots that CAN be booked, e.g. ["08:00","08:05",…]
  shopOpen?: string;             // default "08:00"
  shopClose?: string;            // default "20:00"
  intervalMinutes?: number;      // default 5
  value: string;                 // currently selected time "HH:MM"
  onChange: (time: string) => void;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const toHHMM = (totalMin: number) => {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const ITEM_HEIGHT = 46;

const WheelColumn = ({ 
  items, 
  value, 
  onChange, 
  width = '80px', 
  align = 'center',
  unavailableItems = new Set<string>() 
}: {
  items: string[];
  value: string;
  onChange: (val: string) => void;
  width?: string;
  align?: 'left' | 'center' | 'right';
  unavailableItems?: Set<string>;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Initial scroll position setup
  useEffect(() => {
    if (scrollRef.current) {
      const idx = items.indexOf(value);
      if (idx !== -1) {
        scrollRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  }, []);

  // Sync scroll when value changes externally (e.g. from parent)
  useEffect(() => {
    if (scrollRef.current) {
      const idx = items.indexOf(value);
      if (idx !== -1) {
        const currentScrollIdx = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
        if (currentScrollIdx !== idx) {
           scrollRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
        }
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
      if (items[idx] && items[idx] !== value) {
        onChange(items[idx]);
      }
    }
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        height: `${ITEM_HEIGHT * 3}px`,
        width,
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        zIndex: 2
      }}
      className="hide-scrollbar"
    >
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ height: `${ITEM_HEIGHT}px` }} /> {/* Top Spacer */}
      
      {items.map(item => {
        const isSelected = item === value;
        const isUnavailable = unavailableItems.has(item);
        
        return (
          <div 
            key={item}
            style={{
              height: `${ITEM_HEIGHT}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: align,
              scrollSnapAlign: 'center',
              fontSize: isSelected ? '1.4rem' : '1.1rem',
              fontWeight: isSelected ? '800' : '500',
              color: isUnavailable ? '#ff4444' : (isSelected ? 'var(--accent-gold)' : '#777'),
              transition: 'all 0.2s',
              cursor: 'pointer',
              userSelect: 'none',
              opacity: isUnavailable && !isSelected ? 0.4 : 1
            }}
            onClick={() => {
              if (scrollRef.current) {
                const idx = items.indexOf(item);
                scrollRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
              }
            }}
          >
            {item}
          </div>
        );
      })}
      
      <div style={{ height: `${ITEM_HEIGHT}px` }} /> {/* Bottom Spacer */}
    </div>
  );
};

const TimePicker: React.FC<TimePickerProps> = ({
  availableSlots,
  shopOpen = '08:00',
  shopClose = '20:00',
  intervalMinutes = 5,
  value,
  onChange,
}) => {
  const openMin = toMin(shopOpen);
  const closeMin = toMin(shopClose);

  const allSlots = useMemo(() => {
    const s: string[] = [];
    for (let m = openMin; m < closeMin; m += intervalMinutes) {
      s.push(toHHMM(m));
    }
    return s;
  }, [openMin, closeMin, intervalMinutes]);

  const availableSet = useMemo(() => new Set(availableSlots), [availableSlots]);

  const hours = useMemo(() => {
    const hs = new Set<string>();
    allSlots.forEach(t => hs.add(t.split(':')[0]));
    return Array.from(hs).sort();
  }, [allSlots]);

  const minutes = useMemo(() => {
    const ms = new Set<string>();
    allSlots.forEach(t => ms.add(t.split(':')[1]));
    return Array.from(ms).sort();
  }, [allSlots]);

  const selectedHour = value ? value.split(':')[0] : hours[0];
  const selectedMinute = value ? value.split(':')[1] : minutes[0];

  // Initialize value if empty
  useEffect(() => {
    if (!value) {
      if (availableSlots.length > 0) {
        onChange(availableSlots[0]);
      } else if (allSlots.length > 0) {
        onChange(allSlots[0]);
      }
    }
  }, [value, availableSlots, allSlots, onChange]);

  const unavailableHours = useMemo(() => {
    const unavail = new Set<string>();
    hours.forEach(h => {
      const hasAvailable = availableSlots.some(slot => slot.startsWith(h + ':'));
      if (!hasAvailable) unavail.add(h);
    });
    return unavail;
  }, [hours, availableSlots]);

  const unavailableMinutes = useMemo(() => {
    const unavail = new Set<string>();
    minutes.forEach(m => {
      const time = `${selectedHour}:${m}`;
      if (!availableSet.has(time)) {
        unavail.add(m);
      }
    });
    return unavail;
  }, [minutes, selectedHour, availableSet]);

  const isCurrentSelectionAvailable = value ? availableSet.has(value) : false;

  return (
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      <div style={{ 
        position: 'relative', 
        display: 'flex', 
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '12px 0',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
      }}>
        {/* Selection Highlight */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: `${ITEM_HEIGHT}px`,
          transform: 'translateY(-50%)',
          background: 'rgba(212,175,55,0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(212,175,55,0.2)',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        {/* Fading Gradients for 3D effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, rgba(15,15,15,1), rgba(15,15,15,0))', pointerEvents: 'none', zIndex: 3 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, rgba(15,15,15,1), rgba(15,15,15,0))', pointerEvents: 'none', zIndex: 3 }} />

        <WheelColumn 
          items={hours}
          value={selectedHour}
          onChange={h => onChange(`${h}:${selectedMinute}`)}
          width="80px"
          align="center"
          unavailableItems={unavailableHours}
        />
        
        <div style={{ 
          height: `${ITEM_HEIGHT * 3}px`, 
          display: 'flex', 
          alignItems: 'center', 
          fontSize: '1.4rem', 
          fontWeight: '800', 
          color: 'var(--accent-gold)',
          zIndex: 2,
          paddingBottom: '2px' // optical alignment
        }}>
          :
        </div>

        <WheelColumn 
          items={minutes}
          value={selectedMinute}
          onChange={m => onChange(`${selectedHour}:${m}`)}
          width="80px"
          align="center"
          unavailableItems={unavailableMinutes}
        />
      </div>

      {!isCurrentSelectionAvailable && value && (
        <div style={{ 
          color: '#ff4444', 
          fontSize: '0.85rem', 
          fontWeight: '700', 
          textAlign: 'center',
          background: 'rgba(255,68,68,0.1)',
          padding: '10px',
          borderRadius: '12px',
          border: '1px solid rgba(255,68,68,0.2)',
          animation: 'fadeIn 0.2s'
        }}>
          Horário indisponível
        </div>
      )}
    </div>
  );
};

export default TimePicker;
