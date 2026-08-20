import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Producto } from '../types';

interface ProductSearchSelectProps {
  productos: Producto[];
  eligibility: Record<number, number>;
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}

const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  productos,
  eligibility,
  value,
  onChange,
  placeholder = 'Seleccionar producto…',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = productos.find(p => p.id === value) || null;

  const items = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = q
      ? productos.filter(p => normalize(p.nombre).includes(q))
      : [...productos];

    const apto = filtered
      .filter(p => (eligibility[p.id] ?? 0) >= 30)
      .sort((a, b) => (eligibility[b.id] ?? 0) - (eligibility[a.id] ?? 0));
    const sinDatos = filtered
      .filter(p => (eligibility[p.id] ?? 0) < 30)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return { apto, sinDatos };
  }, [productos, eligibility, query]);

  const totalMatches = items.apto.length + items.sinDatos.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = totalMatches;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const flat = [...items.apto, ...items.sinDatos];
      if (flat[activeIndex]) handleSelect(flat[activeIndex].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="pss" ref={rootRef}>
      <button
        type="button"
        className={`pss-trigger ${open ? 'pss-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="pss-trigger-value">
          {selected ? (
            <>
              {selected.nombre}
              {eligibility[selected.id] !== undefined && (
                <span className="pss-trigger-dias">
                  {(eligibility[selected.id] ?? 0) >= 30 ? '✓' : ''} {eligibility[selected.id]} días
                </span>
              )}
            </>
          ) : (
            <span className="pss-placeholder">{placeholder}</span>
          )}
        </span>
        <i className={`bx bx-chevron-down pss-caret ${open ? 'pss-caret-open' : ''}`}></i>
      </button>

      {open && (
        <div className="pss-panel">
          <div className="pss-search-wrap">
            <i className="bx bx-search pss-search-icon"></i>
            <input
              ref={inputRef}
              className="pss-search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar producto…"
            />
          </div>
          <ul className="pss-list" role="listbox" ref={listRef}>
            {totalMatches === 0 && (
              <li className="pss-empty">Sin resultados</li>
            )}
            {items.apto.length > 0 && (
              <li className="pss-group-label">Con datos suficientes</li>
            )}
            {items.apto.map((p, i) => (
              <li
                key={p.id}
                data-index={i}
                role="option"
                aria-selected={p.id === value}
                className={`pss-item ${activeIndex === i ? 'active' : ''} ${p.id === value ? 'selected' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p.id); }}
              >
                <span className="pss-check">✓</span>
                <span className="pss-name">{p.nombre}</span>
                <span className="pss-dias">{eligibility[p.id]} días</span>
              </li>
            ))}
            {items.sinDatos.length > 0 && (
              <li className="pss-group-label">Sin datos suficientes</li>
            )}
            {items.sinDatos.map((p, i) => (
              <li
                key={p.id}
                data-index={items.apto.length + i}
                role="option"
                aria-selected={p.id === value}
                className={`pss-item ${activeIndex === items.apto.length + i ? 'active' : ''} ${p.id === value ? 'selected' : ''}`}
                onMouseEnter={() => setActiveIndex(items.apto.length + i)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p.id); }}
              >
                <span className="pss-check pss-check-none">·</span>
                <span className="pss-name">{p.nombre}</span>
                <span className="pss-dias">
                  {eligibility[p.id] !== undefined ? `${eligibility[p.id]} días` : 'sin ventas'}
                </span>
              </li>
            ))}
          </ul>
          {totalMatches > 0 && (
            <div className="pss-footer">{totalMatches} producto{totalMatches === 1 ? '' : 's'}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchSelect;