import React, { useCallback, useEffect, useState } from 'react';
import { descuentoService } from '../services/descuento.service';
import { Descuento, TipoDescuento } from '../types';
import { FUENTE_LABEL } from '../utils/promociones';
import './Descuentos.css';

interface DescuentosActivosProps {
  refreshKey: number;
}

const DescuentosActivos: React.FC<DescuentosActivosProps> = ({ refreshKey }) => {
  const [descuentos, setDescuentos] = useState<Descuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuenteFiltro, setFuenteFiltro] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [revertiendo, setRevertiendo] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await descuentoService.listarDescuentos({
        fuente: fuenteFiltro || undefined,
        tipo: (tipoFiltro as TipoDescuento) || undefined
      });
      setDescuentos(res.descuentos || []);
    } catch (e) {
      console.error('Error al cargar descuentos:', e);
    } finally {
      setLoading(false);
    }
  }, [fuenteFiltro, tipoFiltro]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const tipoLabel = (d: Descuento): string => {
    if (d.todos_productos) return 'Todos los productos';
    if (d.categoria_id) return 'Por categoría';
    if (d.producto_id) return 'Por producto';
    return '—';
  };

  const referenciaLabel = (d: Descuento): string => {
    if (d.todos_productos) return 'TODOS';
    if (d.categoria) return d.categoria.nombre;
    if (d.producto) return `${d.producto.codigo} · ${d.producto.nombre}`;
    return '—';
  };

  const estadoLabel = (d: Descuento): string => {
    if (!d.fecha_fin) return 'Indefinido';
    const fin = new Date(d.fecha_fin);
    return fin >= new Date() ? `Hasta ${fin.toLocaleDateString()}` : 'Vencido';
  };

  const esRevertible = (d: Descuento): boolean => d.fuente !== 'recomendacion';

  const handleRevertir = async (d: Descuento) => {
    setRevertiendo(d.id);
    try {
      await descuentoService.revertirDescuento(d.id);
      alert('Descuento revertido correctamente');
      cargar();
    } catch (e: any) {
      alert(e.response?.data?.mensaje || 'Error al revertir el descuento');
    } finally {
      setRevertiendo(null);
    }
  };

  return (
    <div className="descuentos-activos">
      <div className="da-toolbar">
        <div className="da-filtros">
          <select className="da-filtro" value={fuenteFiltro} onChange={(e) => setFuenteFiltro(e.target.value)}>
            <option value="">Todas las fuentes</option>
            <option value="recomendacion">Recomendación</option>
            <option value="masivo">Masivo</option>
            <option value="manual">Manual</option>
          </select>
          <select className="da-filtro" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="producto">Por producto</option>
            <option value="categoria">Por categoría</option>
            <option value="todos">Todos los productos</option>
          </select>
          <button type="button" className="gd-btn gd-btn-secondary" onClick={cargar}>
            <i className="bx bx-refresh" /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="module-card">
          <div className="da-empty">Cargando descuentos...</div>
        </div>
      ) : descuentos.length === 0 ? (
        <div className="module-card">
          <div className="da-empty">
            <i className="bx bx-purchase-tag" />
            No hay descuentos registrados
          </div>
        </div>
      ) : (
        <div className="module-card">
          <div className="gd-table-wrap">
            <table className="da-tabla">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>%</th>
                  <th>Vigencia</th>
                  <th>Fuente</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {descuentos.map((d) => (
                  <tr key={d.id}>
                    <td>{tipoLabel(d)}</td>
                    <td>{referenciaLabel(d)}</td>
                    <td>
                      <strong>{Number(d.porcentaje).toFixed(2)}%</strong>
                      {Array.isArray(d.productos_excluidos) && d.productos_excluidos.length > 0 && (
                        <div className="da-excluidos-count">{d.productos_excluidos.length} excluidos</div>
                      )}
                    </td>
                    <td>{estadoLabel(d)}</td>
                    <td>
                      <span className={`da-fuente ${d.fuente}`}>
                        <i className={`bx ${d.fuente === 'recomendacion' ? 'bx-bulb' : d.fuente === 'masivo' ? 'bx-group' : 'bx-edit'}`} />
                        {FUENTE_LABEL[d.fuente] || d.fuente}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="da-revertir-btn"
                        onClick={() => handleRevertir(d)}
                        disabled={!esRevertible(d) || revertiendo === d.id}
                        title={esRevertible(d) ? 'Revertir descuento' : 'Los descuentos de recomendación se revierten desde el módulo de Alertas'}
                      >
                        <i className="bx bx-undo" />
                        {revertiendo === d.id ? 'Revertiendo...' : 'Revertir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DescuentosActivos;