# Guía de Usuario - Sistema de Inventario CREDISA

> **Todo lo que necesitas saber para poner a funcionar el sistema en tu PC, explicado paso a paso y sin tecnicismos.**

---

## 📦 ¿Qué tengo en mis manos?

Recibiste un archivo **`.zip`** (como una maleta comprimida). Dentro vienen:
- El sistema completo (programa + base de datos)
- Un script de arranque (`iniciar-sistema.bat`)
- Un script de apagado (`detener-sistema.bat`)
- Esta guía

**No necesitas instalar Node.js, PostgreSQL, ni nada de código.** Solo necesitas **Docker Desktop** (te explicamos cómo).

---

## ✅ 1. Requisitos Mínimos

| Qué necesitas | Detalle |
|--------------|---------|
| **Windows 10 u 11** (64 bits) | Cualquier edición (Home, Pro, Enterprise) |
| **4 GB de RAM libres** | 8 GB recomendados |
| **5 GB de espacio en disco** | Para Docker y las imágenes |
| **Virtualización activada en BIOS** | Ver siguiente sección |

---

## ⚙️ 2. Preparar Windows para Docker (¡Paso Obligatorio!)

Docker necesita que Windows tenga la **virtualización activada**. Muchas PCs la traen apagada de fábrica.

### 2.1 Verificar si ya está lista
1. Presiona `Tecla Windows` + `X` → **Terminal (Admin)** o **PowerShell (Admin)**
2. Escribe y entra:
   ```powershell
   wsl --status
   ```
3. **Si ves** `Versión de WSL: 2` y `Estado: En ejecución` → **¡Ya está listo!** Salta a **Sección 3**.
4. **Si da error** o dice "Virtualización no detectada" → Sigue al **2.2**.

### 2.2 Activar virtualización (3 comandos + reinicio)
En la **misma ventana PowerShell (Admin)**, copia y pega **una línea a la vez**:

```powershell
dism /online /enable-feature /featurename:Microsoft-Hyper-V /all /norestart
```

```powershell
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

```powershell
wsl --install
```

> **¿Qué pasa aquí?**
> - No estás "cambiando Windows por Linux".
> - Solo estás encendiendo un interruptor interno para que Docker pueda crear contenedores ligeros.
> - Windows sigue siendo Windows.

### 2.3 Reiniciar el equipo (¡OBLIGATORIO!)
- Reinicia **ahora mismo**.
- Al encender, puede aparecer una ventana negra pidiendo **usuario y contraseña para Ubuntu**.
  - Inventa uno (ej: `usuario` / `123456`).
  - Es solo la primera vez.
- Cuando veas el escritorio de Windows, **ya está**.

---

## 🐳 3. Instalar Docker Desktop

1. Ve a: **https://www.docker.com/products/docker-desktop/**
2. Descarga **"Docker Desktop for Windows"**
3. Ejecuta el instalador → **Siguiente → Siguiente → Finalizar**
4. Si pide reiniciar → **Reinicia**
5. Abre Docker Desktop (icono de **ballena 🐳** en la bandeja del reloj)
6. Acepta los términos ("Accept") → Espera a que diga **"Docker Desktop is running"**

> ✅ **Listo.** El icono de la ballena debe estar quieto (no animado) en la bandeja del sistema.

---

## 📂 4. Extraer el ZIP

1. Ubica el archivo `Sistema-Inventario-CREDISA-YYYYMMDD.zip` (o similar)
2. **Click derecho** → **Extraer aquí** (o "Extraer todo...")
3. Se creará una carpeta con el mismo nombre. **Ahí es donde trabajarás.**
   - Ejemplo: `C:\Sistema-Inventario-CREDISA\`

> 💡 **Tip:** No muevas los archivos sueltos. Trabaja **dentro de esa carpeta**.

---

## 🚀 5. Iniciar el Sistema

1. Entra a la carpeta extraída
2. Busca **`iniciar-sistema.bat`**
3. **Doble click** (si pide permisos de administrador → Sí)
4. Verás una ventana con esto:

```
========================================
  INICIANDO SISTEMA DE INVENTARIO CREDISA
========================================

[1/3] Levantando contenedores...
[2/3] Esperando a que los servicios estén listos...
    (Esto puede tardar 10-30 segundos la primera vez)
    Intento 1/60 - Verificando API... OK!
[3/3] API lista. Abriendo navegador...

========================================
  SISTEMA INICIADO CORRECTAMENTE
========================================

URL: http://localhost
Usuario: gerente
Contraseña: gerente123
```

5. **El navegador se abre solo** en `http://localhost`

> ⏱ **Primera vez:** Tarda 1-2 minutos (descarga imágenes).
> **Siguientes veces:** 15-30 segundos.

---

## 🔐 6. Iniciar Sesión

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| **Gerente** (todo acceso) | `gerente` | `gerente123` |
| **Empleado** (limitado) | `empleado` | `empleado123` |

> 🔒 **Importante:** Cambia las contraseñas en **Ajustes → Usuarios y Accesos** apenas entres.

---

## 🛑 7. Apagar el Sistema

Cuando termines de trabajar:

1. **Doble click en `detener-sistema.bat`**
2. Verás: `Sistema detenido. Los datos de la base de datos se conservan.`
3. Pulsa **Enter** para cerrar la ventana

> ✅ **Tus datos NO se borran.** La base de datos vive en un volumen de Docker y sobrevive a apagados, reinicios y actualizaciones.

---

## 🔁 8. Uso Diario (Resumen Rápido)

