/// <reference types="cypress" />

describe('Desactivar Usuario', () => {
    const host = "http://localhost:8000"
    const superAdminEmail = "johanatreidesi66@gmail.com"
    const password = "Admin123@"
    let adminId: number;
    let moderatorId: number;

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
        // Crear un administrador para desactivar
        cy.request('POST', `${host}/testing/user`, {
            email: 'admin.desactivar@example.com',
            password: password,
            role: "admin",
            email_verified_at: new Date(),
            is_active: true
        }).then((response) => {
            adminId = response.body.id;
        });

        // Crear un moderador para desactivar
        cy.request('POST', `${host}/testing/user`, {
            email: 'moderator.desactivar@example.com',
            password: password,
            role: "moderador",
            email_verified_at: new Date(),
            is_active: true
        }).then((response) => {
            moderatorId = response.body.id;
        });
    });

    it('SIS-USU-016: Desactivar un administrador', () => {
        cy.visit(`${host}/admin/admins`);

        cy.contains('Administradores').should('be.visible');

        // 1. Encontrar la fila del admin por email
        cy.contains('td', 'admin.desactivar@example.com')
            .parents('tr')
            .within(() => {

                // 2. Click en el botón del menú (los 3 puntos)
                cy.get('button')
                    .filter(':contains("•••"), :has(svg)')
                    .first()
                    .click({ force: true });
            });

        // 3. Ahora el menú aparece en el body por portal → buscarlo allí
        cy.get('body')
            .contains('Desactivar', { timeout: 3000 })
            .should('be.visible')
            .click({ force: true });

        // 4. Confirmación del modal
        cy.get('body').then(($body) => {
            if ($body.find('button').text().includes('Confirmar')) {
                cy.contains('button', 'Confirmar').click({ force: true });
            }
        });

        cy.wait(1000);

        // 5. Verificar en la base de datos
        cy.request(`${host}/testing/users`).then((response) => {
            const admin = response.body.find((u) => u.id === adminId);
            expect(admin.is_active).to.eq(false);
        });
    });

    it('SIS-USU-017: Desactivar un moderador', () => {
        cy.visit(`${host}/admin/moderators`);

        cy.contains('Moderadores').should('be.visible');

        // 1. Encontrar la fila del admin por email
        cy.contains('td', 'moderator.desactivar@example.com')
            .parents('tr')
            .within(() => {

                // 2. Click en el botón del menú (los 3 puntos)
                cy.get('button')
                    .filter(':contains("•••"), :has(svg)')
                    .first()
                    .click({ force: true });
            });

        // 3. Ahora el menú aparece en el body por portal → buscarlo allí
        cy.get('body')
            .contains('Desactivar', { timeout: 3000 })
            .should('be.visible')
            .click({ force: true });

        // 4. Confirmación del modal
        cy.get('body').then(($body) => {
            if ($body.find('button').text().includes('Confirmar')) {
                cy.contains('button', 'Confirmar').click({ force: true });
            }
        });

        cy.wait(1000);

        // 5. Verificar en la base de datos
        cy.request(`${host}/testing/users`).then((response) => {
            const moderator = response.body.find((u) => u.id === moderatorId);
            expect(moderator.is_active).to.eq(false);
        });
    });
});