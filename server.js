const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Mutex para evitar operaciones concurrentes en el archivo
let archivoOcupado = false;
const esperarArchivo = async () => {
    while (archivoOcupado) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    archivoOcupado = true;
};
const liberarArchivo = () => {
    archivoOcupado = false;
};

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'productos.json');
const USERS_DIR = path.join(__dirname, 'data', 'users');
const CONFIG_FILE = path.join(__dirname, 'data', 'configuracion.json');
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_2025';

// Función auxiliar para reordenar imágenes
async function cambiarImagenFavorita(productoId, rutaImagenFavorita) {
    console.log('📖 Leyendo archivo de productos...');
    
    // Leer el archivo JSON directamente
    const archivoTexto = await fs.readFile(DATA_FILE, 'utf8');
    const productos = JSON.parse(archivoTexto);
    
    // Encontrar el producto
    const indiceProducto = productos.findIndex(p => p.id === productoId);
    if (indiceProducto === -1) {
        throw new Error('Producto no encontrado');
    }
    
    const producto = productos[indiceProducto];
    console.log('🎯 Producto encontrado:', producto.nombre);
    console.log('🖼️ Imágenes ANTES:', producto.imagenes);
    
    // Verificar que la imagen existe
    if (!producto.imagenes || !producto.imagenes.includes(rutaImagenFavorita)) {
        console.log('❌ Imagen no encontrada:', rutaImagenFavorita);
        console.log('📋 Imágenes disponibles:', producto.imagenes);
        throw new Error('Imagen no encontrada');
    }
    
    // Si ya es la primera, no hacer nada
    if (producto.imagenes[0] === rutaImagenFavorita) {
        console.log('ℹ️ La imagen ya es la favorita');
        return producto;
    }
    
    console.log('🔄 Reordenando imágenes...');
    
    // Crear nuevo array: la imagen favorita primero, luego las demás
    const nuevasImagenes = [rutaImagenFavorita];
    producto.imagenes.forEach(img => {
        if (img !== rutaImagenFavorita) {
            nuevasImagenes.push(img);
        }
    });
    
    console.log('🖼️ Imágenes DESPUÉS:', nuevasImagenes);
    
    // Actualizar el producto
    productos[indiceProducto].imagenes = nuevasImagenes;
    productos[indiceProducto].fechaModificacion = new Date().toISOString();
    
    // Escribir el archivo
    console.log('💾 Escribiendo archivo...');
    await fs.writeFile(DATA_FILE, JSON.stringify(productos, null, 2), 'utf8');
    console.log('✅ Archivo escrito correctamente');
    
    // Verificar que se escribió correctamente
    console.log('🔍 Verificando escritura...');
    const verificacion = await fs.readFile(DATA_FILE, 'utf8');
    const productosVerificados = JSON.parse(verificacion);
    const productoVerificado = productosVerificados.find(p => p.id === productoId);
    console.log('🔎 Imágenes verificadas en archivo:', productoVerificado.imagenes);
    
    return productos[indiceProducto];
}

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        // Crear directorio si no existe
        require('fs').mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'producto-' + uniqueSuffix + extension);
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

// Configuración específica para múltiples imágenes
const uploadMultiple = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo por archivo
        files: 10 // máximo 10 archivos por producto
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Servir archivos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Función para eliminar archivo de imagen
async function eliminarImagen(rutaImagen) {
    if (rutaImagen) {
        try {
            const rutaCompleta = path.join(__dirname, 'public', rutaImagen);
            await require('fs').promises.unlink(rutaCompleta);
        } catch (error) {
            console.log('Error eliminando imagen:', error.message);
        }
    }
}

