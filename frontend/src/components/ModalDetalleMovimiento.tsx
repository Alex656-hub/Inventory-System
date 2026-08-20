import React from 'react';
import './ModalDetalleMovimiento.css';
import { Movimiento } from '../services/movimiento.service';

interface ModalDetalleMovimientoProps {
  movimiento: Movimiento;
  onClose: () => void;
}

const formatFecha = (fecha: string) => {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-PE') + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const formatTipo = (tipo: string) => {
  const map: Record<string, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    transferencia: 'Transferencia'
  };
  return map[tipo] || tipo;
};

const formatMoneda = (valor: number | undefined | null) =>
  Number(valor || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const ModalDetalleMovimiento: React.FC<ModalDetalleMovimientoProps> = ({ movimiento, onClose }) => {
  const tipoReferencia = (mov: Movimiento): string => {
    const map: Record<string, string> = {
      compra: 'Compra',
      venta: 'Venta',
      ajuste: 'Ajuste',
      transferencia: 'Transferencia',
      derivación: 'Derivación'
    };
    return map[mov.tipo_referencia || ''] || mov.tipo_referencia || '-';
  };

  return (
    <div className="mdm-overlay" onClick={onClose}>
      <div className="mdm-content" onClick={(e) => e.stopPropagation()}>
        <div className="mdm-header">
          <h3>Detalle del Movimiento</h3>
          <button className="mdm-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="mdm-body">
          <div className="mdm-grid">
            <div className="mdm-item">
              <span className="mdm-label">N° Referencia</span>
              <span className="mdm-value">#{movimiento.referencia_id || '-'}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Tipo de Operación</span>
              <span className="mdm-value">{tipoReferencia(movimiento)}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Tipo de Movimiento</span>
              <span className={`mdm-badge mdm-badge-${movimiento.tipo_movimiento}`}>
                {formatTipo(movimiento.tipo_movimiento)}
              </span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Fecha</span>
              <span className="mdm-value">{formatFecha(movimiento.fecha)}</span>
            </div>
            <div className="mdm-item mdm-span-2">
              <span className="mdm-label">Producto</span>
              <span className="mdm-value">
                {movimiento.producto ? `${movimiento.producto.codigo} - ${movimiento.producto.nombre}` : '-'}
              </span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Cantidad</span>
              <span className="mdm-value mdm-cantidad">{movimiento.cantidad}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Costo Unitario</span>
              <span className="mdm-value">{formatMoneda(movimiento.precio_unitario)}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Precio Lista</span>
              <span className="mdm-value">{movimiento.precio_lista ? formatMoneda(movimiento.precio_lista) : '-'}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Descuento</span>
              <span className="mdm-value">
                {movimiento.descuento ? `${Number(movimiento.descuento).toLocaleString('es-PE')} %` : '-'}
              </span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Stock Anterior</span>
              <span className="mdm-value">{movimiento.stock_anterior}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Stock Nuevo</span>
              <span className="mdm-value">{movimiento.stock_nuevo}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Usuario</span>
              <span className="mdm-value">{movimiento.usuario || '-'}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Responsable</span>
              <span className="mdm-value">{movimiento.responsable || '-'}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Sede Origen</span>
              <span className="mdm-value">{movimiento.sede_origen || '-'}</span>
            </div>
            <div className="mdm-item">
              <span className="mdm-label">Sede Destino</span>
              <span className="mdm-value">{movimiento.sede_destino || '-'}</span>
            </div>
            {movimiento.motivo && (
              <div className="mdm-item mdm-span-2">
                <span className="mdm-label">Motivo</span>
                <span className="mdm-value">{movimiento.motivo}</span>
              </div>
            )}
            {movimiento.observaciones && (
              <div className="mdm-item mdm-span-2">
                <span className="mdm-label">Observaciones</span>
                <span className="mdm-value">{movimiento.observaciones}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mdm-footer">
          <button className="mdm-btn mdm-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleMovimiento;