/// <reference types="cypress" />

describe('Registro de usuarios', () => {
  beforeEach(() => {
    // Limpia la BD antes de cada prueba (modo testing)
    cy.exec('php artisan migrate:fresh --seed --env=testing');
    cy.request('GET', 'http://localhost:8000/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    })
    cy.visit('http://localhost:8000/register');
  });

  it('SIS-USU-004: Registro exitoso', () => {
    cy.get('h2').contains('Crear Cuenta');
    cy.get('input[name="cedula"]').type('1890773041');
    cy.get('input[name="name"]').type('Juan');
    cy.get('input[name="surname"]').type('Atreides');
    cy.get('input[name="phone"]').type('0987551827');
    cy.get('input[name="address"]').type('Calle de Juan');
    cy.get('[name="gender"]').parent().within(() => {
      cy.get('[role="combobox"]').click();   // abre el dropdown
    });
    cy.get('[role="option"]').contains('Hombre').click();
    cy.get('[name="role"]').parent().within(() => {
      cy.get('[role="combobox"]').click();   // abre el dropdown
    });
    cy.get('[role="option"]').contains('Vendedor').click();
    cy.get('input[name="email"]').type('johanatreidesi66@gmail.com');
    cy.get('input[name="password"]').type('Admin123@');
    cy.get('input[name="password_confirmation"]').type('Admin123@');

    cy.get('button[type="submit"]').contains('Crear cuenta').click();

    // Espera la redirección a la verificación de correo
    cy.url({ timeout: 5000 }).should('include', '/verify-email');
    cy.contains('Verificar email');
    cy.request('GET', '/testing/users').then((response) => {
      const user = response.body.find(u => u.email === 'johanatreidesi66@gmail.com');
      console.log(user)
      expect(user).to.exist;
    });

    // Verifica que se haya creado en la BD
  });

  it('SIS-USU-005: Registro inválido', () => {
    // Primero creamos un usuario existente
    cy.request('POST', '/testing/user', {
      email: 'johanatreidesi66@gmail.com',
      phone: '0987551827',
      password: 'Admin123@'
    }).then((response) => {
      expect(response.status).to.eq(200);
    });

    cy.get('h2').contains('Crear Cuenta');
    cy.get('input[name="name"]').type('Juan');
    cy.get('input[name="surname"]').type('Atreides');
    cy.get('input[name="phone"]').type('0987551827');
    cy.get('input[name="address"]').type('Calle de Juan');
    cy.get('[name="role"]').parent().within(() => {
      cy.get('[role="combobox"]').click();   // abre el dropdown
    });
    cy.get('[role="option"]').contains('Vendedor').click();
    cy.get('input[name="email"]').type('johanatreidesi66@gmail.com');
    cy.get('input[name="password"]').type('Admin123@');
    cy.get('input[name="password_confirmation"]').type('Admin123@');

    cy.get('button[type="submit"]').contains('Crear cuenta').click();

    // Debe mantenerse en la página de registro
    cy.url().should('include', '/register');

    // Verifica que los mensajes de error aparecen
    cy.contains('The cedula field is required.');
    cy.contains('The phone has already been taken.');
    cy.contains('The email has already been taken.');

    // Verifica que no se haya creado un nuevo usuario
    cy.request('GET', '/testing/users').then((response) => {
      const users = response.body.filter(u => u.email === 'johanatreidesi66@gmail.com');
      expect(users).to.have.length(1);
    });
  });
});