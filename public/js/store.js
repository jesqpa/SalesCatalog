// Variables globales
let productos = [];
let carrito = [];
let marcasData = [];
let categorias = new Set();
let vistaActual = 'selection';
let filtroActual = {
    tipo: '',
    valor: ''
};

// Elementos del DOM
const views = {
    selection: document.getElementById('selectionView'),
    marcas: document.getElementById('marcasView'),
    categorias: document.getElementById('categoriasView'),
    productos: document.getElementById('productosView')
};

const containers = {
    productos: document.getElementById('productosContainer'),
    marcas: document.getElementById('marcasContainer'),
    categorias: document.getElementById('categoriasContainer')
};

const breadcrumb = document.getElementById('navigationBreadcrumb');
const carritoItems = document.getElementById('carritoItems');
const carritoTotal = document.getElementById('carritoTotal');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const cartCount = document.querySelector('.cart-count');
const finalizarCompraBtn = document.getElementById('finalizarCompra');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        cargarMarcas(),
        cargarProductos()
    ]);
    cargarCarritoDesdeLocalStorage();
    actualizarContadorCarrito();
    configurarNavegacion();
});

// Función para cargar marcas desde el archivo JSON
async function cargarMarcas() {
    try {
        const response = await fetch('/api/store/marcas');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        marcasData = await response.json();
        if (!Array.isArray(marcasData)) {
            throw new Error('El formato de datos de marcas es incorrecto');
        }
    } catch (error) {
        console.error('Error al cargar marcas:', error);
        mostrarError(`Error al cargar las marcas: ${error.message}`);
        marcasData = []; // Inicializar como array vacío en caso de error
    }
}

// Configurar eventos de navegación
function configurarNavegacion() {
    // Eventos para las tarjetas de selección inicial
    document.querySelectorAll('.selection-card').forEach(card => {
        card.addEventListener('click', () => {
            const vista = card.dataset.view;
            navegarA(vista);
        });
    });

    // Evento para el breadcrumb
    breadcrumb.addEventListener('click', (e) => {
        if (e.target.classList.contains('breadcrumb-item')) {
            const vista = e.target.dataset.view || 'selection';
            navegarA(vista);
        }
    });

    // Configurar botones de retorno
    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', () => {
            const vista = button.dataset.view;
            if (vista) {
                navegarA(vista);
            } else if (button.id === 'productosBackButton') {
                // Volver a la vista anterior basado en el filtro actual
                const vistaAnterior = filtroActual.tipo === 'marcas' ? 'marcas' : 'categorias';
                navegarA(vistaAnterior);
            }
        });
    });
}

