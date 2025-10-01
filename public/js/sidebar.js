document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const toggleButton = document.getElementById('toggleSidebar');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    // Estado inicial del sidebar
    let sidebarOpen = false;

    // Asegurarnos que el sidebar esté oculto y el icono rotado al inicio
    sidebar.classList.add('-translate-x-full');
    toggleButton.querySelector('i').classList.add('rotate-180');

    // Función para alternar el sidebar
    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        if (sidebarOpen) {
            sidebar.classList.remove('-translate-x-full');
            content.classList.add('ml-64');
            toggleButton.querySelector('i').classList.remove('rotate-180');
        } else {
            sidebar.classList.add('-translate-x-full');
            content.classList.remove('ml-64');
            toggleButton.querySelector('i').classList.add('rotate-180');
        }
    }
    

    // Event listener para el botón de alternar
    toggleButton.addEventListener('click', toggleSidebar);

    // Efecto hover para los items del sidebar
    sidebarItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.classList.add('bg-gray-100');
        });
        
        item.addEventListener('mouseleave', () => {
            item.classList.remove('bg-gray-100');
        });
        
        item.addEventListener('click', () => {
            // Remover la clase activa de todos los items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Agregar la clase activa al item clickeado
            item.classList.add('active');
        });
    });
});