// Funciones de gestión de usuarios
async function crearDirectorioUsuarios() {
    try {
        await fs.mkdir(USERS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creando directorio de usuarios:', error);
    }
}

async function leerUsuario(userId) {
    try {
        const userFile = path.join(USERS_DIR, `${userId}.json`);
        const data = await fs.readFile(userFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function escribirUsuario(userId, userData) {
    try {
        await crearDirectorioUsuarios();
        const userFile = path.join(USERS_DIR, `${userId}.json`);
        await fs.writeFile(userFile, JSON.stringify(userData, null, 2));
    } catch (error) {
        console.error('Error escribiendo usuario:', error);
        throw error;
    }
}

async function buscarUsuarioPorEmail(email) {
    try {
        await crearDirectorioUsuarios();
        const files = await fs.readdir(USERS_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const userId = file.replace('.json', '');
                const userData = await leerUsuario(userId);
                if (userData && userData.email === email) {
                    return { userId, ...userData };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error buscando usuario:', error);
        return null;
    }
}

// Middleware de autenticación
function verificarToken(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido.' });
    }
}

// Middleware para verificar rol de administrador
function verificarAdmin(req, res, next) {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}

// Función para leer productos del archivo JSON
async function leerProductos() {
    await esperarArchivo();
    try {
        console.trace('🔍 TRACE: leerProductos() llamado desde:');
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const productos = JSON.parse(data);
        console.log(`📚 Productos leídos del archivo: ${productos.length} productos`);
        return productos;
    } catch (error) {
        console.log('Error leyendo productos o archivo no existe, retornando array vacío');
        // Si el archivo no existe, retornar array vacío
        return [];
    } finally {
        liberarArchivo();
    }
}

// Función para escribir productos al archivo JSON
// Variable para control de escritura concurrente
let escribiendo = false;
const colaEscritura = [];

async function escribirProductos(productos) {
    try {
        // Crear directorio data si no existe
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        
        // Validar que productos sea un array válido
        if (!Array.isArray(productos)) {
            throw new Error('Los productos deben ser un array');
        }
        
        // Escribir con formato JSON válido
        await fs.writeFile(DATA_FILE, JSON.stringify(productos, null, 2), 'utf8');
        
    } catch (error) {
        console.error('Error escribiendo productos:', error);
        throw error;
    }
}

// Funciones de gestión de configuración
async function leerConfiguracion() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, retornar configuración por defecto
        return {
            moneda: {
                simbolo: "$",
                codigo: "USD",
                nombre: "Dólar Estadounidense",
                posicion: "antes"
            },
            aplicacion: {
                nombre: "Cartera de Productos",
                version: "1.0.0",
                fechaActualizacion: new Date().toISOString()
            },
            formato: {
                decimales: 2,
                separadorMiles: ",",
                separadorDecimal: "."
            }
        };
    }
}

async function escribirConfiguracion(configuracion) {
    try {
        // Crear directorio data si no existe
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        configuracion.aplicacion.fechaActualizacion = new Date().toISOString();
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configuracion, null, 2));
    } catch (error) {
        console.error('Error escribiendo configuración:', error);
        throw error;
    }
}

// Rutas de autenticación

// POST /api/auth/register - Registrar nuevo administrador
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, nombre } = req.body;
        
        // Validaciones
        if (!email || !password || !nombre) {
            return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await buscarUsuarioPorEmail(email);
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        
        // Generar UUID para el usuario
        const userId = uuidv4();
        
        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);
        
        // Crear usuario
        const nuevoUsuario = {
            id: userId,
            email,
            password: passwordEncriptada,
            nombre,
            rol: 'administrador',
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: null,
            activo: true
        };
        
        await escribirUsuario(userId, nuevoUsuario);
        
        // Generar token
        const token = jwt.sign(
            { userId, email, rol: 'administrador' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            token,
            usuario: {
                id: userId,
                email,
                nombre,
                rol: 'administrador'
            }
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }
        
        // Buscar usuario
        const usuario = await buscarUsuarioPorEmail(email);
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }
        
        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Actualizar último acceso
        usuario.ultimoAcceso = new Date().toISOString();
        await escribirUsuario(usuario.userId, usuario);
        
        // Generar token
        const token = jwt.sign(
            { userId: usuario.userId, email: usuario.email, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: usuario.userId,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
app.get('/api/auth/perfil', verificarToken, async (req, res) => {
    try {
        const usuario = await leerUsuario(req.user.userId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
            fechaCreacion: usuario.fechaCreacion,
            ultimoAcceso: usuario.ultimoAcceso
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/logout - Cerrar sesión (invalidar token del lado cliente)
app.post('/api/auth/logout', verificarToken, (req, res) => {
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// PUT /api/auth/cambiar-password - Cambiar contraseña
app.put('/api/auth/cambiar-password', verificarToken, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        
        // Validaciones
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
        }
        
        if (passwordNueva.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }
        
        if (passwordActual === passwordNueva) {
            return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
        }
        
        // Obtener usuario actual
        const usuario = await leerUsuario(req.user.userId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña actual
        const passwordActualValida = await bcrypt.compare(passwordActual, usuario.password);
        if (!passwordActualValida) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }
        
        // Encriptar nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordNuevaEncriptada = await bcrypt.hash(passwordNueva, salt);
        
        // Actualizar usuario
        usuario.password = passwordNuevaEncriptada;
        usuario.fechaModificacion = new Date().toISOString();
        
        await escribirUsuario(req.user.userId, usuario);
        
        res.json({ 
            mensaje: 'Contraseña actualizada exitosamente',
            fechaModificacion: usuario.fechaModificacion
        });
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de configuración

// GET /api/configuracion - Obtener configuración actual (requiere autenticación)
app.get('/api/configuracion', verificarToken, async (req, res) => {
    try {
        const configuracion = await leerConfiguracion();
        res.json(configuracion);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/configuracion - Actualizar configuración (requiere ser administrador)
app.put('/api/configuracion', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const { moneda, formato, aplicacion } = req.body;
        
        // Validaciones básicas
        if (moneda && (!moneda.simbolo || !moneda.codigo || !moneda.nombre)) {
            return res.status(400).json({ 
                error: 'Los campos símbolo, código y nombre de la moneda son obligatorios' 
            });
        }
        
        if (formato && formato.decimales !== undefined && (formato.decimales < 0 || formato.decimales > 4)) {
            return res.status(400).json({ 
                error: 'Los decimales deben estar entre 0 y 4' 
            });
        }
        
        // Obtener configuración actual
        const configuracionActual = await leerConfiguracion();
        
        // Actualizar solo los campos proporcionados
        const nuevaConfiguracion = {
            ...configuracionActual,
            ...(moneda && { moneda: { ...configuracionActual.moneda, ...moneda } }),
            ...(formato && { formato: { ...configuracionActual.formato, ...formato } }),
            ...(aplicacion && { aplicacion: { ...configuracionActual.aplicacion, ...aplicacion } })
        };
        
        await escribirConfiguracion(nuevaConfiguracion);
        
        res.json({
            mensaje: 'Configuración actualizada exitosamente',
            configuracion: nuevaConfiguracion
        });
        
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de la API de productos (ahora protegidas)

// GET /api/productos - Obtener todos los productos
app.get('/api/productos', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const productos = await leerProductos();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET /api/productos/:id - Obtener un producto por ID
app.get('/api/productos/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const productos = await leerProductos();
        const producto = productos.find(p => p.id === parseInt(req.params.id));
        
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(producto);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// POST /api/productos - Crear un nuevo producto
app.post('/api/productos', verificarToken, verificarAdmin, uploadMultiple.array('imagenes', 10), async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, marca, stock, imagenFavorita } = req.body;
        
        // Validaciones básicas
        if (!nombre || !precio) {
            // Si hay archivos subidos pero falla validación, eliminarlos
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    await eliminarImagen(`uploads/${file.filename}`);
                }
            }
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }
        
        const productos = await leerProductos();
        
        // Generar nuevo ID
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        
        // Procesar imágenes (solo rutas, sin metadatos)
        let imagenes = [];
        if (req.files && req.files.length > 0) {
            imagenes = req.files.map(file => `uploads/${file.filename}`);
            
            // Si se especificó una imagen favorita, moverla al primer lugar
            if (imagenFavorita) {
                const indiceFavorita = parseInt(imagenFavorita);
                if (indiceFavorita > 0 && indiceFavorita < imagenes.length) {
                    const favorita = imagenes.splice(indiceFavorita, 1)[0];
                    imagenes.unshift(favorita);
                }
            }
        }
        
        const nuevoProducto = {
            id: nuevoId,
            nombre,
            descripcion: descripcion || '',
            precio: parseFloat(precio),
            categoria: categoria || 'General',
            marca: marca || '',
            stock: parseInt(stock) || 0,
            imagenes: imagenes,
            fechaCreacion: new Date().toISOString()
        };
        
        productos.push(nuevoProducto);
        await escribirProductos(productos);
        
        res.status(201).json(nuevoProducto);
    } catch (error) {
        // Si hay archivos subidos pero ocurre error, eliminarlos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await eliminarImagen(`uploads/${file.filename}`);
            }
        }
        console.error('Error al crear producto:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'El archivo es muy grande. Máximo 5MB permitido.' });
        } else if (error.message.includes('Tipo de archivo no permitido')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al crear producto' });
        }
    }
});

// PUT /api/productos/:id - Actualizar un producto
app.put('/api/productos/:id', verificarToken, verificarAdmin, upload.single('imagen'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre, descripcion, precio, categoria, marca, stock, eliminarImagen: elimImg } = req.body;
        
        const productos = await leerProductos();
        const indiceProducto = productos.findIndex(p => p.id === id);
        
        if (indiceProducto === -1) {
            // Si hay archivo subido pero producto no existe, eliminarlo
            if (req.file) {
                await eliminarImagen(`uploads/${req.file.filename}`);
            }
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const productoActual = productos[indiceProducto];
        let nuevaImagen = productoActual.imagen;
        
        // Si se solicita eliminar la imagen actual
        if (elimImg === 'true' && productoActual.imagen) {
            await eliminarImagen(productoActual.imagen);
            nuevaImagen = null;
        }
        
        // Si se subió una nueva imagen
        if (req.file) {
            // Eliminar imagen anterior si existe
            if (productoActual.imagen) {
                await eliminarImagen(productoActual.imagen);
            }
            nuevaImagen = `uploads/${req.file.filename}`;
        }
        
        // Actualizar producto manteniendo ID y fecha de creación
        productos[indiceProducto] = {
            ...productoActual,
            nombre: nombre || productoActual.nombre,
            descripcion: descripcion !== undefined ? descripcion : productoActual.descripcion,
            precio: precio !== undefined ? parseFloat(precio) : productoActual.precio,
            categoria: categoria || productoActual.categoria,
            marca: marca !== undefined ? marca : productoActual.marca,
            stock: stock !== undefined ? parseInt(stock) : productoActual.stock,
            imagen: nuevaImagen,
            fechaModificacion: new Date().toISOString()
        };
        
        await escribirProductos(productos);
        res.json(productos[indiceProducto]);
    } catch (error) {
        // Si hay archivo subido pero ocurre error, eliminarlo
        if (req.file) {
            await eliminarImagen(`uploads/${req.file.filename}`);
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'El archivo es muy grande. Máximo 5MB permitido.' });
        } else if (error.message.includes('Tipo de archivo no permitido')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al actualizar producto' });
        }
    }
});

// DELETE /api/productos/:id - Eliminar un producto
app.delete('/api/productos/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productos = await leerProductos();
        const indiceProducto = productos.findIndex(p => p.id === id);
        
        if (indiceProducto === -1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const productoEliminado = productos.splice(indiceProducto, 1)[0];
        
        // Eliminar imagen asociada si existe
        if (productoEliminado.imagen) {
            await eliminarImagen(productoEliminado.imagen);
        }
        
        // Eliminar todas las imágenes si existe el array de imágenes
        if (productoEliminado.imagenes && Array.isArray(productoEliminado.imagenes)) {
            for (const img of productoEliminado.imagenes) {
                await eliminarImagen(img.ruta);
            }
        }
        
        await escribirProductos(productos);
        
        res.json({ mensaje: 'Producto eliminado', producto: productoEliminado });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// POST /api/productos/:id/imagenes - Agregar imágenes a un producto
app.post('/api/productos/:id/imagenes', verificarToken, verificarAdmin, uploadMultiple.array('imagenes', 10), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { imagenFavorita } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se seleccionaron imágenes' });
        }
        
        const productos = await leerProductos();
        const indiceProducto = productos.findIndex(p => p.id === id);
        
        if (indiceProducto === -1) {
            // Eliminar archivos subidos si el producto no existe
            for (const file of req.files) {
                await eliminarImagen(`uploads/${file.filename}`);
            }
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const producto = productos[indiceProducto];
        
        // Inicializar array de imágenes si no existe
        if (!producto.imagenes) {
            producto.imagenes = [];
        }
        
        // Convertir imágenes existentes al nuevo formato si es necesario
        producto.imagenes = producto.imagenes.map(img => {
            if (typeof img === 'string') {
                return img; // Ya es solo la ruta
            } else {
                return img.ruta; // Extraer solo la ruta
            }
        });
        
        // Agregar nuevas imágenes (solo rutas)
        const nuevasImagenes = req.files.map(file => `uploads/${file.filename}`);
        
        // Si se especificó una imagen favorita entre las nuevas, organizarlas
        if (imagenFavorita) {
            const indiceFavorita = parseInt(imagenFavorita);
            if (indiceFavorita >= 0 && indiceFavorita < nuevasImagenes.length) {
                const favorita = nuevasImagenes.splice(indiceFavorita, 1)[0];
                // Poner la favorita al principio de todo el array
                producto.imagenes.unshift(favorita);
                // Agregar el resto al final
                producto.imagenes.push(...nuevasImagenes);
            } else {
                producto.imagenes.push(...nuevasImagenes);
            }
        } else {
            producto.imagenes.push(...nuevasImagenes);
        }
        
        producto.fechaModificacion = new Date().toISOString();
        
        await escribirProductos(productos);
        
        res.json({ 
            mensaje: 'Imágenes agregadas correctamente',
            producto: producto,
            imagenesAgregadas: nuevasImagenes.length
        });
    } catch (error) {
        // Eliminar archivos subidos en caso de error
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await eliminarImagen(`uploads/${file.filename}`);
            }
        }
        console.error('Error al agregar imágenes:', error);
        res.status(500).json({ error: 'Error al agregar imágenes' });
    }
});

// PUT /api/productos/:id/imagenes/:rutaImagen/favorita - Cambiar imagen favorita
app.put('/api/productos/:id/imagenes/favorita', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rutaImagen } = req.body;
        
        console.log('� ENDPOINT LLAMADO - Cambiando imagen favorita:', { id, rutaImagen, body: req.body });
        console.log('�🔄 Cambiando imagen favorita:', { id, rutaImagen });
        
        const productoActualizado = await cambiarImagenFavorita(id, rutaImagen);
        
        console.log('✅ Cambio exitoso, nuevas imágenes:', productoActualizado.imagenes);
        
        res.json({ 
            mensaje: 'Imagen favorita actualizada correctamente',
            producto: productoActualizado
        });
        
    } catch (error) {
        console.error('❌ Error al cambiar imagen favorita:', error.message);
        if (error.message === 'Producto no encontrado') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'Imagen no encontrada') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
});

