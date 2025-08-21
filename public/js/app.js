// Variables globales
let productos = [];
let productoEditando = null;
let productoAEliminar = null;
let imagenAEliminar = false;

// URLs de la API
const API_BASE = '/api/productos';

// Inicialización cuando el documento esté listo
$(document).ready(function() {
    inicializarApp();
});

function inicializarApp() {
    cargarProductos();
    configurarEventos();
}

function configurarEventos() {
    // Eventos del modal de producto
    $('#btnAgregarProducto').on('click', abrirModalAgregar);
    $('#btnCerrarModal, #btnCancelar').on('click', cerrarModalProducto);
    $('#formProducto').on('submit', guardarProducto);
    
    // Eventos del modal de confirmación
    $('#btnCancelarEliminacion').on('click', cerrarModalConfirmacion);
    $('#btnConfirmarEliminacion').on('click', confirmarEliminacion);
    
    // Eventos de búsqueda y filtros
    $('#buscarProducto').on('input', filtrarProductos);
    $('#filtroCategoria').on('change', filtrarProductos);
    $('#btnLimpiarFiltros').on('click', limpiarFiltros);
    
    // Eventos de imagen
    $('#imagen').on('change', manejarSeleccionImagen);
    $('#btnEliminarImagen').on('click', eliminarImagenPreview);
    $('#btnCambiarImagen').on('click', cambiarImagen);
    $('#btnEliminarImagenActual').on('click', eliminarImagenActual);
    
    // Cerrar modales al hacer clic fuera de ellos
    $('#modalProducto, #modalConfirmacion').on('click', function(e) {
        if (e.target === this) {
            cerrarModalProducto();
            cerrarModalConfirmacion();
        }
    });
}

// Funciones de la API
async function cargarProductos() {
    try {
        mostrarCargando();
        const response = await $.get(API_BASE);
        productos = response;
        actualizarInterfaz();
        mostrarToast('Productos cargados correctamente', 'success');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarToast('Error al cargar productos', 'error');
    }
}

async function crearProducto(formData) {
    try {
        const response = await $.ajax({
            url: API_BASE,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false
        });
        return response;
    } catch (error) {
        console.error('Error al crear producto:', error);
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
            contentType: false
        });
        return response;
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        throw error;
    }
}

async function eliminarProducto(id) {
    try {
        await $.ajax({
            url: `${API_BASE}/${id}`,
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
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
    
    const productosHTML = productosAMostrar.map(producto => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
            ${producto.imagen ? `
                <div class="h-48 bg-gray-200">
                    <img src="/${producto.imagen}" alt="${escapeHtml(producto.nombre)}" 
                         class="w-full h-full object-cover">
                </div>
            ` : `
                <div class="h-48 bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-image text-4xl text-gray-400"></i>
                </div>
            `}
            
            <div class="p-6">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-semibold text-gray-900 truncate">${escapeHtml(producto.nombre)}</h3>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${escapeHtml(producto.categoria)}
                    </span>
                </div>
                
                ${producto.descripcion ? `<p class="text-gray-600 text-sm mb-3 line-clamp-2">${escapeHtml(producto.descripcion)}</p>` : ''}
                
                <div class="space-y-2 mb-4">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-gray-700">Precio:</span>
                        <span class="text-lg font-bold text-green-600">$${producto.precio.toFixed(2)}</span>
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
                    <button onclick="abrirModalEditar(${producto.id})" 
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm transition duration-300">
                        <i class="fas fa-edit mr-1"></i>
                        Editar
                    </button>
                    <button onclick="abrirModalEliminar(${producto.id})" 
                            class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition duration-300">
                        <i class="fas fa-trash mr-1"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    contenedor.html(productosHTML);
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
    imagenAEliminar = false;
    $('#tituloModal').text('Editar Producto');
    $('#btnGuardar').text('Actualizar');
    
    // Llenar formulario con datos del producto
    $('#nombre').val(producto.nombre);
    $('#descripcion').val(producto.descripcion);
    $('#precio').val(producto.precio);
    $('#stock').val(producto.stock);
    $('#categoria').val(producto.categoria);
    
    // Manejar imagen actual
    resetearImagenes();
    if (producto.imagen) {
        mostrarImagenActual(producto.imagen);
    }
    
    $('#modalProducto').removeClass('hidden');
    $('#nombre').focus();
}

function cerrarModalProducto() {
    $('#modalProducto').addClass('hidden');
    limpiarFormulario();
    resetearImagenes();
    productoEditando = null;
    imagenAEliminar = false;
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
    
    // Agregar imagen si se seleccionó una nueva
    const archivoImagen = $('#imagen')[0].files[0];
    if (archivoImagen) {
        formData.append('imagen', archivoImagen);
    }
    
    // Si se marcó para eliminar la imagen actual
    if (imagenAEliminar) {
        formData.append('eliminarImagen', 'true');
    }
    
    try {
        const btnGuardar = $('#btnGuardar');
        btnGuardar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...');
        
        if (productoEditando) {
            await actualizarProducto(productoEditando.id, formData);
            mostrarToast('Producto actualizado correctamente', 'success');
        } else {
            await crearProducto(formData);
            mostrarToast('Producto agregado correctamente', 'success');
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
    
    mostrarProductos(productosFiltrados);
}

function limpiarFiltros() {
    $('#buscarProducto').val('');
    $('#filtroCategoria').val('');
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

// Funciones de manejo de imágenes
function manejarSeleccionImagen(e) {
    const archivo = e.target.files[0];
    if (!archivo) {
        ocultarPreviewImagen();
        return;
    }
    
    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
        mostrarToast('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)', 'error');
        $('#imagen').val('');
        ocultarPreviewImagen();
        return;
    }
    
    // Validar tamaño (5MB)
    if (archivo.size > 5 * 1024 * 1024) {
        mostrarToast('El archivo es muy grande. Máximo 5MB permitido.', 'error');
        $('#imagen').val('');
        ocultarPreviewImagen();
        return;
    }
    
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#imagenPreview').attr('src', e.target.result);
        mostrarPreviewImagen();
        ocultarImagenActual();
    };
    reader.readAsDataURL(archivo);
}

function mostrarPreviewImagen() {
    $('#previewImagen').removeClass('hidden');
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
    ocultarPreviewImagen();
    ocultarImagenActual();
    $('#imagen').show().val('');
    imagenAEliminar = false;
}

// Funciones globales para los botones (necesarias para onclick)
window.abrirModalEditar = abrirModalEditar;
window.abrirModalEliminar = abrirModalEliminar;
