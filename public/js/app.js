// Variables globales
let productos = [];
let productoEditando = null;
let productoAEliminar = null;
let imagenAEliminar = false;
let authToken = null;
let userInfo = null;
let productoSeleccionado = null; // Para manejar la selección visual

// URLs de la API
const API_BASE = '/api/productos';
const AUTH_API = '/api/auth';
const CONFIG_API = '/api/configuracion';

// Inicialización cuando el documento esté listo
$(document).ready(function() {
    verificarAutenticacion();
});

function verificarAutenticacion() {
    authToken = localStorage.getItem('authToken');
    userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    if (!authToken) {
        // No hay token, redirigir al login
        window.location.href = '/login.html';
        return;
    }
    
    // Verificar si el token es válido
    verificarTokenValido();
}

async function verificarTokenValido() {
    try {
        const response = await $.ajax({
            url: `${AUTH_API}/perfil`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        // Token válido, continuar con la inicialización
        userInfo = response;
        inicializarApp();
        mostrarInfoUsuario();
        
    } catch (error) {
        console.error('Token inválido:', error);
        cerrarSesion();
    }
}

function inicializarApp() {
    cargarConfiguracion();
    cargarProductos();
    cargarMarcas();
    configurarEventos();
    configurarEventosMarcas();
    configurarEventosExcel();
}

function configurarEventos() {
    // Eventos del modal de producto
    $('#btnAgregarProducto').on('click', abrirModalAgregar);
    $('#btnGestionarMarcas').on('click', abrirModalMarcas);
    $('#btnCerrarModal, #btnCancelar').on('click', cerrarModalProducto);
    $('#formProducto').on('submit', guardarProducto);
    
    // Eventos del modal de confirmación
    $('#btnCancelarEliminacion').on('click', cerrarModalConfirmacion);
    $('#btnConfirmarEliminacion').on('click', confirmarEliminacion);
    
    // Eventos del modal de cambiar contraseña
    $('#btnCerrarModalPassword, #btnCancelarPassword').on('click', cerrarModalCambiarPassword);
    $('#formCambiarPassword').on('submit', cambiarPassword);
    $('#passwordNueva').on('input', verificarFortalezaPassword);
    $('#passwordNuevaConfirm').on('input', verificarConfirmacionPassword);
    
    // Eventos del modal de configuración
    $('#btnCerrarModalConfig, #btnCancelarConfig').on('click', cerrarModalConfiguracion);
    $('#formConfiguracion').on('submit', guardarConfiguracion);
    $('#simboloMoneda, #codigoMoneda, #posicionMoneda, #decimales, #separadorMiles, #separadorDecimal').on('input change', actualizarVistaPrevia);
    $('#codigoMoneda').on('input', function() {
        $(this).val($(this).val().toUpperCase());
    });
    
    // Eventos de búsqueda y filtros
    $('#buscarProducto').on('input', filtrarProductos);
    $('#filtroCategoria').on('change', filtrarProductos);
    $('#filtroMarca').on('change', filtrarProductos);
    $('#btnLimpiarFiltros').on('click', limpiarFiltros);
    
    // Eventos de imagen
    $('#imagenes').on('change', manejarSeleccionImagenes);
    $('#btnEliminarImagen').on('click', eliminarImagenPreview);
    $('#btnCambiarImagen').on('click', cambiarImagen);
    $('#btnEliminarImagenActual').on('click', eliminarImagenActual);
    
    // Eventos de autenticación
    $('#btnCerrarSesion').on('click', cerrarSesion);
    
    // Eventos para mostrar/ocultar contraseñas
    $('.toggle-password').on('click', function() {
        const target = $(this).data('target');
        const input = $(`#${target}`);
        const icon = $(this).find('i');
        
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });
    
    // Cerrar modales al hacer clic fuera de ellos
    $('#modalProducto, #modalConfirmacion, #modalCambiarPassword, #modalConfiguracion').on('click', function(e) {
        if (e.target === this) {
            cerrarModalProducto();
            cerrarModalConfirmacion();
            cerrarModalCambiarPassword();
            cerrarModalConfiguracion();
        }
    });
}

// Funciones de la API
async function cargarConfiguracion() {
    try {
        const response = await $.ajax({
            url: CONFIG_API,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        configuracion = response;
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        // Usar configuración por defecto si falla
        const configPorDefecto = {
            moneda: { simbolo: "¢", codigo: "COL", nombre: "Colón Costa Rica", posicion: "antes" },
            formato: { decimales: 2, separadorMiles: ",", separadorDecimal: "." }
        };
        configuracion = configPorDefecto;
    }
}

async function cargarProductos() {
    try {
        mostrarCargando();
        const response = await $.ajax({
            url: API_BASE,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        productos = response;
        actualizarInterfaz();
        mostrarToast('Productos cargados correctamente', 'success');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        if (error.status === 401) {
            cerrarSesion();
        } else {
            mostrarToast('Error al cargar productos', 'error');
        }
    }
}

async function crearProducto(formData) {
    try {
        const response = await $.ajax({
            url: API_BASE,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        return response;
    } catch (error) {
        console.error('Error al crear producto:', error);
        if (error.status === 401) {
            cerrarSesion();
        }
        throw error;
    }
}

async function actualizarProducto(id, formData) {
    try {
        const response = await $.ajax({
            url: `${API_BASE}/${id}`,
            method: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        return response;
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        if (error.status === 401) {
            cerrarSesion();
        }
        throw error;
    }
}

async function eliminarProducto(id) {
    try {
        await $.ajax({
            url: `${API_BASE}/${id}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        if (error.status === 401) {
            cerrarSesion();
        }
        throw error;
    }
}

// Funciones de interfaz
function mostrarCargando() {
    $('#listaProductos').html(`
        <div class="col-span-full text-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
            <p class="text-gray-600">Cargando productos...</p>
        </div>
    `);
}

function actualizarInterfaz() {
    mostrarProductos();
    actualizarFiltroCategoria();
    actualizarFiltroMarca();
}

// Función auxiliar para obtener la imagen favorita de un producto
function obtenerImagenFavorita(producto) {
    // Si tiene array de imágenes, la primera es siempre la favorita
    if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
        return producto.imagenes[0];
    }
    
    // Fallback a la imagen antigua para compatibilidad
    return producto.imagen || null;
}

function mostrarProductos(productosAMostrar = productos) {
    const contenedor = $('#listaProductos');
    const sinProductos = $('#sinProductos');
    
    if (productosAMostrar.length === 0) {
        contenedor.empty();
        sinProductos.removeClass('hidden');
        return;
    }
    
    sinProductos.addClass('hidden');
    
    const productosHTML = productosAMostrar.map(producto => {
        const imagenFavorita = obtenerImagenFavorita(producto);
        
        return `
        <div id="producto-${producto.id}" class="producto-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300 relative" onclick="seleccionarProducto(${producto.id})">
            ${imagenFavorita ? `
                <div class="h-48 bg-gray-200 relative">
                    <img src="/${imagenFavorita}" alt="${escapeHtml(producto.nombre)}" 
                         class="w-full h-full object-cover">
                    ${producto.imagenes && producto.imagenes.length > 1 ? `
                        <div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            <i class="fas fa-images mr-1"></i>${producto.imagenes.length}
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="h-48 bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-image text-4xl text-gray-400"></i>
                </div>
            `}
            
            <div class="p-6">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 truncate">${escapeHtml(producto.nombre)}</h3>
                        ${producto.marca ? `<p class="text-sm text-gray-500">${escapeHtml(producto.marca)}</p>` : ''}
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${escapeHtml(producto.categoria)}
                    </span>
                </div>
                
                ${producto.descripcion ? `<p class="text-gray-600 text-sm mb-3 line-clamp-2">${escapeHtml(producto.descripcion)}</p>` : ''}
                
                <div class="space-y-2 mb-4">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-gray-700">Precio:</span>
                        <span class="text-lg font-bold text-green-600">${formatearPrecio(producto.precio)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-gray-700">Stock:</span>
                        <span class="text-sm ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                            ${producto.stock} unidades
                        </span>
                    </div>
                </div>
                
                <div class="text-xs text-gray-500 mb-4">
                    Creado: ${formatearFecha(producto.fechaCreacion)}
                    ${producto.fechaModificacion ? `<br>Modificado: ${formatearFecha(producto.fechaModificacion)}` : ''}
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="event.stopPropagation(); abrirModalEditar(${producto.id})" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm transition duration-300">
                        <i class="fas fa-edit mr-1"></i>
                        Editar
                    </button>
                    <button onclick="event.stopPropagation(); abrirModalEliminar(${producto.id})" 
                            class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition duration-300">
                        <i class="fas fa-trash mr-1"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    contenedor.html(productosHTML);
    
    // Restaurar selección visual si existe
    if (productoSeleccionado !== null) {
        $(`#producto-${productoSeleccionado}`).addClass('seleccionado');
    }
}

function actualizarFiltroCategoria() {
    const categorias = [...new Set(productos.map(p => p.categoria))];
    const filtro = $('#filtroCategoria');
    const opcionActual = filtro.val();
    
    filtro.html('<option value="">Todas las categorías</option>');
    
    categorias.forEach(categoria => {
        filtro.append(`<option value="${categoria}">${categoria}</option>`);
    });
    
    // Restaurar selección si aún existe
    if (categorias.includes(opcionActual)) {
        filtro.val(opcionActual);
    }
}

function actualizarFiltroMarca() {
    const marcas = [...new Set(productos.map(p => p.marca).filter(m => m))]; // Filtrar marcas vacías
    const filtro = $('#filtroMarca');
    const opcionActual = filtro.val();
    
    filtro.html('<option value="">Todas las marcas</option>');
    
    marcas.forEach(marca => {
        filtro.append(`<option value="${marca}">${marca}</option>`);
    });
    
    // Restaurar selección si aún existe
    if (marcas.includes(opcionActual)) {
        filtro.val(opcionActual);
    }
}

// Funciones del modal de producto
function abrirModalAgregar() {
    productoEditando = null;
    imagenAEliminar = false;
    $('#tituloModal').text('Agregar Producto');
    $('#btnGuardar').text('Agregar');
    limpiarFormulario();
    resetearImagenes();
    $('#modalProducto').removeClass('hidden');
    $('#nombre').focus();
}

function abrirModalEditar(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    productoEditando = producto;
    $('#tituloModal').text('Editar Producto');
    $('#btnGuardar').text('Actualizar');
    
    // Llenar formulario con datos del producto
    $('#nombre').val(producto.nombre);
    $('#descripcion').val(producto.descripcion);
    $('#precio').val(producto.precio);
    $('#stock').val(producto.stock);
    $('#categoria').val(producto.categoria);
    $('#marca').val(producto.marca || '');
    
    // Manejar imágenes actuales
    resetearImagenes();
    mostrarImagenesActuales(producto);
    
    $('#modalProducto').removeClass('hidden');
    $('#nombre').focus();
}

function cerrarModalProducto() {
    $('#modalProducto').addClass('hidden');
    limpiarFormulario();
    resetearImagenes();
    productoEditando = null;
}

function limpiarFormulario() {
    $('#formProducto')[0].reset();
}

async function guardarProducto(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('nombre', $('#nombre').val().trim());
    formData.append('descripcion', $('#descripcion').val().trim());
    formData.append('precio', $('#precio').val());
    formData.append('stock', $('#stock').val() || '0');
    formData.append('categoria', $('#categoria').val().trim() || 'General');
    formData.append('marca', $('#marca').val().trim() || '');
    
    // Agregar múltiples imágenes si se seleccionaron
    const archivosImagenes = $('#imagenes')[0].files;
    if (archivosImagenes && archivosImagenes.length > 0) {
        for (let i = 0; i < archivosImagenes.length; i++) {
            formData.append('imagenes', archivosImagenes[i]);
        }
        // La primera imagen será marcada como favorita por defecto
        formData.append('imagenFavorita', '0');
    }
    
    try {
        const btnGuardar = $('#btnGuardar');
        btnGuardar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...');
        
        if (productoEditando) {
            // Para edición, si hay nuevas imágenes, agregarlas
            if (archivosImagenes && archivosImagenes.length > 0) {
                await agregarImagenesAProducto(productoEditando.id, formData);
                mostrarMensaje('Imágenes agregadas correctamente', 'success');
            } else {
                // Actualizar solo los datos del producto sin imágenes
                const formDataSoloTexto = new FormData();
                formDataSoloTexto.append('nombre', $('#nombre').val().trim());
                formDataSoloTexto.append('descripcion', $('#descripcion').val().trim());
                formDataSoloTexto.append('precio', $('#precio').val());
                formDataSoloTexto.append('stock', $('#stock').val() || '0');
                formDataSoloTexto.append('categoria', $('#categoria').val().trim() || 'General');
                formDataSoloTexto.append('marca', $('#marca').val().trim() || '');
                
                await actualizarProducto(productoEditando.id, formDataSoloTexto);
                mostrarMensaje('Producto actualizado correctamente', 'success');
            }
        } else {
            await crearProducto(formData);
            mostrarMensaje('Producto agregado correctamente', 'success');
        }
        
        await cargarProductos();
        cerrarModalProducto();
        
    } catch (error) {
        let mensaje = 'Error al guardar producto';
        if (error.responseJSON && error.responseJSON.error) {
            mensaje = error.responseJSON.error;
        }
        mostrarToast(mensaje, 'error');
    } finally {
        $('#btnGuardar').prop('disabled', false).text(productoEditando ? 'Actualizar' : 'Agregar');
    }
}

// Funciones del modal de confirmación
function abrirModalEliminar(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    productoAEliminar = producto;
    $('#modalConfirmacion').removeClass('hidden');
}

function cerrarModalConfirmacion() {
    $('#modalConfirmacion').addClass('hidden');
    productoAEliminar = null;
}

async function confirmarEliminacion() {
    if (!productoAEliminar) return;
    
    try {
        const btnConfirmar = $('#btnConfirmarEliminacion');
        btnConfirmar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Eliminando...');
        
        await eliminarProducto(productoAEliminar.id);
        await cargarProductos();
        cerrarModalConfirmacion();
        mostrarToast('Producto eliminado correctamente', 'success');
        
    } catch (error) {
        mostrarToast('Error al eliminar producto', 'error');
    } finally {
        $('#btnConfirmarEliminacion').prop('disabled', false).text('Eliminar');
    }
}

// Funciones de filtrado y búsqueda
function filtrarProductos() {
    const busqueda = $('#buscarProducto').val().toLowerCase();
    const categoriaSeleccionada = $('#filtroCategoria').val();
    const marcaSeleccionada = $('#filtroMarca').val();
    
    let productosFiltrados = productos;
    
    // Filtrar por nombre
    if (busqueda) {
        productosFiltrados = productosFiltrados.filter(producto =>
            producto.nombre.toLowerCase().includes(busqueda)
        );
    }
    
    // Filtrar por categoría
    if (categoriaSeleccionada) {
        productosFiltrados = productosFiltrados.filter(producto =>
            producto.categoria === categoriaSeleccionada
        );
    }
    
    // Filtrar por marca
    if (marcaSeleccionada) {
        productosFiltrados = productosFiltrados.filter(producto =>
            producto.marca === marcaSeleccionada
        );
    }
    
    mostrarProductos(productosFiltrados);
}

function limpiarFiltros() {
    $('#buscarProducto').val('');
    $('#filtroCategoria').val('');
    $('#filtroMarca').val('');
    // Mantener la selección al limpiar filtros
    mostrarProductos();
}

// Funciones de utilidad
function mostrarToast(mensaje, tipo = 'success') {
    const toast = $('#toast');
    const toastMessage = $('#toastMessage');
    const toastContent = toast.find('> div');
    
    // Configurar colores según el tipo
    if (tipo === 'error') {
        toastContent.removeClass('bg-green-500').addClass('bg-red-500');
        toastContent.find('i').removeClass('fa-check-circle').addClass('fa-exclamation-circle');
    } else {
        toastContent.removeClass('bg-red-500').addClass('bg-green-500');
        toastContent.find('i').removeClass('fa-exclamation-circle').addClass('fa-check-circle');
    }
    
    toastMessage.text(mensaje);
    toast.removeClass('hidden');
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.addClass('hidden');
    }, 3000);
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// Funciones de manejo de imágenes múltiples
function manejarSeleccionImagenes(e) {
    const archivos = Array.from(e.target.files);
    if (archivos.length === 0) {
        ocultarPreviewImagenes();
        return;
    }
    
    // Validar cada archivo
    const archivosValidos = [];
    for (const archivo of archivos) {
        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!tiposPermitidos.includes(archivo.type)) {
            mostrarMensaje(`Archivo "${archivo.name}" no es válido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)`, 'error');
            continue;
        }
        
        // Validar tamaño (5MB)
        if (archivo.size > 5 * 1024 * 1024) {
            mostrarMensaje(`Archivo "${archivo.name}" es muy grande. Máximo 5MB permitido.`, 'error');
            continue;
        }
        
        archivosValidos.push(archivo);
    }
    
    if (archivosValidos.length === 0) {
        $('#imagenes').val('');
        ocultarPreviewImagenes();
        return;
    }
    
    // Mostrar preview de archivos válidos
    mostrarPreviewImagenes(archivosValidos);
    ocultarImagenesActuales();
}

function mostrarPreviewImagenes(archivos) {
    const contenedor = $('#previewImagenes');
    contenedor.empty();
    
    archivos.forEach((archivo, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagenDiv = $(`
                <div class="relative group">
                    <img src="${e.target.result}" alt="Preview ${index + 1}" 
                         class="w-full h-20 object-cover rounded-md border border-gray-300">
                    <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                        <span class="text-white text-xs font-medium">${index === 0 ? 'Favorita' : `Imagen ${index + 1}`}</span>
                    </div>
                    ${index === 0 ? '<div class="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">★</div>' : ''}
                </div>
            `);
            contenedor.append(imagenDiv);
        };
        reader.readAsDataURL(archivo);
    });
    
    contenedor.removeClass('hidden');
}

function ocultarPreviewImagenes() {
    $('#previewImagenes').addClass('hidden').empty();
}

function mostrarImagenesActuales(producto) {
    const contenedor = $('#imagenesActuales');
    contenedor.empty();
    
    if (!producto.imagenes || producto.imagenes.length === 0) {
        $('#imagenActualContainer').addClass('hidden');
        return;
    }
    
    producto.imagenes.forEach((ruta, index) => {
        const esFavorita = index === 0; // La primera imagen es siempre la favorita
        
        const imagenDiv = $(`
            <div class="relative group">
                <img src="/${ruta}" alt="Imagen ${index + 1}" 
                     class="w-full h-20 object-cover rounded-md border border-gray-300">
                <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                    <div class="flex space-x-1">
                        ${!esFavorita ? `<button onclick="marcarComoFavorita(${producto.id}, '${ruta}')" 
                            class="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                            ★ Favorita
                        </button>` : ''}
                        <button onclick="eliminarImagenProducto(${producto.id}, '${ruta}')" 
                                class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">
                            Eliminar
                        </button>
                    </div>
                </div>
                ${esFavorita ? '<div class="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">★ Favorita</div>' : ''}
            </div>
        `);
        contenedor.append(imagenDiv);
    });
    
    $('#imagenActualContainer').removeClass('hidden');
}

function ocultarImagenesActuales() {
    $('#imagenActualContainer').addClass('hidden');
}

function ocultarPreviewImagen() {
    $('#previewImagen').addClass('hidden');
    $('#imagenPreview').attr('src', '');
}

function eliminarImagenPreview() {
    $('#imagen').val('');
    ocultarPreviewImagen();
    if (productoEditando && productoEditando.imagen) {
        mostrarImagenActual(productoEditando.imagen);
    }
}

function mostrarImagenActual(rutaImagen) {
    $('#imagenActualPreview').attr('src', '/' + rutaImagen);
    $('#imagenActual').removeClass('hidden');
    $('#imagen').hide();
}

function ocultarImagenActual() {
    $('#imagenActual').addClass('hidden');
}

function cambiarImagen() {
    $('#imagen').show().click();
}

function eliminarImagenActual() {
    imagenAEliminar = true;
    ocultarImagenActual();
    $('#imagen').show();
    mostrarToast('La imagen será eliminada al guardar el producto', 'success');
}

function resetearImagenes() {
    ocultarPreviewImagenes();
    ocultarImagenesActuales();
    $('#imagenes').val('');
}

// Funciones de autenticación
function mostrarInfoUsuario() {
    if (userInfo && userInfo.nombre) {
        // Buscar el elemento donde mostrar la info del usuario en el header
        const headerElement = $('header .container');
        if (headerElement.length) {
            headerElement.append(`
                <div class="flex items-center justify-between mt-2">
                    <span class="text-sm text-blue-100">
                        <i class="fas fa-user mr-1"></i>
                        Bienvenido, ${userInfo.nombre}
                    </span>
                    <div class="flex items-center space-x-4">
                        <button id="btnConfiguracion" class="text-sm text-blue-100 hover:text-white underline">
                            <i class="fas fa-cog mr-1"></i>
                            Configuración
                        </button>
                        <button id="btnCambiarPassword" class="text-sm text-blue-100 hover:text-white underline">
                            <i class="fas fa-key mr-1"></i>
                            Cambiar Contraseña
                        </button>
                        <button id="btnCerrarSesion" class="text-sm text-blue-100 hover:text-white underline">
                            <i class="fas fa-sign-out-alt mr-1"></i>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            `);
            
            // Volver a configurar los eventos
            $('#btnCerrarSesion').on('click', cerrarSesion);
            $('#btnCambiarPassword').on('click', abrirModalCambiarPassword);
            $('#btnConfiguracion').on('click', abrirModalConfiguracion);
        }
    }
}

function cerrarSesion() {
    // Eliminar datos del localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('rememberMe');
    
    // Hacer llamada al servidor para logout (opcional)
    if (authToken) {
        $.ajax({
            url: `${AUTH_API}/logout`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        }).always(() => {
            // Redirigir al login
            window.location.href = '/login.html';
        });
    } else {
        // Redirigir al login directamente
        window.location.href = '/login.html';
    }
}

// Funciones de cambio de contraseña
function abrirModalCambiarPassword() {
    limpiarFormularioPassword();
    $('#modalCambiarPassword').removeClass('hidden');
    $('#passwordActual').focus();
}

function cerrarModalCambiarPassword() {
    $('#modalCambiarPassword').addClass('hidden');
    limpiarFormularioPassword();
}

function limpiarFormularioPassword() {
    $('#formCambiarPassword')[0].reset();
    $('#passwordStrength').addClass('hidden');
    resetearValidacionesPassword();
}

async function cambiarPassword(e) {
    e.preventDefault();
    
    const passwordActual = $('#passwordActual').val();
    const passwordNueva = $('#passwordNueva').val();
    const passwordNuevaConfirm = $('#passwordNuevaConfirm').val();
    
    // Validaciones del frontend
    if (!passwordActual || !passwordNueva || !passwordNuevaConfirm) {
        mostrarToast('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (passwordNueva.length < 6) {
        mostrarToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (passwordNueva !== passwordNuevaConfirm) {
        mostrarToast('Las nuevas contraseñas no coinciden', 'error');
        return;
    }
    
    if (passwordActual === passwordNueva) {
        mostrarToast('La nueva contraseña debe ser diferente a la actual', 'error');
        return;
    }
    
    try {
        mostrarCargandoPassword(true);
        
        const response = await $.ajax({
            url: `${AUTH_API}/cambiar-password`,
            method: 'PUT',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            data: JSON.stringify({
                passwordActual,
                passwordNueva
            })
        });
        
        mostrarToast('Contraseña cambiada exitosamente', 'success');
        cerrarModalCambiarPassword();
        
    } catch (error) {
        let mensaje = 'Error al cambiar contraseña';
        if (error.responseJSON && error.responseJSON.error) {
            mensaje = error.responseJSON.error;
        }
        mostrarToast(mensaje, 'error');
    } finally {
        mostrarCargandoPassword(false);
    }
}

function verificarFortalezaPassword() {
    const password = $('#passwordNueva').val();
    const strengthDiv = $('#passwordStrength');
    const strengthBar = $('#passwordStrengthBar');
    const strengthText = $('#passwordStrengthText');
    
    if (password.length === 0) {
        strengthDiv.addClass('hidden');
        return;
    }
    
    strengthDiv.removeClass('hidden');
    
    let strength = 0;
    let strengthLabel = '';
    let strengthColor = '';
    
    // Calcular fortaleza
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    
    // Determinar etiqueta y color
    if (strength < 40) {
        strengthLabel = 'Débil';
        strengthColor = 'bg-red-500';
    } else if (strength < 70) {
        strengthLabel = 'Moderada';
        strengthColor = 'bg-yellow-500';
    } else {
        strengthLabel = 'Fuerte';
        strengthColor = 'bg-green-500';
    }
    
    // Actualizar interfaz
    strengthBar.css('width', `${strength}%`);
    strengthBar.removeClass('bg-red-500 bg-yellow-500 bg-green-500').addClass(strengthColor);
    strengthText.text(strengthLabel);
}

function verificarConfirmacionPassword() {
    const passwordNueva = $('#passwordNueva').val();
    const passwordConfirm = $('#passwordNuevaConfirm').val();
    const confirmField = $('#passwordNuevaConfirm');
    
    if (passwordConfirm && passwordNueva !== passwordConfirm) {
        confirmField.addClass('border-red-500');
        confirmField.removeClass('border-gray-300');
    } else {
        confirmField.removeClass('border-red-500');
        confirmField.addClass('border-gray-300');
    }
}

function mostrarCargandoPassword(mostrar) {
    const btn = $('#btnGuardarPassword');
    const text = $('#btnGuardarPasswordText');
    const spinner = $('#spinnerPassword');
    
    if (mostrar) {
        btn.prop('disabled', true);
        text.text('Cambiando...');
        spinner.removeClass('hidden');
    } else {
        btn.prop('disabled', false);
        text.text('Cambiar Contraseña');
        spinner.addClass('hidden');
    }
}

function resetearValidacionesPassword() {
    $('#passwordNuevaConfirm').removeClass('border-red-500').addClass('border-gray-300');
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const mensajeDiv = $(`
        <div class="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            tipo === 'success' ? 'bg-green-500' : 
            tipo === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white">
            ${mensaje}
        </div>
    `);
    
    $('body').append(mensajeDiv);
    
    setTimeout(() => {
        mensajeDiv.fadeOut(300, () => mensajeDiv.remove());
    }, 3000);
}

// Funciones de configuración
async function guardarConfiguracion(e) {
    e.preventDefault();
    
    const configuracion = {
        moneda: {
            simbolo: $('#simboloMoneda').val(),
            codigo: $('#codigoMoneda').val().toUpperCase(),
            nombre: $('#nombreMoneda').val(),
            posicion: $('#posicionMoneda').val()
        },
        formato: {
            decimales: parseInt($('#decimales').val()),
            separadorMiles: $('#separadorMiles').val(),
            separadorDecimal: $('#separadorDecimal').val()
        }
    };
    
    try {
        $('#btnGuardarConfig').prop('disabled', true);
        $('#btnGuardarConfigText').text('Guardando...');
        
        const response = await $.ajax({
            url: CONFIG_API,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(configuracion)
        });
        
        
        // Mostrar mensaje de éxito
        mostrarMensaje('Configuración guardada exitosamente', 'success');
        
        // Cerrar modal
        cerrarModalConfiguracion();
        
        // Refrescar la vista de productos para mostrar los nuevos formatos
        mostrarProductos();
        
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarMensaje('Error al guardar la configuración', 'error');
    } finally {
        $('#btnGuardarConfig').prop('disabled', false);
        $('#btnGuardarConfigText').text('Guardar Configuración');
    }
}

function abrirModalConfiguracion() {
    // Llenar el formulario con la configuración actual
    if (configuracion) {
        $('#simboloMoneda').val(configuracion.moneda.simbolo);
        $('#codigoMoneda').val(configuracion.moneda.codigo);
        $('#nombreMoneda').val(configuracion.moneda.nombre);
        $('#posicionMoneda').val(configuracion.moneda.posicion);
        $('#decimales').val(configuracion.formato.decimales);
        $('#separadorMiles').val(configuracion.formato.separadorMiles);
        $('#separadorDecimal').val(configuracion.formato.separadorDecimal);
        
        // Actualizar vista previa
        actualizarVistaPrevia();
    }
    
    $('#modalConfiguracion').removeClass('hidden');
}

function cerrarModalConfiguracion() {
    $('#modalConfiguracion').addClass('hidden');
    $('#formConfiguracion')[0].reset();
}

function actualizarVistaPrevia() {
    const simbolo = $('#simboloMoneda').val();
    const posicion = $('#posicionMoneda').val();
    const decimales = parseInt($('#decimales').val()) || 2;
    const separadorMiles = $('#separadorMiles').val();
    const separadorDecimal = $('#separadorDecimal').val();
    
    // Simular un precio para la vista previa
    const precioEjemplo = 1234.56;
    
    // Formatear el precio con la configuración actual
    let precioFormateado = precioEjemplo.toFixed(decimales);
    
    // Aplicar separadores
    if (separadorDecimal !== '.') {
        precioFormateado = precioFormateado.replace('.', separadorDecimal);
    }
    
    // Aplicar separador de miles
    if (separadorMiles) {
        const partes = precioFormateado.split(separadorDecimal);
        partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
        precioFormateado = partes.join(separadorDecimal);
    }
    
    // Agregar símbolo según posición
    if (posición === 'antes') {
        precioFormateado = simbolo + precioFormateado;
    } else {
        precioFormateado = precioFormateado + simbolo;
    }
    
    $('#vistaPrevia').text(precioFormateado);
}

// Funciones globales para los botones (necesarias para onclick)
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;

// Funciones de configuración
async function guardarConfiguracion(e) {
    e.preventDefault();
    
    const configuracion = {
        moneda: {
            simbolo: $('#simboloMoneda').val(),
            codigo: $('#codigoMoneda').val().toUpperCase(),
            nombre: $('#nombreMoneda').val(),
            posicion: $('#posicionMoneda').val()
        },
        formato: {
            decimales: parseInt($('#decimales').val()),
            separadorMiles: $('#separadorMiles').val(),
            separadorDecimal: $('#separadorDecimal').val()
        }
    };
    
    try {
        $('#btnGuardarConfig').prop('disabled', true);
        $('#btnGuardarConfigText').text('Guardando...');
        
        const response = await $.ajax({
            url: CONFIG_API,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(configuracion)
        });
        
        
        // Mostrar mensaje de éxito
        mostrarMensaje('Configuración guardada exitosamente', 'success');
        
        // Cerrar modal
        cerrarModalConfiguracion();
        
        // Refrescar la vista de productos para mostrar los nuevos formatos
        mostrarProductos();
        
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarMensaje('Error al guardar la configuración', 'error');
    } finally {
        $('#btnGuardarConfig').prop('disabled', false);
        $('#btnGuardarConfigText').text('Guardar Configuración');
    }
}

function abrirModalConfiguracion() {
    // Llenar el formulario con la configuración actual
    if (configuracion) {
        $('#simboloMoneda').val(configuracion.moneda.simbolo);
        $('#codigoMoneda').val(configuracion.moneda.codigo);
        $('#nombreMoneda').val(configuracion.moneda.nombre);
        $('#posicionMoneda').val(configuracion.moneda.posicion);
        $('#decimales').val(configuracion.formato.decimales);
        $('#separadorMiles').val(configuracion.formato.separadorMiles);
        $('#separadorDecimal').val(configuracion.formato.separadorDecimal);
        
        // Actualizar vista previa
        actualizarVistaPrevia();
    }
    
    $('#modalConfiguracion').removeClass('hidden');
}

function cerrarModalConfiguracion() {
    $('#modalConfiguracion').addClass('hidden');
    $('#formConfiguracion')[0].reset();
}

function actualizarVistaPrevia() {
    const simbolo = $('#simboloMoneda').val();
    const posicion = $('#posicionMoneda').val();
    const decimales = parseInt($('#decimales').val()) || 2;
    const separadorMiles = $('#separadorMiles').val();
    const separadorDecimal = $('#separadorDecimal').val();
    
    // Simular un precio para la vista previa
    const precioEjemplo = 1234.56;
    
    // Formatear el precio con la configuración actual
    let precioFormateado = precioEjemplo.toFixed(decimales);
    
    // Aplicar separadores
    if (separadorDecimal !== '.') {
        precioFormateado = precioFormateado.replace('.', separadorDecimal);
    }
    
    // Aplicar separador de miles
    if (separadorMiles) {
        const partes = precioFormateado.split(separadorDecimal);
        partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
        precioFormateado = partes.join(separadorDecimal);
    }
    
    // Agregar símbolo según posición
    if (posicion === 'antes') {
        precioFormateado = simbolo + precioFormateado;
    } else {
        precioFormateado = precioFormateado + simbolo;
    }
    
    $('#vistaPrevia').text(precioFormateado);
}

function formatearPrecio(precio) {
    // Si no hay configuración cargada, usar formato por defecto
    if (!configuracion) {
        return '$' + precio.toFixed(2);
    }
    
    const { moneda, formato } = configuracion;
    
    // Formatear el precio con la configuración
    let precioFormateado = precio.toFixed(formato.decimales);
    
    // Aplicar separadores
    if (formato.separadorDecimal !== '.') {
        precioFormateado = precioFormateado.replace('.', formato.separadorDecimal);
    }
    
    // Aplicar separador de miles
    if (formato.separadorMiles) {
        const partes = precioFormateado.split(formato.separadorDecimal);
        partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, formato.separadorMiles);
        precioFormateado = partes.join(formato.separadorDecimal);
    }
    
    // Agregar símbolo según posición
    if (moneda.posicion === 'antes') {
        return moneda.simbolo + precioFormateado;
    } else {
        return precioFormateado + moneda.simbolo;
    }
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const mensajeDiv = $(`
        <div class="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            tipo === 'success' ? 'bg-green-500' : 
            tipo === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white">
            ${mensaje}
        </div>
    `);
    
    $('body').append(mensajeDiv);
    
    setTimeout(() => {
        mensajeDiv.fadeOut(300, () => mensajeDiv.remove());
    }, 3000);
}

async function guardarConfiguracion(e) {
    e.preventDefault();
    
    const nuevaConfiguracion = {
        moneda: {
            simbolo: $('#simboloMoneda').val(),
            codigo: $('#codigoMoneda').val().toUpperCase(),
            nombre: $('#nombreMoneda').val(),
            posicion: $('#posicionMoneda').val()
        },
        formato: {
            decimales: parseInt($('#decimales').val()),
            separadorMiles: $('#separadorMiles').val(),
            separadorDecimal: $('#separadorDecimal').val()
        }
    };
    
    try {
        $('#btnGuardarConfig').prop('disabled', true);
        $('#btnGuardarConfigText').text('Guardando...');
        
        const response = await $.ajax({
            url: CONFIG_API,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(nuevaConfiguracion)
        });
        
        configuracion = nuevaConfiguracion;
        
        // Mostrar mensaje de éxito
        mostrarMensaje('Configuración guardada exitosamente', 'success');
        
        // Cerrar modal
        cerrarModalConfiguracion();
        
        // Refrescar la vista de productos para mostrar los nuevos formatos
        mostrarProductos();
        
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarMensaje('Error al guardar la configuración', 'error');
    } finally {
        $('#btnGuardarConfig').prop('disabled', false);
        $('#btnGuardarConfigText').text('Guardar Configuración');
    }
}

function abrirModalConfiguracion() {
    // Llenar el formulario con la configuración actual
    if (configuracion) {
        $('#simboloMoneda').val(configuracion.moneda.simbolo);
        $('#codigoMoneda').val(configuracion.moneda.codigo);
        $('#nombreMoneda').val(configuracion.moneda.nombre);
        $('#posicionMoneda').val(configuracion.moneda.posicion);
        $('#decimales').val(configuracion.formato.decimales);
        $('#separadorMiles').val(configuracion.formato.separadorMiles);
        $('#separadorDecimal').val(configuracion.formato.separadorDecimal);
        
        // Actualizar vista previa
        actualizarVistaPrevia();
    }
    
    $('#modalConfiguracion').removeClass('hidden');
}

function cerrarModalConfiguracion() {
    $('#modalConfiguracion').addClass('hidden');
    $('#formConfiguracion')[0].reset();
}

function actualizarVistaPrevia() {
    const simbolo = $('#simboloMoneda').val() || '$';
    const posicion = $('#posicionMoneda').val() || 'antes';
    const decimales = parseInt($('#decimales').val()) || 2;
    const separadorMiles = $('#separadorMiles').val() || ',';
    const separadorDecimal = $('#separadorDecimal').val() || '.';
    
    // Simular un precio para la vista previa
    const precioEjemplo = 1234.56;
    
    // Formatear el precio con la configuración actual
    let precioFormateado = precioEjemplo.toFixed(decimales);
    
    // Aplicar separadores
    if (separadorDecimal !== '.') {
        precioFormateado = precioFormateado.replace('.', separadorDecimal);
    }
    
    // Aplicar separador de miles
    if (separadorMiles) {
        const partes = precioFormateado.split(separadorDecimal);
        partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
        precioFormateado = partes.join(separadorDecimal);
    }
    
    // Agregar símbolo según posición
    if (posicion === 'antes') {
        precioFormateado = simbolo + precioFormateado;
    } else {
        precioFormateado = precioFormateado + simbolo;
    }
    
    $('#vistaPrevia').text(precioFormateado);
}

// Funciones para gestión de imágenes múltiples
async function agregarImagenesAProducto(productoId, formData) {
    const response = await $.ajax({
        url: `/api/productos/${productoId}/imagenes`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        data: formData,
        processData: false,
        contentType: false
    });
    return response;
}

async function marcarComoFavorita(productoId, rutaImagen) {
    try {
        console.log('🎯 marcarComoFavorita llamada:', { productoId, rutaImagen });
        
        // Encontrar el producto en la lista local
        const producto = productos.find(p => p.id === productoId);
        if (!producto || !producto.imagenes) {
            throw new Error('Producto o imágenes no encontradas');
        }
        
        console.log('📋 Imágenes ANTES del reordenamiento:', producto.imagenes);
        
        // Reordenar imágenes en el frontend: la imagen favorita va primero
        const nuevasImagenes = [rutaImagen];
        producto.imagenes.forEach(img => {
            if (img !== rutaImagen) {
                nuevasImagenes.push(img);
            }
        });
        
        console.log('📋 Imágenes DESPUÉS del reordenamiento:', nuevasImagenes);
        
        // Enviar el array completo reordenado al servidor
        const response = await $.ajax({
            url: `/api/productos/${productoId}/imagenes`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ imagenes: nuevasImagenes })
        });
        
        console.log('✅ Respuesta del servidor:', response);
        
        // Actualizar el producto localmente sin recargar desde el servidor
        const indiceProducto = productos.findIndex(p => p.id === productoId);
        if (indiceProducto !== -1) {
            productos[indiceProducto].imagenes = nuevasImagenes;
            console.log('🔄 Producto actualizado localmente:', productos[indiceProducto].imagenes);
        }
        
        mostrarMensaje('Imagen favorita actualizada', 'success');
        
        // Si el modal está abierto, actualizar solo la vista de imágenes
        if (productoEditando && productoEditando.id === productoId) {
            console.log('🖼️ Actualizando vista de imágenes en modal...');
            const productoActualizado = productos.find(p => p.id === productoId);
            if (productoActualizado) {
                console.log('📷 Mostrando imágenes actualizadas:', productoActualizado.imagenes);
                mostrarImagenesActuales(productoActualizado);
            }
        }
        
        // Actualizar la vista principal también
        mostrarProductos();
    } catch (error) {
        console.error('Error al cambiar imagen favorita:', error);
        mostrarMensaje('Error al cambiar imagen favorita', 'error');
    }
}

async function eliminarImagenProducto(productoId, rutaImagen) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
        return;
    }
    
    try {
        const response = await $.ajax({
            url: `/api/productos/${productoId}/imagenes`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ rutaImagen })
        });
        
        mostrarMensaje('Imagen eliminada correctamente', 'success');
        await cargarProductos();
        
        // Si el modal está abierto, actualizar la vista de imágenes
        if (productoEditando && productoEditando.id === productoId) {
            const producto = productos.find(p => p.id === productoId);
            if (producto) {
                mostrarImagenesActuales(producto);
            }
        }
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        mostrarMensaje('Error al eliminar imagen', 'error');
    }
}

// Función para seleccionar/deseleccionar productos
function seleccionarProducto(productoId) {
    // Si ya está seleccionado, deseleccionar
    if (productoSeleccionado === productoId) {
        productoSeleccionado = null;
        $(`#producto-${productoId}`).removeClass('seleccionado');
        return;
    }
    
    // Deseleccionar el producto anterior si existe
    if (productoSeleccionado !== null) {
        $(`#producto-${productoSeleccionado}`).removeClass('seleccionado');
    }
    
    // Seleccionar el nuevo producto
    productoSeleccionado = productoId;
    $(`#producto-${productoId}`).addClass('seleccionado');
}

// Hacer funciones globales para los botones onclick
window.marcarComoFavorita = marcarComoFavorita;
window.eliminarImagenProducto = eliminarImagenProducto;
window.seleccionarProducto = seleccionarProducto;

window.abrirModalConfiguracion = abrirModalConfiguracion;

// ================== GESTIÓN DE MARCAS ==================

// Variables globales para marcas
let marcas = [];
let marcaEditando = null;

// Cargar marcas desde la API
async function cargarMarcas() {
    try {
        const response = await $.ajax({
            url: '/api/marcas',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        marcas = response;
        actualizarSelectorMarcas();
        mostrarListaMarcas();
    } catch (error) {
        console.error('Error al cargar marcas:', error);
        mostrarMensaje('Error al cargar marcas', 'error');
    }
}

// Actualizar el selector de marcas en el formulario de producto
function actualizarSelectorMarcas() {
    const selector = $('#marca');
    selector.empty();
    selector.append('<option value="">Seleccionar marca</option>');
    
    marcas.forEach(marca => {
        selector.append(`<option value="${marca.nombre}">${marca.nombre}</option>`);
    });
}

// Mostrar lista de marcas en el modal
function mostrarListaMarcas() {
    const container = $('#listaMarcas');
    container.empty();
    
    if (marcas.length === 0) {
        container.html('<p class="text-gray-500 text-center py-4">No hay marcas registradas</p>');
        return;
    }
    
    marcas.forEach(marca => {
        const logoHtml = marca.logo ? 
            `<img src="${marca.logo}" alt="Logo ${marca.nombre}" class="w-8 h-8 object-contain rounded">` :
            `<div class="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">Sin logo</div>`;
            
        const marcaHtml = `
            <div class="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div class="flex items-center gap-3">
                    ${logoHtml}
                    <div>
                        <div class="font-medium">${marca.nombre}</div>
                        ${marca.descripcion ? `<div class="text-sm text-gray-600">${marca.descripcion}</div>` : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editarMarca(${marca.id})" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarMarca(${marca.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.append(marcaHtml);
    });
}

// Abrir modal de gestión de marcas
function abrirModalMarcas() {
    cargarMarcas();
    $('#modalMarcas').removeClass('hidden');
}

// Cerrar modal de gestión de marcas
function cerrarModalMarcas() {
    $('#modalMarcas').addClass('hidden');
    limpiarFormularioMarca();
}

// Abrir formulario para nueva marca
function nuevaMarca() {
    marcaEditando = null;
    limpiarFormularioMarca();
    $('#tituloFormularioMarca').text('Nueva Marca');
    $('#formularioMarca').removeClass('hidden');
}

// Limpiar formulario de marca
function limpiarFormularioMarca() {
    $('#formMarca')[0].reset();
    $('#logoPreview').addClass('hidden');
    $('#logoActual').addClass('hidden');
    marcaEditando = null;
}

// Editar marca existente
function editarMarca(marcaId) {
    marcaEditando = marcas.find(m => m.id === marcaId);
    if (!marcaEditando) return;
    
    $('#nombreMarca').val(marcaEditando.nombre);
    $('#descripcionMarca').val(marcaEditando.descripcion || '');
    
    // Mostrar logo actual si existe
    if (marcaEditando.logo) {
        $('#logoActual img').attr('src', marcaEditando.logo);
        $('#logoActual').removeClass('hidden');
    } else {
        $('#logoActual').addClass('hidden');
    }
    
    $('#logoPreview').addClass('hidden');
    $('#tituloFormularioMarca').text('Editar Marca');
    $('#formularioMarca').removeClass('hidden');
}

// Manejar selección de logo
function manejarSeleccionLogo() {
    const input = $('#logoMarca')[0];
    const file = input.files[0];
    
    if (file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            mostrarMensaje('Por favor selecciona un archivo de imagen válido', 'error');
            input.value = '';
            return;
        }
        
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            mostrarMensaje('El archivo es demasiado grande. Máximo 5MB', 'error');
            input.value = '';
            return;
        }
        
        // Mostrar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#logoPreview img').attr('src', e.target.result);
            $('#logoPreview').removeClass('hidden');
            $('#logoActual').addClass('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        $('#logoPreview').addClass('hidden');
        if (marcaEditando && marcaEditando.logo) {
            $('#logoActual').removeClass('hidden');
        }
    }
}

// Guardar marca (crear o actualizar)
async function guardarMarca(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('nombre', $('#nombreMarca').val().trim());
    formData.append('descripcion', $('#descripcionMarca').val().trim());
    
    const logoInput = $('#logoMarca')[0];
    if (logoInput.files[0]) {
        formData.append('logo', logoInput.files[0]);
    }
    
    try {
        const url = marcaEditando ? `/api/marcas/${marcaEditando.id}` : '/api/marcas';
        const method = marcaEditando ? 'PUT' : 'POST';
        
        const response = await $.ajax({
            url: url,
            method: method,
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const mensaje = marcaEditando ? 'Marca actualizada correctamente' : 'Marca creada correctamente';
        mostrarMensaje(mensaje, 'success');
        
        limpiarFormularioMarca();
        $('#formularioMarca').addClass('hidden');
        await cargarMarcas();
        
    } catch (error) {
        console.error('Error al guardar marca:', error);
        const mensaje = error.responseJSON?.error || 'Error al guardar marca';
        mostrarMensaje(mensaje, 'error');
    }
}

// Eliminar marca
async function eliminarMarca(marcaId) {
    const marca = marcas.find(m => m.id === marcaId);
    if (!marca) return;
    
    if (!confirm(`¿Estás seguro de que deseas eliminar la marca "${marca.nombre}"?`)) {
        return;
    }
    
    try {
        await $.ajax({
            url: `/api/marcas/${marcaId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        mostrarMensaje('Marca eliminada correctamente', 'success');
        await cargarMarcas();
        
    } catch (error) {
        console.error('Error al eliminar marca:', error);
        const mensaje = error.responseJSON?.error || 'Error al eliminar marca';
        mostrarMensaje(mensaje, 'error');
    }
}

// Cancelar edición de marca
function cancelarMarca() {
    limpiarFormularioMarca();
    $('#formularioMarca').addClass('hidden');
}

// Configurar eventos de marcas
function configurarEventosMarcas() {
    // Eventos del modal de marcas
    $('#btnGestionMarcas').on('click', abrirModalMarcas);
    $('#btnCerrarModalMarcas').on('click', cerrarModalMarcas);
    $('#btnNuevaMarca').on('click', nuevaMarca);
    $('#btnCancelarMarca').on('click', cancelarMarca);
    $('#formMarca').on('submit', guardarMarca);
    $('#logoMarca').on('change', manejarSeleccionLogo);
    
    // Cerrar modal al hacer clic fuera
    $('#modalMarcas').on('click', function(e) {
        if (e.target === this) {
            cerrarModalMarcas();
        }
    });
}

// Hacer funciones globales para los botones onclick
window.abrirModalMarcas = abrirModalMarcas;
window.cerrarModalMarcas = cerrarModalMarcas;
window.nuevaMarca = nuevaMarca;
window.editarMarca = editarMarca;
window.eliminarMarca = eliminarMarca;
window.cancelarMarca = cancelarMarca;
window.manejarSeleccionLogo = manejarSeleccionLogo;

// ================== GESTIÓN DE EXCEL ==================

// Exportar datos a Excel
async function exportarExcel() {
    try {
        mostrarMensaje('Generando archivo Excel...', 'info');
        
        const response = await fetch('/api/excel/exportar', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al exportar datos');
        }
        
        // Obtener el blob del archivo
        const blob = await response.blob();
        
        // Crear URL temporal y descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Obtener nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'catalogo_productos.xlsx';
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename="([^"]+)"/);
            if (matches) {
                filename = matches[1];
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        mostrarMensaje('Archivo Excel descargado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        mostrarMensaje('Error al exportar datos a Excel', 'error');
    }
}

// Abrir modal de importación
function abrirModalImportarExcel() {
    limpiarFormularioImportacion();
    $('#modalImportarExcel').removeClass('hidden');
}

// Cerrar modal de importación
function cerrarModalImportarExcel() {
    $('#modalImportarExcel').addClass('hidden');
    limpiarFormularioImportacion();
}

// Limpiar formulario de importación
function limpiarFormularioImportacion() {
    $('#archivoExcel').val('');
    $('#archivoSeleccionado').addClass('hidden');
    $('#nombreArchivo').text('');
    $('#btnProcesarImportacion').prop('disabled', true);
    $('#resultadoImportacion').addClass('hidden');
}

// Manejar selección de archivo Excel
function manejarSeleccionArchivoExcel() {
    const input = $('#archivoExcel')[0];
    const file = input.files[0];
    
    if (file) {
        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            mostrarMensaje('Por favor selecciona un archivo Excel (.xlsx)', 'error');
            input.value = '';
            return;
        }
        
        // Validar tamaño (máx 10MB)
        if (file.size > 10 * 1024 * 1024) {
            mostrarMensaje('El archivo es demasiado grande. Máximo 10MB', 'error');
            input.value = '';
            return;
        }
        
        // Mostrar archivo seleccionado
        $('#nombreArchivo').text(file.name);
        $('#archivoSeleccionado').removeClass('hidden');
        $('#btnProcesarImportacion').prop('disabled', false);
    } else {
        limpiarFormularioImportacion();
    }
}

// Quitar archivo seleccionado
function quitarArchivoExcel() {
    limpiarFormularioImportacion();
}

// Procesar importación
async function procesarImportacion() {
    const input = $('#archivoExcel')[0];
    const file = input.files[0];
    
    if (!file) {
        mostrarMensaje('Por favor selecciona un archivo', 'error');
        return;
    }
    
    try {
        $('#btnProcesarImportacion').prop('disabled', true);
        mostrarMensaje('Procesando archivo Excel...', 'info');
        
        const formData = new FormData();
        formData.append('archivo', file);
        
        const response = await $.ajax({
            url: '/api/excel/importar',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        // Mostrar resultados
        const resultados = response.resultados;
        let mensaje = `
            <div class="space-y-2">
                <p><strong>Importación completada:</strong></p>
                <p>• Productos importados: ${resultados.productosImportados}</p>
                <p>• Marcas importadas: ${resultados.marcasImportadas}</p>
        `;
        
        if (resultados.errores && resultados.errores.length > 0) {
            mensaje += `
                <p class="text-red-600"><strong>Errores encontrados:</strong></p>
                <ul class="text-sm text-red-600 max-h-32 overflow-y-auto">
            `;
            resultados.errores.forEach(error => {
                mensaje += `<li>• ${error}</li>`;
            });
            mensaje += '</ul>';
        }
        
        mensaje += '</div>';
        
        $('#resultadoImportacion')
            .removeClass('hidden bg-red-50 border-red-200 text-red-800 bg-green-50 border-green-200 text-green-800')
            .addClass(resultados.errores && resultados.errores.length > 0 ? 
                'bg-yellow-50 border-yellow-200 text-yellow-800' : 
                'bg-green-50 border-green-200 text-green-800'
            )
            .addClass('border')
            .html(mensaje);
        
        // Recargar datos
        await cargarProductos();
        await cargarMarcas();
        
        mostrarMensaje('Importación completada correctamente', 'success');
        
    } catch (error) {
        console.error('Error al importar Excel:', error);
        const mensaje = error.responseJSON?.error || 'Error al importar archivo Excel';
        mostrarMensaje(mensaje, 'error');
        
        $('#resultadoImportacion')
            .removeClass('hidden bg-green-50 border-green-200 text-green-800 bg-yellow-50 border-yellow-200 text-yellow-800')
            .addClass('bg-red-50 border-red-200 text-red-800 border')
            .html(`<p><strong>Error:</strong> ${mensaje}</p>`);
    } finally {
        $('#btnProcesarImportacion').prop('disabled', false);
    }
}

// Configurar eventos de Excel
function configurarEventosExcel() {
    // Eventos de exportar/importar
    $('#btnExportarExcel').on('click', exportarExcel);
    $('#btnImportarExcel').on('click', abrirModalImportarExcel);
    
    // Eventos del modal de importación
    $('#btnCerrarModalImportar, #btnCancelarImportacion').on('click', cerrarModalImportarExcel);
    $('#archivoExcel').on('change', manejarSeleccionArchivoExcel);
    $('#btnQuitarArchivo').on('click', quitarArchivoExcel);
    $('#btnProcesarImportacion').on('click', procesarImportacion);
    
    // Cerrar modal al hacer clic fuera
    $('#modalImportarExcel').on('click', function(e) {
        if (e.target === this) {
            cerrarModalImportarExcel();
        }
    });
}

// Hacer funciones globales para Excel
window.exportarExcel = exportarExcel;
window.abrirModalImportarExcel = abrirModalImportarExcel;
window.cerrarModalImportarExcel = cerrarModalImportarExcel;
window.manejarSeleccionArchivoExcel = manejarSeleccionArchivoExcel;
window.quitarArchivoExcel = quitarArchivoExcel;
window.procesarImportacion = procesarImportacion;
