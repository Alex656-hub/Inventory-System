import React, { useState, useEffect } from 'react';
import './ModalKardexPDF.css';
import { reporteService } from '../services/reporte.service';
import api from '../config/api';

interface Sede {
  id: number;
  nombre: string;
}

interface Almacen {
  id: number;
  nombre: string;
}

interface ModalInventarioExcelProps {
  onClose: () => void;
}

const ModalInventarioExcel: React.FC<ModalInventarioExcelProps> = ({ onClose }) => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [selectedSede, setSelectedSede] = useState<number | ''>('');
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarSedes();
  }, []);

  const cargarSedes = async () => {
    try {
      const response = await api.get('/sedes');
      const data = response.data.sedes || response.data;
      setSedes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar sedes:', error);
    }
  };

  const handleSedeChange = async (sedeId: number | '') => {
    setSelectedSede(sedeId);
    setSelectedAlmacen('');

    if (sedeId) {
      try {
        const response = await api.get(`/almacenes?sede_id=${sedeId}`);
        const data = response.data.almacenes || response.data;
        setAlmacenes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar almacenes:', error);
        setAlmacenes([]);
      }
    } else {
      setAlmacenes([]);
    }
  };

  const handleExportar = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSede) params.sede_id = selectedSede;
      if (selectedAlmacen) params.almacen_id = selectedAlmacen;

      const blob = await reporteService.generarInventarioExcel(params);
      const sufijo = selectedSede ? `_sede_${selectedSede}` : '';
      const filename = `inventario${sufijo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      reporteService.descargarBlob(blob, filename);
      onClose();
    } catch (error) {
      console.error('Error al exportar inventario:', error);
      alert('Error al exportar el reporte de inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-kardex-overlay" onClick={onClose}>
      <div className="modal-kardex-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-kardex-header">
          <h3>Exportar Reporte de Inventario (Excel)</h3>
          <button className="modal-kardex-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-kardex-body">
          <div className="mk-form-group">
            <label>Sede</label>
            <div className="mk-input-wrapper">
              <select
                value={selectedSede}
                onChange={(e) => handleSedeChange(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Todas las sedes</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mk-form-group">
            <label>Almacén</label>
            <div className="mk-input-wrapper">
              <select
                value={selectedAlmacen}
                onChange={(e) => setSelectedAlmacen(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedSede}
              >
                <option value="">Todos los almacenes</option>
                {almacenes.map(alm => (
                  <option key={alm.id} value={alm.id}>{alm.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-kardex-footer">
          <button className="mk-btn mk-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="mk-btn mk-btn-download"
            onClick={handleExportar}
            disabled={loading}
          >
            {loading ? 'Exportando...' : 'Exportar Excel'} 📊
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInventarioExcel;