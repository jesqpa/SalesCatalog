# Cartera de Productos

Una aplicación web completa para gestionar una cartera de productos con backend Node.js y frontend con jQuery y Tailwind CSS.

## Características

- ✅ **Backend Node.js** con Express
- ✅ **API REST** completa (CRUD)
- ✅ **Almacenamiento** en archivos JSON
- ✅ **Frontend** responsive con jQuery y Tailwind CSS
- ✅ **Sistema de autenticación** con JWT
- ✅ **Encriptación de contraseñas** con bcrypt
- ✅ **Gestión de usuarios** con UUID
- ✅ **Roles y permisos** (administrador)
- ✅ **Interfaz intuitiva** con modales y notificaciones
- ✅ **Búsqueda y filtrado** de productos
- ✅ **Soporte de imágenes** completo
- ✅ **Validaciones** del lado cliente y servidor

## Funcionalidades

### Sistema de Autenticación
- **Registro** de administradores
- **Login/Logout** con JWT tokens
- **Contraseñas encriptadas** con bcrypt
- **Cambio de contraseña** seguro
- **Gestión de sesiones** persistentes
- **Roles y permisos** por usuario

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

2. **Crear usuario administrador inicial:**
   ```bash
   npm run crear-admin
   ```
   Esto creará un administrador con:
   - **Email:** admin@prodcat.com
   - **Contraseña:** admin123

3. **Iniciar el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```

4. **Iniciar el servidor en modo producción:**
   ```bash
   npm start
   ```

5. **Abrir la aplicación:**
   - Navegar a `http://localhost:3000`
   - Usar las credenciales del administrador para acceder

### Estructura del Proyecto

```
prodcat/
├── server.js              # Servidor Express principal
├── crear-admin.js         # Script para crear administradores
├── package.json           # Configuración y dependencias
├── .env.example           # Ejemplo de variables de entorno
├── data/
│   ├── productos.json     # Almacenamiento de productos
│   └── users/             # Directorio de usuarios (UUID.json)
├── public/
│   ├── index.html         # Página principal (protegida)
│   ├── login.html         # Página de autenticación
│   ├── js/
│   │   ├── app.js         # Lógica del frontend con jQuery
│   │   └── auth.js        # Lógica de autenticación
│   └── uploads/           # Directorio para imágenes subidas
└── README.md              # Este archivo
```

## API Endpoints

### Autenticación

#### POST /api/auth/register
Registra un nuevo administrador.

**Body:**
```json
{
  "nombre": "Nombre Completo",
  "email": "admin@ejemplo.com",
  "password": "contraseña123"
}
```

#### POST /api/auth/login
Inicia sesión y obtiene token JWT.

**Body:**
```json
{
  "email": "admin@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta:**
```json
{
  "mensaje": "Inicio de sesión exitoso",
  "token": "jwt_token_aqui",
  "usuario": {
    "id": "uuid-del-usuario",
    "email": "admin@ejemplo.com",
    "nombre": "Nombre Completo",
    "rol": "administrador"
  }
}
```

#### GET /api/auth/perfil
Obtiene el perfil del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/auth/logout
Cierra la sesión actual.

#### PUT /api/auth/cambiar-password
Cambia la contraseña del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "passwordActual": "contraseña_actual",
  "passwordNueva": "nueva_contraseña"
}
```

### Productos (Requieren autenticación)

**Nota:** Todos los endpoints de productos requieren el header:
`Authorization: Bearer <token>`

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

### Primer Acceso
1. **Ejecutar** `npm run crear-admin` para crear usuario inicial
2. **Acceder** a `http://localhost:3000`
3. **Iniciar sesión** con:
   - Email: admin@prodcat.com
   - Contraseña: admin123

### Gestión de Productos
1. **Agregar Producto:** Clic en "Agregar Producto" para abrir el modal
2. **Subir Imagen:** Seleccionar archivo (opcional, máx 5MB)
3. **Editar Producto:** Clic en "Editar" en cualquier tarjeta de producto
4. **Eliminar Producto:** Clic en "Eliminar" y confirmar la acción
5. **Buscar:** Usar el campo de búsqueda para filtrar por nombre
6. **Filtrar:** Seleccionar una categoría en el dropdown
7. **Limpiar Filtros:** Clic en "Limpiar" para resetear búsqueda y filtros

### Gestión de Sesión
- **Cerrar Sesión:** Clic en "Cerrar Sesión" en el header
- **Cambiar Contraseña:** Clic en "Cambiar Contraseña" en el header
- **Registro:** Crear nuevos administradores desde la página de login
- **Sesión Persistente:** Opción "Recordarme" mantiene la sesión activa

### Cambio de Contraseña
1. **Acceder:** Clic en "Cambiar Contraseña" en el header
2. **Validar:** Ingresar contraseña actual
3. **Nueva contraseña:** Mínimo 6 caracteres
4. **Confirmar:** Repetir nueva contraseña
5. **Indicador de fortaleza** visual en tiempo real

## Desarrollo

Para desarrollo local con recarga automática:

```bash
npm run dev
```

Esto usa `nodemon` para reiniciar automáticamente el servidor cuando se detectan cambios.

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
