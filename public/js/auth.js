// Configuración de la API
const API_BASE = '/api/auth';

// Variables globales
let isLogin = true;

// Inicialización cuando el documento esté listo
$(document).ready(function() {
    inicializarAuth();
    verificarSesionExistente();
});

function inicializarAuth() {
    configurarEventos();
}

function configurarEventos() {
    // Eventos del formulario de login
    $('#loginForm').on('submit', manejarLogin);
    $('#registerForm').on('submit', manejarRegistro);
    
    // Eventos para cambiar entre login y registro
    $('#showRegister').on('click', mostrarRegistro);
    $('#showLogin').on('click', mostrarLogin);
    
    // Evento para mostrar/ocultar contraseña
    $('#togglePassword').on('click', togglePassword);
    
    // Validación en tiempo real de confirmación de contraseña
    $('#regPasswordConfirm').on('input', validarConfirmacionPassword);
}

function verificarSesionExistente() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Si hay token, verificar si es válido y redirigir
        verificarTokenValido(token);
    }
}

async function verificarTokenValido(token) {
    try {
        const response = await $.ajax({
            url: `${API_BASE}/perfil`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Token válido, redirigir a la aplicación principal
        window.location.href = '/';
    } catch (error) {
        // Token inválido, eliminar del localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
    }
}

async function manejarLogin(e) {
    e.preventDefault();
    
    const email = $('#email').val().trim();
    const password = $('#password').val();
    const recordar = $('#recordar').is(':checked');
    
    // Validaciones básicas
    if (!email || !password) {
        mostrarToast('Por favor, completa todos los campos', 'error');
        return;
    }
    
    try {
        mostrarCargandoLogin(true);
        
        const response = await $.ajax({
            url: `${API_BASE}/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password })
        });
        
        // Guardar token y información del usuario
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userInfo', JSON.stringify(response.usuario));
        
        if (recordar) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        mostrarToast('Inicio de sesión exitoso', 'success');
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        let mensaje = 'Error al iniciar sesión';
        if (error.responseJSON && error.responseJSON.error) {
            mensaje = error.responseJSON.error;
        }
        mostrarToast(mensaje, 'error');
    } finally {
        mostrarCargandoLogin(false);
    }
}

async function manejarRegistro(e) {
    e.preventDefault();
    
    const nombre = $('#regNombre').val().trim();
    const email = $('#regEmail').val().trim();
    const password = $('#regPassword').val();
    const passwordConfirm = $('#regPasswordConfirm').val();
    
    // Validaciones
    if (!nombre || !email || !password || !passwordConfirm) {
        mostrarToast('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        mostrarToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        mostrarCargandoRegistro(true);
        
        const response = await $.ajax({
            url: `${API_BASE}/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ nombre, email, password })
        });
        
        // Guardar token y información del usuario
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userInfo', JSON.stringify(response.usuario));
        
        mostrarToast('Registro exitoso. Bienvenido!', 'success');
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        let mensaje = 'Error al registrar usuario';
        if (error.responseJSON && error.responseJSON.error) {
            mensaje = error.responseJSON.error;
        }
        mostrarToast(mensaje, 'error');
    } finally {
        mostrarCargandoRegistro(false);
    }
}

function mostrarRegistro() {
    $('#registerCard').removeClass('hidden');
    $('html, body').animate({
        scrollTop: $('#registerCard').offset().top - 20
    }, 300);
}

function mostrarLogin() {
    $('#registerCard').addClass('hidden');
    $('html, body').animate({ scrollTop: 0 }, 300);
}

function togglePassword() {
    const passwordField = $('#password');
    const eyeIcon = $('#eyeIcon');
    
    if (passwordField.attr('type') === 'password') {
        passwordField.attr('type', 'text');
        eyeIcon.removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
        passwordField.attr('type', 'password');
        eyeIcon.removeClass('fa-eye-slash').addClass('fa-eye');
    }
}

function validarConfirmacionPassword() {
    const password = $('#regPassword').val();
    const passwordConfirm = $('#regPasswordConfirm').val();
    const confirmField = $('#regPasswordConfirm');
    
    if (passwordConfirm && password !== passwordConfirm) {
        confirmField.addClass('border-red-500');
        confirmField.removeClass('border-gray-300');
    } else {
        confirmField.removeClass('border-red-500');
        confirmField.addClass('border-gray-300');
    }
}

function mostrarCargandoLogin(mostrar) {
    const btn = $('#loginBtn');
    const text = $('#loginBtnText');
    const spinner = $('#loginSpinner');
    
    if (mostrar) {
        btn.prop('disabled', true);
        text.text('Iniciando sesión...');
        spinner.removeClass('hidden');
    } else {
        btn.prop('disabled', false);
        text.text('Iniciar Sesión');
        spinner.addClass('hidden');
    }
}

function mostrarCargandoRegistro(mostrar) {
    const btn = $('#registerBtn');
    const text = $('#registerBtnText');
    const spinner = $('#registerSpinner');
    
    if (mostrar) {
        btn.prop('disabled', true);
        text.text('Registrando...');
        spinner.removeClass('hidden');
    } else {
        btn.prop('disabled', false);
        text.text('Registrar Administrador');
        spinner.addClass('hidden');
    }
}

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
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        toast.addClass('hidden');
    }, 4000);
}