// PUT /api/productos/:id/imagenes - Actualizar array completo de imágenes
app.put('/api/productos/:id/imagenes', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { imagenes } = req.body;
        
        console.log('🔄 Actualizando array de imágenes:', { id, imagenes });
        
        if (!imagenes || !Array.isArray(imagenes)) {
            return res.status(400).json({ error: 'El campo imagenes debe ser un array' });
        }
        
        // Leer productos
        const productos = await leerProductos();
        const indiceProducto = productos.findIndex(p => p.id === id);
        
        if (indiceProducto === -1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        console.log('🖼️ Imágenes ANTES:', productos[indiceProducto].imagenes);
        console.log('🖼️ Imágenes NUEVAS:', imagenes);
        
        // Sobrescribir el array de imágenes directamente
        productos[indiceProducto].imagenes = [...imagenes];
        productos[indiceProducto].fechaModificacion = new Date().toISOString();
        
        // Escribir archivo con mutex
        console.log('💾 Escribiendo archivo con nuevas imágenes...');
        await esperarArchivo();
        try {
            await fs.writeFile(DATA_FILE, JSON.stringify(productos, null, 2), 'utf8');
            console.log('✅ Array de imágenes actualizado correctamente');
        } finally {
            liberarArchivo();
        }
        
        res.json({ 
            mensaje: 'Imágenes actualizadas correctamente',
            producto: productos[indiceProducto]
        });
        
    } catch (error) {
        console.error('❌ Error al actualizar imágenes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// DELETE /api/productos/:id/imagenes - Eliminar una imagen específica
app.delete('/api/productos/:id/imagenes', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rutaImagen } = req.body;
        
        const productos = await leerProductos();
        const indiceProducto = productos.findIndex(p => p.id === id);
        
        if (indiceProducto === -1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const producto = productos[indiceProducto];
        
        if (!producto.imagenes || producto.imagenes.length === 0) {
            return res.status(400).json({ error: 'El producto no tiene imágenes' });
        }
        
        // Convertir al nuevo formato si es necesario
        producto.imagenes = producto.imagenes.map(img => {
            if (typeof img === 'string') {
                return img; // Ya es solo la ruta
            } else {
                return img.ruta; // Extraer solo la ruta
            }
        });
        
        const indiceImagen = producto.imagenes.findIndex(img => img === rutaImagen);
        if (indiceImagen === -1) {
            return res.status(400).json({ error: 'Imagen no encontrada' });
        }
        
        // Eliminar imagen del array
        producto.imagenes.splice(indiceImagen, 1);
        
        // Eliminar archivo físico
        await eliminarImagen(rutaImagen);
        
        producto.fechaModificacion = new Date().toISOString();
        
        await escribirProductos(productos);
        
        res.json({ 
            mensaje: 'Imagen eliminada correctamente',
            producto: producto
        });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ error: 'Error al eliminar imagen' });
    }
});

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servir la página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
