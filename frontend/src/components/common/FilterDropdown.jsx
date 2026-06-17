import React, { useState, useRef, useEffect } from 'react';

/**
 * FilterDropdown — pill dropdown tái sử dụng (Uber design system).
 *
 * Hỗ trợ 2 kiểu option:
 *   - string[]            : ['Tất cả', 'Writing', 'Speaking']
 *   - {label, ...}[]     : [{ label: '< 5.0', test: fn }, ...]
 *
 * Props:
 *   label    — placeholder text khi đang chọn option đầu (default)
 *   options  — mảng string hoặc object có field `label`
 *   value    — giá trị đang chọn (cùng kiểu với phần tử trong options)
 *   onChange — callback(selectedOption)
 */
const FilterDropdown = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getLabel = (opt) => (typeof opt === 'string' ? opt : opt?.label ?? '');
  const isSelected = (opt) => getLabel(opt) === getLabel(value);
  const isDefault = getLabel(value) === getLabel(options[0]);
  const btnText = isDefault ? label : getLabel(value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '999px',
          backgroundColor: isDefault ? '#fff' : '#000',
          color: isDefault ? '#000' : '#fff',
          border: '1px solid #ddd',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          fontFamily: 'UberMoveText, system-ui, sans-serif',
          whiteSpace: 'nowrap', transition: 'all 0.15s ease',
        }}
      >
        {btnText}
        <span style={{ fontSize: '11px', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          backgroundColor: '#fff', border: '1px solid #e2e2e2',
          borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          minWidth: '180px', listStyle: 'none', padding: '6px', margin: 0,
          zIndex: 200,
          maxHeight: '260px', overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}>
          {options.map((opt) => (
            <li key={getLabel(opt)}>
              <button
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', padding: '9px 12px', borderRadius: '8px',
                  fontSize: '14px', cursor: 'pointer', color: '#000',
                  fontFamily: 'UberMoveText, system-ui, sans-serif',
                  fontWeight: isSelected(opt) ? 600 : 400,
                  backgroundColor: isSelected(opt) ? '#f0f0f0' : 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected(opt) ? '#f0f0f0' : 'transparent';
                }}
              >
                {getLabel(opt)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FilterDropdown;
