import React, { useState, useMemo, useCallback } from 'react';

interface TimePickerProps {
  availableSlots: string[];      // slots that CAN be booked, e.g. ["08:00","08:15",…]
  shopOpen?: string;             // default "08:00"
  shopClose?: string;            // default "20:00"
  intervalMinutes?: number;      // default 5
  value: string;                 // currently selected time "HH:MM"
  onChange: (time: string) => void;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const toHHMM = (totalMin: number) => {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/* position of a clock tick (0 = top, clockwise) */
const clockPos = (index: number, total: number, radius: number, cx: number, cy: number) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
};

/* ─── constants ───────────────────────────────────────────────────────────── */

const CX = 160;
const CY = 160;
const OUTER_R = 128;   // hour ring
const INNER_R = 80;    // minute ring

const ACCENT_GOLD = '#d4af37';
const UNAVAIL_COLOR = '#ff4444';
const BG_RING = 'rgba(255,255,255,0.04)';
const TICK_AVAIL = 'rgba(212,175,55,0.18)';
const TICK_UNAVAIL = 'rgba(255,68,68,0.15)';

/* ─── component ───────────────────────────────────────────────────────────── */

const TimePicker: React.FC<TimePickerProps> = ({
  availableSlots,
  shopOpen = '08:00',
  shopClose = '20:00',
  intervalMinutes = 15,
  value,
  onChange,
}) => {
  // Phase: 'hour' → pick an hour, then 'minute' → pick a minute within that hour
  const [phase, setPhase] = useState<'hour' | 'minute'>('hour');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<string | null>(null);

  const openMin  = toMin(shopOpen);
  const closeMin = toMin(shopClose);

  /* Build a Set of all possible slots (for disabled display) */
  const allSlots = useMemo<string[]>(() => {
    const s: string[] = [];
    for (let m = openMin; m < closeMin; m += intervalMinutes) {
      s.push(toHHMM(m));
    }
    return s;
  }, [openMin, closeMin, intervalMinutes]);

  const availableSet = useMemo(() => new Set(availableSlots), [availableSlots]);

  /* Unique hours that appear in allSlots */
  const hours = useMemo<number[]>(() => {
    const hs = new Set<number>();
    allSlots.forEach(t => hs.add(Number(t.split(':')[0])));
    return Array.from(hs).sort((a, b) => a - b);
  }, [allSlots]);

  /* For a given hour, is at least one slot available? */
  const hourHasAvail = useCallback(
    (h: number) => availableSlots.some(t => Number(t.split(':')[0]) === h),
    [availableSlots]
  );

  /* Minute options for selected hour */
  const selectedHour = value ? Number(value.split(':')[0]) : null;
  const minuteSlotsForHour = useMemo<string[]>(() => {
    if (selectedHour === null) return [];
    return allSlots.filter(t => Number(t.split(':')[0]) === selectedHour);
  }, [allSlots, selectedHour]);

  /* ── derived display value ── */
  const displayValue = value || '--:--';

  /* ── click handlers ── */
  const handleHourClick = (h: number) => {
    if (!hourHasAvail(h)) return; // disabled
    // find first available minute for this hour, or just first minute
    const firstAvail = availableSlots.find(t => Number(t.split(':')[0]) === h);
    const firstAll   = allSlots.find(t => Number(t.split(':')[0]) === h);
    const preset     = firstAvail || firstAll || `${String(h).padStart(2, '0')}:00`;
    onChange(preset);
    setPhase('minute');
  };

  const handleMinuteClick = (slot: string) => {
    if (!availableSet.has(slot)) return; // disabled
    onChange(slot);
  };

  /* ── hand angle ── */
  const handAngle = (): number | null => {
    if (!value) return null;
    if (phase === 'hour') {
      const h = Number(value.split(':')[0]);
      const idx = hours.indexOf(h);
      if (idx === -1) return null;
      return (idx / hours.length) * 360 - 90;
    } else {
      const idx = minuteSlotsForHour.indexOf(value);
      if (idx === -1) return null;
      return (idx / minuteSlotsForHour.length) * 360 - 90;
    }
  };

  const angle = handAngle();
  const handR = phase === 'hour' ? OUTER_R : INNER_R;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>

      {/* ── Digital display ── */}
      <div style={{
        fontSize: '2.8rem',
        fontWeight: '900',
        letterSpacing: '0.08em',
        color: value ? ACCENT_GOLD : '#444',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {displayValue}
      </div>

      {/* ── Phase tabs ── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['hour', 'minute'] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            style={{
              padding: '5px 20px',
              borderRadius: '20px',
              border: phase === p ? `1px solid ${ACCENT_GOLD}` : '1px solid rgba(255,255,255,0.1)',
              background: phase === p ? `rgba(212,175,55,0.12)` : 'transparent',
              color: phase === p ? ACCENT_GOLD : '#888',
              fontWeight: '700',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {p === 'hour' ? 'Hora' : 'Minuto'}
          </button>
        ))}
      </div>

      {/* ── Clock face SVG ── */}
      <div style={{ position: 'relative', width: '320px', height: '320px' }}>
        <svg
          width="320"
          height="320"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Background circles */}
          <circle cx={CX} cy={CY} r={OUTER_R + 22} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={OUTER_R - 22} fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          {phase === 'minute' && (
            <circle cx={CX} cy={CY} r={INNER_R + 16} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          )}

          {/* Clock hand */}
          {angle !== null && (
            <>
              <line
                x1={CX}
                y1={CY}
                x2={CX + handR * Math.cos((angle * Math.PI) / 180)}
                y2={CY + handR * Math.sin((angle * Math.PI) / 180)}
                stroke={ACCENT_GOLD}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
              <circle cx={CX} cy={CY} r="4" fill={ACCENT_GOLD} />
            </>
          )}

          {/* ── HOUR RING ── */}
          {phase === 'hour' && hours.map((h, idx) => {
            const pos = clockPos(idx, hours.length, OUTER_R, CX, CY);
            const avail = hourHasAvail(h);
            const isSelected = selectedHour === h;
            const isHovered = hoveredHour === h;
            const bgColor = isSelected
              ? ACCENT_GOLD
              : isHovered && avail
              ? 'rgba(212,175,55,0.3)'
              : avail ? TICK_AVAIL : TICK_UNAVAIL;
            const textColor = isSelected
              ? '#000'
              : avail ? (isHovered ? ACCENT_GOLD : 'rgba(212,175,55,0.9)')
              : UNAVAIL_COLOR;

            return (
              <g
                key={h}
                onClick={() => handleHourClick(h)}
                onMouseEnter={() => setHoveredHour(h)}
                onMouseLeave={() => setHoveredHour(null)}
                style={{ cursor: avail ? 'pointer' : 'not-allowed' }}
              >
                {/* Tick background circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={22}
                  fill={bgColor}
                  stroke={isSelected ? ACCENT_GOLD : avail ? 'rgba(212,175,55,0.2)' : 'rgba(255,68,68,0.2)'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ transition: 'all 0.2s' }}
                />
                {/* Strikethrough for unavailable */}
                {!avail && (
                  <line
                    x1={pos.x - 8} y1={pos.y}
                    x2={pos.x + 8} y2={pos.y}
                    stroke={UNAVAIL_COLOR}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                )}
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fontSize={!avail ? '11' : '13'}
                  fontWeight="800"
                  fill={textColor}
                  style={{ userSelect: 'none', fontFamily: 'Inter, sans-serif', transition: 'fill 0.2s' }}
                >
                  {String(h).padStart(2, '0')}h
                </text>
              </g>
            );
          })}

          {/* ── MINUTE RING ── */}
          {phase === 'minute' && minuteSlotsForHour.map((slot, idx) => {
            const pos = clockPos(idx, minuteSlotsForHour.length, INNER_R, CX, CY);
            const avail = availableSet.has(slot);
            const isSelected = value === slot;
            const isHovered = hoveredMinute === slot;
            const min = slot.split(':')[1];
            const bgColor = isSelected
              ? ACCENT_GOLD
              : isHovered && avail
              ? 'rgba(212,175,55,0.3)'
              : avail ? TICK_AVAIL : TICK_UNAVAIL;
            const textColor = isSelected
              ? '#000'
              : avail ? (isHovered ? ACCENT_GOLD : 'rgba(212,175,55,0.9)')
              : UNAVAIL_COLOR;

            return (
              <g
                key={slot}
                onClick={() => handleMinuteClick(slot)}
                onMouseEnter={() => setHoveredMinute(slot)}
                onMouseLeave={() => setHoveredMinute(null)}
                style={{ cursor: avail ? 'pointer' : 'not-allowed' }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={18}
                  fill={bgColor}
                  stroke={isSelected ? ACCENT_GOLD : avail ? 'rgba(212,175,55,0.2)' : 'rgba(255,68,68,0.2)'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ transition: 'all 0.2s' }}
                />
                {!avail && (
                  <line
                    x1={pos.x - 6} y1={pos.y}
                    x2={pos.x + 6} y2={pos.y}
                    stroke={UNAVAIL_COLOR}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                )}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill={textColor}
                  style={{ userSelect: 'none', fontFamily: 'Inter, sans-serif', transition: 'fill 0.2s' }}
                >
                  :{min}
                </text>
              </g>
            );
          })}

          {/* Center dot */}
          <circle cx={CX} cy={CY} r="5" fill={ACCENT_GOLD} opacity="0.5" />
        </svg>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(212,175,55,0.4)', border: '1px solid rgba(212,175,55,0.6)' }} />
          <span style={{ color: '#888' }}>Disponível</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,68,68,0.3)', border: '1px solid rgba(255,68,68,0.5)' }} />
          <span style={{ color: '#888' }}>Indisponível</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ACCENT_GOLD }} />
          <span style={{ color: '#888' }}>Selecionado</span>
        </div>
      </div>

      {/* ── Phase hint ── */}
      <p style={{ color: '#555', fontSize: '0.78rem', fontWeight: '600', margin: 0, textAlign: 'center' }}>
        {phase === 'hour'
          ? 'Selecione a hora desejada'
          : `Selecione os minutos — ${String(selectedHour).padStart(2, '0')}h`
        }
      </p>
    </div>
  );
};

export default TimePicker;
