const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

async function crearAdminInicial() {
    try {
        const userId = uuidv4();
        const email = 'admin@prodcat.com';
        const password = 'admin123';
        const nombre = 'Administrador';
        
        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);
        
        // Crear usuario administrador
        const admin = {
            id: userId,
            email,
            password: passwordEncriptada,
            nombre,
            rol: 'administrador',
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: null,
            activo: true
        };
        
        // Guardar en archivo
        const usersDir = path.join(__dirname, 'data', 'users');
        await fs.mkdir(usersDir, { recursive: true });
        
        const userFile = path.join(usersDir, `${userId}.json`);
        await fs.writeFile(userFile, JSON.stringify(admin, null, 2));
        
        console.log('✅ Usuario administrador creado exitosamente:');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Contraseña: ${password}`);
        console.log(`🆔 UUID: ${userId}`);
        console.log(`📁 Archivo: ${userFile}`);
        
    } catch (error) {
        console.error('❌ Error creando administrador inicial:', error);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    crearAdminInicial();
}

module.exports = { crearAdminInicial };
