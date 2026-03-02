import React, { useState, useEffect } from 'react';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { supplierService } from '../services/supplier.service';
import { Producto, Categoria, Proveedor } from '../types';
import './ProductForm.css';

interface ProductFormProps {
  producto?: Producto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ producto, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    proveedor_id: '',
    precio_compra: '',
    precio_venta: '',
    stock_actual: '0',
    stock_minimo: '0',
    ubicacion: ''
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarDatos();
    if (producto) {
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        categoria_id: producto.categoria_id?.toString() || '',
        proveedor_id: producto.proveedor_id?.toString() || '',
        precio_compra: producto.precio_compra?.toString() || '',
        precio_venta: producto.precio_venta?.toString() || '',
        stock_actual: producto.stock_actual?.toString() || '0',
        stock_minimo: producto.stock_minimo?.toString() || '0',
        ubicacion: producto.ubicacion || ''
      });
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
      const [catsRes, provRes] = await Promise.all([
        categoryService.obtenerCategorias(true),
        supplierService.obtenerProveedores({ activo: true, limite: 1000 })
      ]);
      setCategorias(catsRes.categorias);
      setProveedores(provRes.proveedores);
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
    if (!formData.proveedor_id) {
      newErrors.proveedor_id = 'El proveedor es requerido';
    }
    if (!formData.precio_compra || Number(formData.precio_compra) <= 0) {
      newErrors.precio_compra = 'El precio de compra debe ser mayor a 0';
    }
    if (!formData.precio_venta || Number(formData.precio_venta) <= 0) {
      newErrors.precio_venta = 'El precio de venta debe ser mayor a 0';
    }
    if (Number(formData.stock_actual) < 0) {
      newErrors.stock_actual = 'El stock no puede ser negativo';
    }
    if (Number(formData.stock_minimo) < 0) {
      newErrors.stock_minimo = 'El stock mínimo no puede ser negativo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const productoData = {
        ...formData,
        categoria_id: Number(formData.categoria_id),
        proveedor_id: Number(formData.proveedor_id),
        precio_compra: Number(formData.precio_compra),
        precio_venta: Number(formData.precio_venta),
        stock_actual: Number(formData.stock_actual),
        stock_minimo: Number(formData.stock_minimo)
      };

      if (producto) {
        await productService.actualizarProducto(producto.id, productoData);
      } else {
        await productService.crearProducto(productoData);
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
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="categoria_id">Categoría *</label>
          <select
            id="categoria_id"
            name="categoria_id"
            value={formData.categoria_id}
            onChange={handleChange}
            className={errors.categoria_id ? 'error' : ''}
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          {errors.categoria_id && <span className="error-message">{errors.categoria_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="proveedor_id">Proveedor *</label>
          <select
            id="proveedor_id"
            name="proveedor_id"
            value={formData.proveedor_id}
            onChange={handleChange}
            className={errors.proveedor_id ? 'error' : ''}
          >
            <option value="">Seleccionar proveedor</option>
            {proveedores.map(prov => (
              <option key={prov.id} value={prov.id}>{prov.nombre}</option>
            ))}
          </select>
          {errors.proveedor_id && <span className="error-message">{errors.proveedor_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="codigo">Código *</label>
          <input
            type="text"
            id="codigo"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            className={errors.codigo ? 'error' : ''}
            disabled={!producto}
          />
          {errors.codigo && <span className="error-message">{errors.codigo}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Nombre *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={errors.nombre ? 'error' : ''}
          />
          {errors.nombre && <span className="error-message">{errors.nombre}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="precio_compra">Precio Compra (S/) *</label>
          <input
            type="number"
            id="precio_compra"
            name="precio_compra"
            value={formData.precio_compra}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={errors.precio_compra ? 'error' : ''}
          />
          {errors.precio_compra && <span className="error-message">{errors.precio_compra}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="precio_venta">Precio Venta (S/) *</label>
          <input
            type="number"
            id="precio_venta"
            name="precio_venta"
            value={formData.precio_venta}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={errors.precio_venta ? 'error' : ''}
          />
          {errors.precio_venta && <span className="error-message">{errors.precio_venta}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="stock_actual">Stock Actual</label>
          <input
            type="number"
            id="stock_actual"
            name="stock_actual"
            value={formData.stock_actual}
            onChange={handleChange}
            min="0"
            className={errors.stock_actual ? 'error' : ''}
          />
          {errors.stock_actual && <span className="error-message">{errors.stock_actual}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="stock_minimo">Stock Mínimo</label>
          <input
            type="number"
            id="stock_minimo"
            name="stock_minimo"
            value={formData.stock_minimo}
            onChange={handleChange}
            min="0"
            className={errors.stock_minimo ? 'error' : ''}
          />
          {errors.stock_minimo && <span className="error-message">{errors.stock_minimo}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="ubicacion">Ubicación Opcional*</label>
          <input
            type="text"
            id="ubicacion"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
