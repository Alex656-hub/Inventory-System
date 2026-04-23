import React, { useState, useEffect } from 'react';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { unidadmedidaService } from '../services/unidadmedida.service';
import { Producto, Categoria, UnidadMedida } from '../types';
import './ProductForm.css';
import '../styles/formField.css';

interface ProductFormProps {
  producto?: Producto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ producto, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria_id: '',
    unidad_id: '',
    precio_compra: '',
    precio_venta: '',
    stock_minimo: '0'
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
    if (producto) {
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        categoria_id: producto.categoria_id?.toString() || '',
        unidad_id: producto.unidad_id?.toString() || '',
        precio_compra: producto.precio_compra?.toString() || '',
        precio_venta: producto.precio_venta?.toString() || '',
        stock_minimo: producto.stock_minimo?.toString() || '0'
      });
      setImagePreview(producto.imageUrl || null);
    }
  }, [producto]);

  useEffect(() => {
    if (!producto && formData.categoria_id) {
      productService.obtenerSiguienteCodigo(Number(formData.categoria_id)).then(data => {
        setFormData(prev => ({ ...prev, codigo: data.codigo }));
      }).catch(error => {
        console.error('Error generando código:', error);
      });
    }
  }, [formData.categoria_id, producto]);

  const cargarDatos = async () => {
    try {
      const [catsRes, unidadesRes] = await Promise.all([
        categoryService.obtenerCategorias(true),
        unidadmedidaService.obtenerUnidades(true)
      ]);
      setCategorias(catsRes.categorias);
      setUnidades(unidadesRes.unidades);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!formData.categoria_id) {
      newErrors.categoria_id = 'La categoría es requerida';
    }
    if (!formData.unidad_id) {
      newErrors.unidad_id = 'La unidad es requerida';
    }
    if (!formData.precio_compra || Number(formData.precio_compra) <= 0) {
      newErrors.precio_compra = 'Debe ser mayor a 0';
    }
    if (!formData.precio_venta || Number(formData.precio_venta) <= 0) {
      newErrors.precio_venta = 'Debe ser mayor a 0';
    }
    if (Number(formData.stock_minimo) < 0) {
      newErrors.stock_minimo = 'No puede ser negativo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const productoData = {
        ...formData,
        categoria_id: Number(formData.categoria_id),
        unidad_id: Number(formData.unidad_id),
        precio_compra: Number(formData.precio_compra),
        precio_venta: Number(formData.precio_venta),
        stock_minimo: Number(formData.stock_minimo)
      };
      if (producto) {
        await productService.actualizarProducto(producto.id, productoData as any, imageFile);
      } else {
        await productService.crearProducto(productoData as any, imageFile);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const mensaje = error.response?.data?.mensaje || 'Error al guardar el producto';
      alert(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectImage = (file: File | null) => {
    setImageFile(file);
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <form onSubmit={handleSubmit} className="mf-form product-modal-form">
      <div className="pmf-body">

        {/* Imagen */}
        <div className="pmf-image-box">
          {imagePreview ? (
            <img src={imagePreview} alt="Vista previa" className="pmf-image-preview" />
          ) : (
            <div className="pmf-image-placeholder">
              <i className="bx bx-upload" />
              <div className="pmf-image-placeholder-title">Cambiar</div>
              <div className="pmf-image-placeholder-subtitle">Subir foto</div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="pmf-file-input"
            onChange={(e) => handleSelectImage(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Nombre + Código */}
        <div className="pmf-fields">
          <div className="mf-group">
            <label htmlFor="nombre">Nombre del Producto <span className="mf-required">*</span></label>
            <div className="mf-field-wrap">
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Aspirina 500mg"
                className={`mf-field ${errors.nombre ? 'error' : ''}`}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {errors.nombre && <span className="mf-field-error">{errors.nombre}</span>}
          </div>

          <div className="mf-group">
            <label htmlFor="codigo">Código / SKU <span className="mf-required">*</span></label>
            <div className="mf-field-wrap">
              <input
                id="codigo"
                name="codigo"
                type="text"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ej: ELE001"
                className={`mf-field ${errors.codigo ? 'error' : ''}`}
                disabled={loading || !producto}
                autoComplete="off"
              />
            </div>
            {errors.codigo && <span className="mf-field-error">{errors.codigo}</span>}
          </div>
        </div>
      </div>

      {/* Categoría + Unidad */}
      <div className="pmf-row2">
        <div className="mf-group">
          <label htmlFor="categoria_id">Categoría <span className="mf-required">*</span></label>
          <div className="mf-field-wrap">
            <select
              id="categoria_id"
              name="categoria_id"
              value={formData.categoria_id}
              onChange={handleChange}
              className={`mf-select ${errors.categoria_id ? 'error' : ''}`}
              disabled={loading}
            >
              <option value="">Seleccionar...</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          {errors.categoria_id && <span className="mf-field-error">{errors.categoria_id}</span>}
        </div>

        <div className="mf-group">
          <label htmlFor="unidad_id">Unidad <span className="mf-required">*</span></label>
          <div className="mf-field-wrap">
            <select
              id="unidad_id"
              name="unidad_id"
              value={formData.unidad_id}
              onChange={handleChange}
              className={`mf-select ${errors.unidad_id ? 'error' : ''}`}
              disabled={loading}
            >
              <option value="">Seleccionar...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.abreviatura})
                </option>
              ))}
            </select>
          </div>
          {errors.unidad_id && <span className="mf-field-error">{errors.unidad_id}</span>}
        </div>
      </div>

      {/* Costo + Precio + Stock mínimo */}
      <div className="pmf-row3">
        <div className="mf-group">
          <label htmlFor="precio_compra">Costo Referencial (S/)</label>
          <div className="mf-field-wrap">
            <input
              id="precio_compra"
              name="precio_compra"
              type="number"
              value={formData.precio_compra}
              onChange={handleChange}
              className={`mf-field ${errors.precio_compra ? 'error' : ''}`}
              min="0"
              step="0.01"
              disabled={loading}
            />
          </div>
          {errors.precio_compra && <span className="mf-field-error">{errors.precio_compra}</span>}
        </div>

        <div className="mf-group">
          <label htmlFor="precio_venta">Precio Venta Base (S/)</label>
          <div className="mf-field-wrap">
            <input
              id="precio_venta"
              name="precio_venta"
              type="number"
              value={formData.precio_venta}
              onChange={handleChange}
              className={`mf-field ${errors.precio_venta ? 'error' : ''}`}
              min="0"
              step="0.01"
              disabled={loading}
            />
          </div>
          {errors.precio_venta && <span className="mf-field-error">{errors.precio_venta}</span>}
        </div>

        <div className="mf-group">
          <label htmlFor="stock_minimo">Stock Mínimo (Alerta)</label>
          <div className="mf-field-wrap">
            <input
              id="stock_minimo"
              name="stock_minimo"
              type="number"
              value={formData.stock_minimo}
              onChange={handleChange}
              className={`mf-field ${errors.stock_minimo ? 'error' : ''}`}
              min="0"
              disabled={loading}
            />
          </div>
          {errors.stock_minimo && <span className="mf-field-error">{errors.stock_minimo}</span>}
        </div>
      </div>

      {/* Acciones */}
      <div className="mf-actions">
        <button type="button" onClick={onClose} className="mf-btn mf-btn--ghost" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="mf-btn mf-btn--primary" disabled={loading}>
          {loading
            ? <><i className="bx bx-loader-alt bx-spin" /> Guardando...</>
            : 'Guardar Producto'
          }
        </button>
      </div>
    </form>
  );
};

export default ProductForm;