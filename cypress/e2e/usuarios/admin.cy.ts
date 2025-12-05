/// <reference types="cypress" />


describe('Crear Administrador', () => {
    const host = "http://localhost:8000"
    const superAdminEmail = "johanatreidesi66@gmail.com"
    const password = "Admin123@"

    beforeEach(() => {
        // Limpiar base de datos antes de cada prueba
        cy.exec('php artisan migrate:fresh --seed --env=testing');

        // Crear super admin para las pruebas
        cy.request('POST', `${host}/testing/user`, {
            email: superAdminEmail,
            password: password,
            role: "super_admin",
            email_verified_at: new Date(),
            is_active: true
        });

        // Login como super admin
        cy.visit(`${host}/login`);
        cy.get('input[name="email"]').type(superAdminEmail);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();

        // Esperar a que se complete el login
        cy.url({ timeout: 10000 }).should('not.include', '/login');
    });
    it('SIS-USU-014: Crear un nuevo administrador exitosamente', () => {
        const adminData = {
            cedula: '1800123456',
            name: 'Juan',
            surname: 'Administrador',
            phone: '0987654321',
            address: 'Calle Principal 123',
            gender: 'Hombre',
            email: 'admin.test@example.com',
            password: 'Password123@',
            password_confirmation: 'Password123@'
        };

        // Navegar a la página de creación de administradores
        cy.visit(`${host}/admin/admins`);
        cy.contains('Administradores').should('be.visible');

        // Hacer clic en el botón "Crear Administrador"
        cy.contains('Crear Administrador', { timeout: 10000 }).click();

        // Verificar que estamos en la página de creación
        cy.url().should('include', '/admin/admins/create');
        cy.contains('Crear Administrador').should('be.visible');

        // Llenar el formulario
        cy.get('input[name="cedula"]').type(adminData.cedula);
        cy.get('input[name="name"]').type(adminData.name);
        cy.get('input[name="surname"]').type(adminData.surname);
        cy.get('input[name="phone"]').type(adminData.phone);
        cy.get('input[name="address"]').type(adminData.address);

        // Seleccionar género
        cy.get('[name="gender"]').parent().within(() => {
            cy.get('[role="combobox"]').click();
        });
        cy.get('[role="option"]').contains(adminData.gender).click();

        cy.get('input[name="email"]').type(adminData.email);
        cy.get('input[name="password"]').type(adminData.password);
        cy.get('input[name="password_confirmation"]').type(adminData.password_confirmation);

        // Enviar el formulario
        cy.get('button[type="submit"]').contains('Crear Administrador').click();

        // Verificar que se redirige a la lista de administradores
        cy.url({ timeout: 10000 }).should('include', '/admin/admins');
        cy.url().should('not.include', '/create');

        // Verificar en la base de datos que se creó
        cy.request('GET', `${host}/testing/users`).then((response) => {
            const admin = response.body.find((u: any) => u.email === adminData.email);
            expect(admin).to.exist;
            expect(admin.role).to.eq('admin');
            expect(admin.is_active).to.eq(true);
        });
    });
    it('SIS-USU-015: Crear un nuevo moderador exitosamente', () => {
        const moderatorData = {
            cedula: '1800987654',
            name: 'María',
            surname: 'Moderadora',
            phone: '0999888777',
            address: 'Avenida Secundaria 456',
            gender: 'Mujer',
            email: 'moderator.test@example.com',
            password: 'Password123@',
            password_confirmation: 'Password123@'
        };

        // Navegar a la página de creación de moderadores
        cy.visit(`${host}/admin/moderators`);
        cy.contains('Moderadores').should('be.visible');

        // Hacer clic en el botón "Crear Moderador"
        cy.contains('Crear Moderador', { timeout: 10000 }).click();

        // Verificar que estamos en la página de creación
        cy.url().should('include', '/admin/moderators/create');
        cy.contains('Crear Moderador').should('be.visible');

        // Llenar el formulario
        cy.get('input[name="cedula"]').type(moderatorData.cedula);
        cy.get('input[name="name"]').type(moderatorData.name);
        cy.get('input[name="surname"]').type(moderatorData.surname);
        cy.get('input[name="phone"]').type(moderatorData.phone);
        cy.get('input[name="address"]').type(moderatorData.address);

        // Seleccionar género
        cy.get('[name="gender"]').parent().within(() => {
            cy.get('[role="combobox"]').click();
        });
        cy.get('[role="option"]').contains(moderatorData.gender).click();

        cy.get('input[name="email"]').type(moderatorData.email);
        cy.get('input[name="password"]').type(moderatorData.password);
        cy.get('input[name="password_confirmation"]').type(moderatorData.password_confirmation);

        // Enviar el formulario
        cy.get('button[type="submit"]').contains('Crear Moderador').click();

        // Verificar que se redirige a la lista de moderadores
        cy.url({ timeout: 10000 }).should('include', '/admin/moderators');
        cy.url().should('not.include', '/create');

        // Verificar en la base de datos que se creó
        cy.request('GET', `${host}/testing/users`).then((response) => {
            const moderator = response.body.find((u: any) => u.email === moderatorData.email);
            expect(moderator).to.exist;
            expect(moderator.role).to.eq('moderador');
            expect(moderator.is_active).to.eq(true);
        });
    });
});