// Función para cargar productos desde el archivo JSON
async function cargarProductos() {
    try {
        const response = await fetch('/api/store/productos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        productos = await response.json();
        if (!Array.isArray(productos) || productos.length === 0) {
            throw new Error('No se encontraron productos');
        }
        extraerMarcasYCategorias();
        mostrarVistaInicial();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarError(error.message);
    }
}

// Función para extraer marcas y categorías únicas
function extraerMarcasYCategorias() {
    marcas = new Set(productos.map(p => p.marca).filter(Boolean));
    categorias = new Set(productos.map(p => p.categoria).filter(Boolean));
}

// Función para navegar entre vistas
function navegarA(vista, filtro = null) {
    // Ocultar todas las vistas
    Object.values(views).forEach(view => view.classList.remove('active-view'));
    
    // Activar la vista seleccionada
    views[vista].classList.add('active-view');
    vistaActual = vista;

    // Actualizar breadcrumb
    actualizarBreadcrumb(vista, filtro);

    // Actualizar contenido según la vista
    switch(vista) {
        case 'marcas':
            mostrarMarcas();
            break;
        case 'categorias':
            mostrarCategorias();
            break;
        case 'productos':
            if (filtro) {
                filtroActual = filtro;
                mostrarProductosFiltrados();
            }
            break;
        default:
            filtroActual = { tipo: '', valor: '' };
    }
}

// Función para actualizar el breadcrumb
function actualizarBreadcrumb(vista, filtro) {
    let html = '<ol class="breadcrumb">\n';
    html += '<li class="breadcrumb-item" data-view="selection"><a href="#">Inicio</a></li>\n';

    if (vista !== 'selection') {
        const vistaTexto = vista === 'marcas' ? 'Marcas' : 'Categorías';
        if (vista === 'productos') {
            html += `<li class="breadcrumb-item" data-view="${filtro.tipo}"><a href="#">${vistaTexto}</a></li>\n`;
            html += `<li class="breadcrumb-item active" aria-current="page">${filtro.valor}</li>\n`;
        } else {
            html += `<li class="breadcrumb-item active" aria-current="page">${vistaTexto}</li>\n`;
        }
    }

    html += '</ol>';
    breadcrumb.innerHTML = html;
}

// Función para mostrar la vista inicial
function mostrarVistaInicial() {
    navegarA('selection');
}

// Función para actualizar las opciones de filtros
function actualizarOpcionesFiltros() {
    marcas = new Set(productos.map(p => p.marca).filter(Boolean));
    categorias = new Set(productos.map(p => p.categoria).filter(Boolean));

    // Actualizar select de marcas
    marcaSelect.innerHTML = '<option value="">Todas las marcas</option>';
    [...marcas].sort().forEach(marca => {
        marcaSelect.innerHTML += `<option value="${marca}">${marca}</option>`;
    });

    // Actualizar select de categorías
    categoriaSelect.innerHTML = '<option value="">Todas las categorías</option>';
    [...categorias].sort().forEach(categoria => {
        categoriaSelect.innerHTML += `<option value="${categoria}">${categoria}</option>`;
    });
}

// Función para configurar los event listeners de los filtros
function configurarFiltros() {
    marcaSelect.addEventListener('change', () => {
        filtrosActuales.marca = marcaSelect.value;
        aplicarFiltros();
    });

    categoriaSelect.addEventListener('change', () => {
        filtrosActuales.categoria = categoriaSelect.value;
        aplicarFiltros();
    });

    resetFiltersBtn.addEventListener('click', () => {
        filtrosActuales = {
            busqueda: '',
            marca: '',
            categoria: ''
        };
        searchInput.value = '';
        marcaSelect.value = '';
        categoriaSelect.value = '';
        aplicarFiltros();
    });
}

// Función para aplicar todos los filtros
function aplicarFiltros() {
    let productosFiltrados = productos;

    // Filtrar por marca
    if (filtrosActuales.marca) {
        productosFiltrados = productosFiltrados.filter(p => p.marca === filtrosActuales.marca);
    }

    // Filtrar por categoría
    if (filtrosActuales.categoria) {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === filtrosActuales.categoria);
    }

    // Filtrar por búsqueda
    if (filtrosActuales.busqueda) {
        const busqueda = filtrosActuales.busqueda.toLowerCase();
        productosFiltrados = productosFiltrados.filter(p =>
            p.nombre.toLowerCase().includes(busqueda) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(busqueda))
        );
    }

    mostrarProductos(productosFiltrados);
}

