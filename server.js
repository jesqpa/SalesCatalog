const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'productos.json');

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

// Función para leer productos del archivo JSON
async function leerProductos() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, retornar array vacío
        return [];
    }
}

// Función para escribir productos al archivo JSON
async function escribirProductos(productos) {
    try {
        // Crear directorio data si no existe
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(productos, null, 2));
    } catch (error) {
        console.error('Error escribiendo productos:', error);
        throw error;
    }
}

// Rutas de la API

// GET /api/productos - Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await leerProductos();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET /api/productos/:id - Obtener un producto por ID
app.get('/api/productos/:id', async (req, res) => {
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
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, stock } = req.body;
        
        // Validaciones básicas
        if (!nombre || !precio) {
            // Si hay archivo subido pero falla validación, eliminarlo
            if (req.file) {
                await eliminarImagen(`uploads/${req.file.filename}`);
            }
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }
        
        const productos = await leerProductos();
        
        // Generar nuevo ID
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        
        const nuevoProducto = {
            id: nuevoId,
            nombre,
            descripcion: descripcion || '',
            precio: parseFloat(precio),
            categoria: categoria || 'General',
            stock: parseInt(stock) || 0,
            imagen: req.file ? `uploads/${req.file.filename}` : null,
            fechaCreacion: new Date().toISOString()
        };
        
        productos.push(nuevoProducto);
        await escribirProductos(productos);
        
        res.status(201).json(nuevoProducto);
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
            res.status(500).json({ error: 'Error al crear producto' });
        }
    }
});

// PUT /api/productos/:id - Actualizar un producto
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre, descripcion, precio, categoria, stock, eliminarImagen: elimImg } = req.body;
        
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
app.delete('/api/productos/:id', async (req, res) => {
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
        
        await escribirProductos(productos);
        
        res.json({ mensaje: 'Producto eliminado', producto: productoEliminado });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
