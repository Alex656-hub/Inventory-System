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
      <h1>Importar datos desde Excel</h1>

      <div className="import-instructions">
        <p>El archivo Excel debe contener las siguientes columnas:</p>
        <div className="import-columns-grid">
          <div className="import-col-group">
            <h4>Requeridas siempre</h4>
            <ul>
              <li><code>factura</code> — Número de factura/ticket</li>
              <li><code>fecha</code> — Fecha de la operación</li>
              <li><code>operacion</code> — <strong>compra</strong> o <strong>venta</strong></li>
              <li><code>categoria</code> — Se crea si no existe</li>
              <li><code>producto</code> — Nombre del producto</li>
              <li><code>sku</code> — Código único del producto</li>
              <li><code>unidad</code> — Unidad de medida</li>
              <li><code>cantidad</code> — Cantidad</li>
              <li><code>precio unitario</code> — Precio de compra o venta</li>
            </ul>
          </div>
          <div className="import-col-group">
            <h4>Para compras</h4>
            <ul>
              <li><code>proveedor</code> — Se crea si no existe</li>
              <li><code>costo unitario</code> — Costo del producto</li>
              <li><code>sede</code> — Destino de la compra</li>
              <li><code>almacen</code> — Almacén destino (puede ir junto con sede)</li>
            </ul>
            <h4>Para ventas</h4>
            <ul>
              <li><code>cliente</code> — Se crea si no existe</li>
            </ul>
            <h4>Opcionales</h4>
            <ul>
              <li><code>telefono_personal</code></li>
              <li><code>telefono_cliente</code></li>
            </ul>
          </div>
        </div>
        <p className="import-note">
          <strong>Nota:</strong> Las categorías, proveedores, unidades, sedes, almacenes, productos, clientes y personal se crean automáticamente si no existen.
          El stock se calcula: compras - ventas.
        </p>
      </div>

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

          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">Filas procesadas</span>
              <span className="result-value">{result.filasProcesadas}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Entradas creadas</span>
              <span className="result-value">{result.nuevasEntradas}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Salidas creadas</span>
              <span className="result-value">{result.nuevasSalidas}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Categorías nuevas</span>
              <span className="result-value">{result.nuevasCategorias}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Proveedores nuevos</span>
              <span className="result-value">{result.nuevosProveedores}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Productos nuevos</span>
              <span className="result-value">{result.nuevosProductos}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Unidades nuevas</span>
              <span className="result-value">{result.nuevasUnidades}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Sedes nuevas</span>
              <span className="result-value">{result.nuevasSedes}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Almacenes nuevos</span>
              <span className="result-value">{result.nuevosAlmacenes}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Clientes nuevos</span>
              <span className="result-value">{result.nuevosClientes}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Personal nuevo</span>
              <span className="result-value">{result.nuevoPersonal}</span>
            </div>
          </div>

          {result.advertencias && result.advertencias.length > 0 && (
            <div className="import-warning">
              <h4>Advertencias</h4>
              <ul>
                {result.advertencias.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errores && result.errores.length > 0 && (
            <div className="import-errors">
              <h4>Errores ({result.errores.length})</h4>
              <ul>
                {result.errores.slice(0, 15).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errores.length > 15 && (
                  <li>... y {result.errores.length - 15} más</li>
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
