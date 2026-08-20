import React, { useEffect, useState } from 'react';
import { descuentoService } from '../services/descuento.service';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { Producto, Categoria, TipoDescuento, VistaPreviaDescuento } from '../types';
import './Descuentos.css';

interface GestionDescuentosProps {
  onApplied: () => void;
}

type Alcance = TipoDescuento;

const GestionDescuentos: React.FC<GestionDescuentosProps> = ({ onApplied }) => {
  const [alcance, setAlcance] = useState<Alcance>('categoria');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [terminoProducto, setTerminoProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState<Producto[]>([]);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [showProductResults, setShowProductResults] = useState(false);
  const [porcentaje, setPorcentaje] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [preview, setPreview] = useState<VistaPreviaDescuento | null>(null);
  const [error, setError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [excluidosIds, setExcluidosIds] = useState<number[]>([]);

  useEffect(() => {
    categoryService.obtenerCategorias(true).then((res) => {
      setCategorias(res.categorias || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!terminoProducto.trim() || productoSeleccionado) {
      setResultadosProducto([]);
      return;
    }
    setBuscandoProducto(true);
    const timeoutId = setTimeout(() => {
      productService.obtenerProductos({
        busqueda: terminoProducto.trim(),
        limite: 8,
        activo: true
      }).then((res) => {
        setResultadosProducto(res.productos);
      }).catch(() => {
        setResultadosProducto([]);
      }).finally(() => {
        setBuscandoProducto(false);
      });
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [terminoProducto, productoSeleccionado]);

  const resetResultado = () => {
    setPreview(null);
    setError('');
    setExcluidosIds([]);
  };

  const excluirProducto = (id: number) => {
    setExcluidosIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const incluirProducto = (id: number) => {
    setExcluidosIds((prev) => prev.filter((x) => x !== id));
  };

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setTerminoProducto('');
    setResultadosProducto([]);
    setShowProductResults(false);
    resetResultado();
  };

  const limpiarProducto = () => {
    setProductoSeleccionado(null);
    setTerminoProducto('');
    resetResultado();
  };

  const handleAlcance = (a: Alcance) => {
    setAlcance(a);
    resetResultado();
  };

  const validarForm = (): string => {
    if (alcance === 'producto' && !productoSeleccionado) return 'Selecciona un producto';
    if (alcance === 'categoria' && !categoriaId) return 'Selecciona una categoría';
    const desc = Number(porcentaje);
    if (!porcentaje || !Number.isFinite(desc) || desc <= 0 || desc > 100) {
      return 'El porcentaje debe estar entre 1 y 100';
    }
    return '';
  };

  const handleVistaPrevia = async () => {
    const err = validarForm();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoadingPreview(true);
    try {
      const body = {
        tipo: alcance,
        producto_id: alcance === 'producto' ? productoSeleccionado!.id : undefined,
        categoria_id: alcance === 'categoria' ? Number(categoriaId) : undefined,
        porcentaje: Number(porcentaje),
        fecha_fin: fechaFin || null
      };
      const res = await descuentoService.vistaPrevia(body);
      setPreview(res);
    } catch (e: any) {
      setError(e.response?.data?.mensaje || 'No se pudo calcular la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAplicar = async () => {
    if (!preview) {
      await handleVistaPrevia();
      return;
    }
    setLoadingApply(true);
    setError('');
    try {
      const body = {
        tipo: alcance,
        producto_id: alcance === 'producto' ? productoSeleccionado!.id : undefined,
        categoria_id: alcance === 'categoria' ? Number(categoriaId) : undefined,
        porcentaje: Number(porcentaje),
        fecha_fin: fechaFin || null,
        productos_excluidos: excluidosIds
      };
      const res = await descuentoService.aplicarDescuento(body);
      alert(
        `Descuento aplicado: ${res.descuentoAplicado}% a ${res.productosAfectados} producto(s)` +
        (res.omitidos > 0 ? ` (${res.omitidos} omitidos por recomendación)` : '') +
        (res.excluidos > 0 ? ` (${res.excluidos} excluidos)` : '')
      );
      setPreview(null);
      setPorcentaje('');
      setFechaFin('');
      setExcluidosIds([]);
      onApplied();
    } catch (e: any) {
      setError(e.response?.data?.mensaje || 'Error al aplicar el descuento');
    } finally {
      setLoadingApply(false);
    }
  };

  const afectadosVisibles = preview ? preview.afectados.filter((a) => !excluidosIds.includes(a.producto_id)) : [];
  const excluidosVisibles = preview ? preview.afectados.filter((a) => excluidosIds.includes(a.producto_id)) : [];
  const loteVisible = afectadosVisibles.length
    ? Math.min(...afectadosVisibles.map((a) => a.descuentoEfectivo))
    : 0;
  const descEsperado = preview ? loteVisible : (porcentaje ? Number(porcentaje) : 0);

  return (
    <div className="gestion-descuentos">
      <div className="gd-form">
        <div className="gd-alcance">
          <button
            type="button"
            className={`gd-alcance-btn ${alcance === 'producto' ? 'active' : ''}`}
            onClick={() => handleAlcance('producto')}
          >
            <i className="bx bx-package" />
            Por Producto
          </button>
          <button
            type="button"
            className={`gd-alcance-btn ${alcance === 'categoria' ? 'active' : ''}`}
            onClick={() => handleAlcance('categoria')}
          >
            <i className="bx bx-category" />
            Por Categoría
          </button>
          <button
            type="button"
            className={`gd-alcance-btn ${alcance === 'todos' ? 'active' : ''}`}
            onClick={() => handleAlcance('todos')}
          >
            <i className="bx bx-store" />
            Todos los Productos
          </button>
        </div>

        <div className="gd-grid">
          {alcance === 'producto' && (
            <div className="gd-field gd-field--full">
              <label>Producto</label>
              {productoSeleccionado ? (
                <span className="gd-product-chip">
                  <i className="bx bx-package" />
                  {productoSeleccionado.codigo} · {productoSeleccionado.nombre}
                  <button type="button" onClick={limpiarProducto} aria-label="Quitar producto">
                    <i className="bx bx-x" />
                  </button>
                </span>
              ) : (
                <div className="gd-product-picker">
                  <input
                    type="text"
                    placeholder="Buscar producto por código o nombre..."
                    value={terminoProducto}
                    onChange={(e) => {
                      setTerminoProducto(e.target.value);
                      setShowProductResults(true);
                      resetResultado();
                    }}
                    onFocus={() => setShowProductResults(true)}
                    onBlur={() => setTimeout(() => setShowProductResults(false), 150)}
                  />
                  {showProductResults && (terminoProducto.trim() || buscandoProducto) && (
                    <div className="gd-product-results">
                      {buscandoProducto && <div className="gd-product-option">Buscando...</div>}
                      {!buscandoProducto && resultadosProducto.length === 0 && (
                        <div className="gd-product-option">Sin resultados</div>
                      )}
                      {!buscandoProducto && resultadosProducto.map((p) => (
                        <div
                          key={p.id}
                          className="gd-product-option"
                          onMouseDown={() => seleccionarProducto(p)}
                        >
                          <span>{p.nombre}</span>
                          <small>{p.codigo}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {alcance === 'categoria' && (
            <div className="gd-field">
              <label>Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value);
                  resetResultado();
                }}
              >
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="gd-field">
            <label>% Descuento</label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.01"
              placeholder="Ej: 15"
              value={porcentaje}
              onChange={(e) => {
                setPorcentaje(e.target.value);
                resetResultado();
              }}
            />
          </div>

          <div className="gd-field">
            <label>Vigencia hasta (opcional)</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                resetResultado();
              }}
            />
          </div>
        </div>

        {error && <div className="gd-error">{error}</div>}

        <div className="gd-actions-row">
          <button type="button" className="gd-btn gd-btn-secondary" onClick={handleVistaPrevia} disabled={loadingPreview}>
            <i className="bx bx-show" />
            {loadingPreview ? 'Calculando...' : 'Ver Vista Previa'}
          </button>
          <button type="button" className="gd-btn gd-btn-primary" onClick={handleAplicar} disabled={loadingApply}>
            <i className="bx bx-check-circle" />
            {loadingApply ? 'Aplicando...' : 'Aplicar Descuento'}
          </button>
        </div>
      </div>

      {preview && (
        <>
          <div className="gd-preview-summary">
            <span>
              Se aplicará <strong>{descEsperado}%</strong> (solicitado: {preview.porcentajeSolicitado}%)
            </span>
            <span>
              Productos afectados: <strong>{afectadosVisibles.length}</strong>
            </span>
            {excluidosVisibles.length > 0 && (
              <span>
                Excluidos: <strong>{excluidosVisibles.length}</strong>
              </span>
            )}
            {preview.omitidos.length > 0 && (
              <span>
                Omitidos: <strong>{preview.omitidos.length}</strong>
              </span>
            )}
            {afectadosVisibles.some((a) => a.limitadoPorMargen) && (
              <span style={{ color: '#b45309' }}>
                <i className="bx bx-info-circle" /> Algunos descuentos se limitaron al margen de ganancia
              </span>
            )}
          </div>

          {afectadosVisibles.length > 0 && (
            <div className="module-card">
              <div className="gd-table-wrap">
                <table className="gd-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Margen</th>
                      <th>Descuento efectivo</th>
                      <th>Precio final</th>
                      <th>Estado</th>
                      {alcance !== 'producto' && <th>Excluir</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {afectadosVisibles.map((a) => {
                      const precioFinal = a.precio_venta * (1 - a.descuentoEfectivo / 100);
                      return (
                        <tr key={a.producto_id}>
                          <td>{a.codigo}</td>
                          <td>{a.nombre}</td>
                          <td>S/ {a.precio_venta.toFixed(2)}</td>
                          <td>{a.margen.toFixed(1)}%</td>
                          <td>{a.descuentoEfectivo.toFixed(2)}%</td>
                          <td>S/ {precioFinal.toFixed(2)}</td>
                          <td>
                            {a.limitadoPorMargen ? (
                              <span className="gd-badge gd-badge--limitado">Limitado por margen</span>
                            ) : (
                              <span className="gd-badge gd-badge--ok">OK</span>
                            )}
                          </td>
                          {alcance !== 'producto' && (
                            <td>
                              <button
                                type="button"
                                className="gd-excluir-btn"
                                onClick={() => excluirProducto(a.producto_id)}
                                title="Excluir producto del descuento"
                              >
                                <i className='bx bx-x'></i> Excluir
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {excluidosVisibles.length > 0 && (
            <div className="gd-excluidos">
              <h4>
                <i className="bx bx-minus-circle" /> Productos excluidos del descuento ({excluidosVisibles.length})
              </h4>
              <div className="gd-table-wrap">
                <table className="gd-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Margen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {excluidosVisibles.map((a) => (
                      <tr key={a.producto_id}>
                        <td>{a.codigo}</td>
                        <td>{a.nombre}</td>
                        <td>S/ {a.precio_venta.toFixed(2)}</td>
                        <td>{a.margen.toFixed(1)}%</td>
                        <td>
                          <button
                            type="button"
                            className="gd-incluir-btn"
                            onClick={() => incluirProducto(a.producto_id)}
                            title="Incluir producto de nuevo"
                          >
                            <i className='bx bx-undo'></i> Incluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.omitidos.length > 0 && (
            <div className="gd-omitidos">
              <h4>
                <i className="bx bx-info-circle" /> Omitidos por descuento de recomendación vigente
              </h4>
              {preview.omitidos.map((o) => (
                <div key={o.producto_id}>
                  <span className="gd-badge gd-badge--recomendacion">Recomendación</span>{' '}
                  {o.codigo} · {o.nombre}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GestionDescuentos;