// Función para mostrar las marcas disponibles
function mostrarMarcas() {
    containers.marcas.innerHTML = '';
    
    marcasData.forEach(marca => {
        const productosDeEstaMarca = productos.filter(p => p.marca === marca.nombre);
        if (productosDeEstaMarca.length === 0) return; // No mostrar marcas sin productos
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card marca-card h-100 hover-effect">
                <div class="card-header text-center bg-white border-0 pt-3">
                    <img src="/${marca.logo}" class="marca-logo" alt="${marca.nombre}">
                </div>
                <div class="card-body text-center">
                    <h3 class="card-title">${marca.nombre}</h3>
                    <p class="card-text text-muted">${marca.descripcion}</p>
                    <p class="card-text"><strong>${productosDeEstaMarca.length}</strong> productos</p>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            navegarA('productos', { tipo: 'marcas', valor: marca.nombre });
        });
        
        containers.marcas.appendChild(card);
    });

    // Si no hay marcas para mostrar
    if (containers.marcas.children.length === 0) {
        containers.marcas.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    No hay marcas disponibles con productos.
                </div>
            </div>
        `;
    }
}

// Función para mostrar las categorías disponibles
function mostrarCategorias() {
    const categoriasArray = [...categorias].sort();
    containers.categorias.innerHTML = '';
    
    categoriasArray.forEach(categoria => {
        const productosDeEstaCategoria = productos.filter(p => p.categoria === categoria);
        const imagenEjemplo = productosDeEstaCategoria[0]?.imagenes?.[0] || 'placeholder.jpg';
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card categoria-card h-100 hover-effect">
                <img src="/${imagenEjemplo}" class="card-img-top categoria-img" alt="${categoria}">
                <div class="card-body text-center">
                    <h3 class="card-title">${categoria}</h3>
                    <p class="card-text">${productosDeEstaCategoria.length} productos</p>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            navegarA('productos', { tipo: 'categorias', valor: categoria });
        });
        
        containers.categorias.appendChild(card);
    });
}

// Función para mostrar productos filtrados
function mostrarProductosFiltrados() {
    const productosFiltrados = productos.filter(producto => {
        if (filtroActual.tipo === 'marcas') {
            return producto.marca === filtroActual.valor;
        } else if (filtroActual.tipo === 'categorias') {
            return producto.categoria === filtroActual.valor;
        }
        return true;
    });
    
    // Actualizar el título de la sección de productos
    const productosTitle = document.getElementById('productosTitle');
    if (filtroActual.tipo === 'marcas') {
        const marca = marcasData.find(m => m.nombre === filtroActual.valor);
        productosTitle.textContent = marca ? `Productos ${marca.nombre}` : 'Productos';
    } else if (filtroActual.tipo === 'categorias') {
        productosTitle.textContent = `Categoría: ${filtroActual.valor}`;
    } else {
        productosTitle.textContent = 'Productos';
    }
    
    mostrarProductos(productosFiltrados);
}

// Función para mostrar productos en la página
function mostrarProductos(productosAMostrar) {
    containers.productos.innerHTML = '';
    productosAMostrar.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        const imagenUrl = producto.imagenes && producto.imagenes.length > 0 
            ? `/${producto.imagenes[0]}` 
            : '/placeholder.jpg';
        card.innerHTML = `
            <div class="card product-card h-100">
                <img src="${imagenUrl}" 
                     class="card-img-top" alt="${producto.nombre}">
                <div class="card-body">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text">${producto.descripcion || ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="price">$${(producto.precio || 0).toLocaleString('es-MX')}</span>
                        <button class="btn btn-primary" onclick="agregarAlCarrito(${producto.id})">
                            <i class="bi bi-cart-plus"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>
        `;
        containers.productos.appendChild(card);
    });
}

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
    const contenedor = document.querySelector('.container');
    contenedor.innerHTML = `
        <div class="alert alert-danger mt-4" role="alert">
            Error: ${mensaje}
        </div>
    `;
}

// Función para agregar productos al carrito
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    const itemEnCarrito = carrito.find(item => item.id === productoId);
    if (itemEnCarrito) {
        itemEnCarrito.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    mostrarNotificacion('Producto agregado al carrito');
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
}

// Función para actualizar la visualización del carrito
function actualizarCarrito() {
    carritoItems.innerHTML = '';
    let total = 0;

    carrito.forEach(item => {
        total += item.precio * item.cantidad;
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${item.imagenes && item.imagenes.length > 0 ? item.imagenes[0] : 'placeholder.jpg'}" 
                     class="cart-item-img me-2" alt="${item.nombre}">
                <div class="flex-grow-1">
                    <h6 class="mb-0">${item.nombre}</h6>
                    <div class="quantity-control">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                        <span>${item.cantidad}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                    </div>
                </div>
                <div class="text-end ms-2">
                    <div>$${(item.precio * item.cantidad).toFixed(2)}</div>
                    <button class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        carritoItems.appendChild(itemElement);
    });

    carritoTotal.textContent = `$${total.toFixed(2)}`;
    actualizarContadorCarrito();
}

// Función para cambiar la cantidad de un producto en el carrito
function cambiarCantidad(productoId, cambio) {
    const item = carrito.find(item => item.id === productoId);
    if (item) {
        item.cantidad += cambio;
        if (item.cantidad <= 0) {
            eliminarDelCarrito(productoId);
        } else {
            actualizarCarrito();
            guardarCarritoEnLocalStorage();
        }
    }
}

// Función para eliminar un producto del carrito
function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
}

// Función para actualizar el contador del carrito
function actualizarContadorCarrito() {
    const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
    cartCount.textContent = cantidad;
}

// Funciones de Local Storage
function guardarCarritoEnLocalStorage() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarritoDesdeLocalStorage() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarCarrito();
    }
}

// Función de búsqueda
function buscarProductos() {
    filtrosActuales.busqueda = searchInput.value.toLowerCase().trim();
    aplicarFiltros();
}

// Event Listeners
searchButton.addEventListener('click', buscarProductos);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        buscarProductos();
    }
});

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje) {
    let notificacion = document.querySelector('.notification');
    if (!notificacion) {
        notificacion = document.createElement('div');
        notificacion.className = 'notification';
        document.body.appendChild(notificacion);
    }
    
    notificacion.textContent = mensaje;
    notificacion.style.display = 'block';
    
    setTimeout(() => {
        notificacion.style.display = 'none';
    }, 2000);
}

// Finalizar compra
finalizarCompraBtn.addEventListener('click', () => {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío');
        return;
    }
    
    // Aquí podrías agregar la lógica para procesar la compra
    mostrarNotificacion('¡Gracias por tu compra!');
    carrito = [];
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
});