import React, { useState } from 'react';
import { importService, ImportResult } from '../services/import.service';
import './ImportSales.css';

const ImportSales: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && ['.xlsx', '.xls'].some(ext => f.name.toLowerCase().endsWith(ext))) {
      setFile(f);
      setResult(null);
      setError(null);
    } else {
      setFile(null);
      setError('Solo archivos Excel (.xlsx, .xls)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const res = await importService.importSales(file);
      if (res.success && res.data) {
        setResult(res.data);
        setFile(null);
        // Resetear el input para permitir seleccionar el mismo archivo nuevamente
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError(res.message || 'Error al importar');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-sales">
      <h1>Importar ventas desde Excel</h1>
      <p className="import-instructions">
        El archivo debe tener las columnas: fecha, sku, nombre producto, cantidad vendida,
        precio venta unitario, costo unitario, categoria, proveedor
      </p>
      
      <form onSubmit={handleSubmit} className="import-form">
        <div className="form-group">
          <label htmlFor="file">Seleccionar archivo Excel</label>
          <input
            type="file"
            id="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={!file || loading} className="btn-primary">
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="import-result success">
          <h3>Importación completada</h3>
          <ul>
            <li>Filas procesadas: {result.filasProcesadas}</li>
            <li>Nuevas categorías: {result.nuevasCategorias}</li>
            <li>Nuevos proveedores: {result.nuevosProveedores}</li>
            <li>Nuevos productos: {result.nuevosProductos}</li>
            <li>Nuevas salidas creadas: {result.nuevasSalidas}</li>
          </ul>
          
          {result.proveedoresConRUCTemporal && result.proveedoresConRUCTemporal.length > 0 && (
            <div className="import-warning">
              <h4>⚠️ Acción requerida: Proveedores con RUC temporal</h4>
              <p>Los siguientes proveedores se crearon con RUC temporal y deben ser completados:</p>
              <ul>
                {result.proveedoresConRUCTemporal.map((proveedor, i) => (
                  <li key={i}>
                    <strong>{proveedor}</strong> - 
                    <a href="/proveedores" className="edit-link">Editar ahora</a>
                  </li>
                ))}
              </ul>
              <p className="warning-note">
                Nota: Es importante actualizar el RUC/DNI para mantener la integridad de los datos fiscales.
              </p>
            </div>
          )}
          
          {result.errores && result.errores.length > 0 && (
            <div className="import-errors">
              <h4>Errores ({result.errores.length}):</h4>
              <ul>
                {result.errores.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errores.length > 10 && (
                  <li>... y {result.errores.length - 10} más</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportSales;
