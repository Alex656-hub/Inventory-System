# Guía de Importación de Ventas

## Descripción

El sistema permite importar ventas desde archivos Excel (.xlsx, .xls) para automatizar la creación de salidas de inventario y productos.

## Columnas Requeridas

El archivo Excel debe contener las siguientes columnas (exactamente con estos nombres):

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| fecha | Fecha de la venta | 15/01/2024 |
| sku | Código único del producto | PROD-001 |
| nombre producto | Nombre descriptivo del producto | Laptop HP 15" |
| cantidad vendida | Cantidad de unidades vendidas | 5 |
| precio venta unitario | Precio de venta por unidad | 1200.50 |
| costo unitario | Costo por unidad | 800.00 |
| categoria | Nombre de la categoría | Electrónicos |
| proveedor | Nombre del proveedor | HP Inc. |

## Funcionalidades

### ✅ Creación Automática

- **Categorías**: Se crean automáticamente si no existen
- **Proveedores**: Se crean automáticamente si no existen
- **Productos**: Se crean automáticamente si no existen (basados en SKU)
- **Salidas de Inventario**: Se crea una salida por día con todos los productos vendidos

### 🔐 Seguridad

- **Solo gerentes**: La importación está restringida a usuarios con rol 'gerente'
- **Autenticación requerida**: Se debe iniciar sesión para acceder a la función
- **Validación de archivos**: Solo se aceptan archivos Excel (.xlsx, .xls)

### ⚠️ Proveedores con RUC Temporal

Cuando se importan proveedores nuevos, el sistema les asigna un RUC temporal con el formato:
```
TEMP-1705123456789-abc123
```

**¿Qué hacer?**
1. **Importa el archivo** normalmente
2. **Revisa el resultado**: El sistema mostrará una advertencia con los proveedores afectados
3. **Edita los proveedores**: Ve a "Proveedores" y actualiza el RUC/DNI real
4. **Importancia**: Mantener datos fiscales correctos es crucial para facturación y reportes

### 📊 Resultados de Importación

El sistema muestra un resumen detallado:

- **Filas procesadas**: Total de filas leídas del Excel
- **Nuevas categorías**: Categorías creadas automáticamente
- **Nuevos proveedores**: Proveedores creados (incluyendo los de RUC temporal)
- **Nuevos productos**: Productos creados automáticamente
- **Nuevas salidas**: Salidas de inventario generadas
- **Errores**: Lista de problemas encontrados (si los hay)

### 🔄 Flujo de Trabajo

1. **Preparar el Excel** con las columnas requeridas
2. **Iniciar sesión** como gerente
3. **Ir a Importar Excel** en el menú lateral
4. **Seleccionar el archivo** y hacer clic en "Importar"
5. **Revisar los resultados** y tomar nota de las acciones requeridas
6. **Editar proveedores** si es necesario (para RUC temporal)

### 💡 Mejoras Futuras

- **Columna RUC opcional**: Permitir incluir RUC en el Excel para evitar temporales
- **Validación previa**: Mostrar vista previa de los datos antes de importar
- **Plantilla descargable**: Ofrecer una plantilla Excel preformateada

## Errores Comunes

| Error | Causa | Solución |
|--------|---------|-----------|
| "Faltan columnas" | El Excel no tiene todas las columnas requeridas | Verificar nombres exactos de columnas |
| "Fecha inválida" | Formato de fecha incorrecto | Usar formato DD/MM/YYYY o YYYY-MM-DD |
| "Cantidad o precio inválido" | Valores numéricos incorrectos | Verificar que no haya texto ni valores negativos |
| "Archivo vacío" | Excel sin datos | Asegurarse de tener filas con datos |

## Soporte

Para problemas técnicos o dudas sobre la importación:

1. **Verificar el formato** del archivo Excel
2. **Revisar los errores** mostrados en el resultado
3. **Contactar al administrador** si el problema persiste

---

**Nota**: Esta función está diseñada para agilizar la carga masiva de datos, pero siempre se recomienda hacer una copia de seguridad antes de importar grandes volúmenes de información.
