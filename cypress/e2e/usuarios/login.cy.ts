/// <reference types="cypress" />

describe('Login de usuarios', () => {

  beforeEach(() => {
    // Ajusta la URL base de tu servidor
    cy.visit('http://localhost:8000/login');
    cy.exec('php artisan migrate:fresh --env=testing');
  });

  it('SIS-USU-001', () => {
    cy.get('h2').contains('Iniciar Sesión');       // Verifica el título del formulario
    cy.get('input[name="email"]').should('exist'); // Campo email
    cy.get('input[name="password"]').should('exist'); // Campo password
    cy.get('button[type="submit"]').contains('Iniciar Sesión');
    cy.request('POST', '/testing/user', {
      email: 'superadmin@proyectogpis.com',
      password: 'Admin123@',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
    const email = 'superadmin@proyectogpis.com';
    const password = 'Admin123@';

    // Llenar formulario
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Verifica que se redirige a la página de publicaciones
    cy.url().should('include', '/publication');
    cy.contains('Publicaciones'); // Ajusta según el título de la página
  });

  it('SIS-USU-002', () => {
    cy.get('button[type="submit"]').contains('Iniciar Sesión');
    cy.request('POST', '/testing/user', {
      email: 'superadmin@proyectogpis.com',
      password: 'Admin123@',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
    const email = 'superadmin@proyectogpis.com';
    const password = 'sdcsdcasdcadc';

    // Llenar formulario
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Verifica que se redirige a la página de publicaciones
    cy.url().should('include', '/login');
    cy.contains('Iniciar Sesión'); // Ajusta según el título de la página
  });

  it('SIS-USU-003', () => {
    cy.get('button[type="submit"]').contains('Iniciar Sesión');
    cy.request('POST', '/testing/user', {
      email: 'superadmin@proyectogpis.com',
      password: 'Admin123@',
      email_verified_at: null,
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
    const email = 'superadmin@proyectogpis.com';
    const password = 'Admin123@';

    // Llenar formulario
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Verifica que se redirige a la página de publicaciones
    cy.url().should('include', '/verify-email');
    cy.contains('Verificar email'); // Ajusta según el título de la página
  });
});