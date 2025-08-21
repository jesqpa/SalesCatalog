# Cartera de Productos

Una aplicación web completa para gestionar una cartera de productos con backend Node.js y frontend con jQuery y Tailwind CSS.

## Características

- ✅ **Backend Node.js** con Express
- ✅ **API REST** completa (CRUD)
- ✅ **Almacenamiento** en archivos JSON
- ✅ **Frontend** responsive con jQuery y Tailwind CSS
- ✅ **Interfaz intuitiva** con modales y notificaciones
- ✅ **Búsqueda y filtrado** de productos
- ✅ **Validaciones** del lado cliente y servidor

## Funcionalidades

### Gestión de Productos
- **Crear** nuevos productos
- **Leer** lista completa de productos
- **Actualizar** productos existentes
- **Eliminar** productos (con confirmación)

### Características del Producto
- Nombre (obligatorio)
- Descripción
- Precio (obligatorio)
- Categoría
- Stock
- **Imagen** (opcional, hasta 5MB)
- Fechas de creación y modificación automáticas

### Interfaz de Usuario
- Diseño responsive con Tailwind CSS
- Búsqueda en tiempo real por nombre
- Filtrado por categoría
- Modales para agregar/editar productos
- **Subida y gestión de imágenes** con preview
- **Validación de archivos** (tipo y tamaño)
- Confirmación antes de eliminar
- Notificaciones toast para feedback
- Iconos con Font Awesome

## Instalación y Uso

### Requisitos Previos
- Node.js (versión 14 o superior)
- npm

### Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```

3. **Iniciar el servidor en modo producción:**
   ```bash
   npm start
   ```

4. **Abrir la aplicación:**
   - Navegar a `http://localhost:3000`

### Estructura del Proyecto

```
prodcat/
├── server.js              # Servidor Express principal
├── package.json           # Configuración y dependencias
├── data/
│   └── productos.json     # Almacenamiento de datos
├── public/
│   ├── index.html         # Página principal
│   ├── js/
│   │   └── app.js         # Lógica del frontend con jQuery
│   └── uploads/           # Directorio para imágenes subidas
└── README.md              # Este archivo
```

## API Endpoints

### GET /api/productos
Obtiene todos los productos.

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Producto 1",
    "descripcion": "Descripción del producto",
    "precio": 99.99,
    "categoria": "Categoría",
    "stock": 10,
    "fechaCreacion": "2025-08-21T10:00:00.000Z"
  }
]
```

### GET /api/productos/:id
Obtiene un producto específico por ID.

### POST /api/productos
Crea un nuevo producto.

**Body:**
```json
{
  "nombre": "Nuevo Producto",
  "descripcion": "Descripción opcional",
  "precio": 99.99,
  "categoria": "Categoría",
  "stock": 10,
  "imagen": "archivo_de_imagen" // FormData para subida de archivos
}
```

**Nota:** Para crear/actualizar productos con imagen, usar `Content-Type: multipart/form-data`

### PUT /api/productos/:id
Actualiza un producto existente.

### DELETE /api/productos/:id
Elimina un producto por ID.

## Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Multer** - Manejo de subida de archivos
- **CORS** - Manejo de cross-origin requests
- **Body-parser** - Parsing de request bodies

### Frontend
- **jQuery** - Manipulación del DOM y AJAX
- **Tailwind CSS** - Framework de estilos
- **Font Awesome** - Iconos

### Almacenamiento
- **Archivos JSON** - Persistencia simple sin base de datos

## Características Técnicas

- **API RESTful** siguiendo convenciones estándar
- **Validaciones** tanto en frontend como backend
- **Manejo de errores** robusto
- **Responsive design** para dispositivos móviles
- **Código modular** y bien documentado
- **Sin base de datos** - ideal para proyectos pequeños

## Funcionalidades de Imagen

### Subida de Imágenes
- **Formatos soportados:** JPEG, PNG, GIF, WebP
- **Tamaño máximo:** 5MB por imagen
- **Preview en tiempo real** al seleccionar archivo
- **Validación automática** de tipo y tamaño

### Gestión de Imágenes
- **Cambiar imagen:** Reemplazar imagen existente
- **Eliminar imagen:** Quitar imagen del producto
- **Preview automático:** Vista previa antes de guardar
- **Almacenamiento local:** Imágenes guardadas en `/public/uploads/`

## Uso de la Aplicación

1. **Agregar Producto:** Clic en "Agregar Producto" para abrir el modal
2. **Editar Producto:** Clic en "Editar" en cualquier tarjeta de producto
3. **Eliminar Producto:** Clic en "Eliminar" y confirmar la acción
4. **Buscar:** Usar el campo de búsqueda para filtrar por nombre
5. **Filtrar:** Seleccionar una categoría en el dropdown
6. **Limpiar Filtros:** Clic en "Limpiar" para resetear búsqueda y filtros

## Desarrollo

Para desarrollo local con recarga automática:

```bash
npm run dev
```

Esto usa `nodemon` para reiniciar automáticamente el servidor cuando se detectan cambios.

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
