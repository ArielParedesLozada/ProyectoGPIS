/// <reference types="cypress" />

describe('Pruebas de creacion de administradores', () => {
    const host = "http://localhost:8000"
    const adminEmail = "aparedes3001@uta.edu.ec"
    const vendedorEmail = "johanatreidesi66@gmail.com"
    const moderadorEmail = "jamesrnewman3125@gmail.com"
    const password = "Password123@"

    beforeEach(() => {
        cy.visit(`${host}/login`);
        cy.exec('php artisan migrate:fresh --seed --env=testing');
        cy.request('POST', `${host}/testing/user`, {
            email: adminEmail,
            password: password,
            role: "admin",
            email_verified_at: new Date(),
            is_active: true
        })
        cy.request('POST', `${host}/testing/user`, {
            email: vendedorEmail,
            password: password,
            role: "vendedor",
            email_verified_at: new Date(),
            is_active: true
        })
        cy.request('POST', `${host}/testing/user`, {
            email: moderadorEmail,
            password: password,
            role: "moderador",
            email_verified_at: new Date(),
            is_active: true
        })
    });

    it('SIS-USU-013: Se puede ver a los moderadores', () => {
        cy.get('input[name="email"]').type(adminEmail);
        cy.get('input[name="password"]').type(password);
        cy.visit(`${host}/admin/admins/`)
        cy.contains("Administradores").should("be.visible");
        cy.contains("Total Administradores").should("be.visible");
        cy.contains("Activos").should("be.visible");
        cy.contains("Inactivos").should("be.visible");

        cy.get("table").should("exist");
    })
})