| Qué quieres hacer | Acción |
|-------------------|--------|
| Abrir el sistema | Doble click `iniciar-sistema.bat` |
| Cerrar el sistema | Doble click `detener-sistema.bat` |
| Ver datos guardados | Están automáticamente ahí al volver a abrir |

---

## 📥 9. Importar Ventas desde Excel

El sistema permite cargar ventas masivamente desde un archivo Excel. **Solo usuarios con rol "gerente"** pueden usar esta función.

### 9.1 Preparar el Archivo Excel

El Excel debe tener **exactamente estas columnas** (nombres iguales, sin espacios extra):

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `fecha` | Fecha de la venta | `15/01/2024` |
| `sku` | Código único del producto | `PROD-001` |
| `nombre producto` | Nombre del producto | `Laptop HP 15"` |
| `cantidad vendida` | Unidades vendidas | `5` |
| `precio venta unitario` | Precio por unidad | `1200.50` |
| `costo unitario` | Costo por unidad | `800.00` |
| `categoria` | Categoría del producto | `Electrónicos` |
| `proveedor` | Nombre del proveedor | `HP Inc.` |

> 💡 **Tip:** Los formatos de fecha aceptados: `DD/MM/YYYY` o `YYYY-MM-DD`.

### 9.2 Qué hace el sistema automáticamente

- ✅ **Crea categorías** nuevas si no existen
- ✅ **Crea proveedores** nuevos si no existen
- ✅ **Crea productos** nuevos basándose en el SKU
- ✅ **Genera salidas de inventario** (una por día con todos los productos vendidos)

### 9.3 Importante: Proveedores con RUC Temporal

Cuando se importan proveedores nuevos, el sistema les asigna un **RUC temporal**:
```
TEMP-1705123456789-abc123
```

**Pasos después de importar:**
1. El sistema te avisará qué proveedores quedaron con RUC temporal
2. Ve a **Proveedores** en el menú lateral
3. Edita cada uno y pon el **RUC/DNI real**
4. Es clave para facturación y reportes correctos

### 9.4 Pasos para Importar

1. Inicia sesión como **gerente**
2. En el menú lateral → **Importar Excel**
3. Click en **"Seleccionar archivo"** → elige tu `.xlsx` o `.xls`
4. Click en **"Importar"**
5. Revisa el **resumen de resultados**:
   - Filas procesadas
   - Nuevas categorías / proveedores / productos / salidas
   - **Errores** (si los hay)

### 9.5 Errores Comunes al Importar

| Error | Causa | Solución |
|-------|-------|----------|
| `"Faltan columnas"` | Nombres de columna distintos o faltantes | Verifica nombres exactos (ver tabla 9.1) |
| `"Fecha inválida"` | Formato de fecha incorrecto | Usa `DD/MM/YYYY` o `YYYY-MM-DD` |
| `"Cantidad o precio inválido"` | Texto en campos numéricos o negativos | Solo números positivos |
| `"Archivo vacío"` | Excel sin filas de datos | Agrega al menos una fila de venta |

---

## 🆘 11. Problemas Comunes y Soluciones

| Problema | Qué hacer |
|----------|-----------|
| **"Virtualization support not detected"** al abrir Docker | Ve a **Sección 2.2** (los 3 comandos + reinicio) |
| **Puerto 80 ocupado** (error al iniciar) | Cierra Skype, Teams, IIS, u otro programa que use puerto 80. O reinicia la PC. |
| **La página no carga** / "No se puede acceder a este sitio" | 1. Verifica que la ballena 🐳 esté quieta en la bandeja.<br>2. Espera 30 seg más (backend terminando de arrancar).<br>3. Ejecuta `detener-sistema.bat` y vuelve a `iniciar-sistema.bat`. |
| **Error al iniciar sesión** (credenciales correctas) | Espera un poco más. El backend a veces tarda unos segundos extra en aceptar conexiones. |
| **Olvidé la contraseña** | Contacta al administrador del sistema (quien te entregó el ZIP). |
| **Docker dice "WSL 2 installation is incomplete"** | Ejecuta en PowerShell Admin: `wsl --update` y reinicia. |

---

## ❓ 12. Preguntas Frecuentes

**¿Necesito instalar Node.js, Python, PostgreSQL u otra cosa?**
> **No.** Todo viene dentro de los contenedores de Docker.

**¿Mis datos se pierden si apago la PC?**
> **No.** La base de datos persiste en un volumen de Docker.

**¿Puedo usarlo sin internet?**
> **Sí.** Una vez hecho el primer arranque (que descarga imágenes), todo funciona 100% local.

**¿Esto instala Linux en mi PC?**
> **No.** Docker usa una tecnología ligera llamada "contenedores". Tu Windows sigue intacto.

**¿Puedo mover la carpeta a otro disco/ubicación?**
> **Sí.** Mientras muevas **toda la carpeta** junta, funciona igual.

**¿Cómo actualizo el sistema?**
> Te entregarán un nuevo ZIP. Extrae en otra carpeta, copia tu `.env.docker` si lo modificaste, y usa el nuevo `iniciar-sistema.bat`.

---

## 📞 Soporte

Si nada de lo anterior funciona:
1. Ejecuta `detener-sistema.bat`
2. Reinicia la PC
3. Vuelve a `iniciar-sistema.bat`
4. Si persiste, contacta a quien te entregó el sistema con:
   - Qué error sale exactamente (foto o texto)
   - Qué Windows tienes (Win+R → `winver`)

---

## 📄 Licencia y Créditos

Sistema de Inventario CREDISA — Uso interno autorizado.  
Desarrollado por el equipo de sistemas.

---

> **Última actualización:** Agosto 2026  
> **Versión del sistema:** Ver `package.json` en `backend/` y `frontend/`