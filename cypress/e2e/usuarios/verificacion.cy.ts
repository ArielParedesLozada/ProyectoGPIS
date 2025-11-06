/// <reference types="cypress" />

describe('Verificacion', () => {
  beforeEach(() => {
    cy.exec('php artisan migrate:fresh --seed --env=testing');
    cy.request('GET', 'http://localhost:8000/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
    cy.visit('http://localhost:8000/');
  });

  it('SIS-006: Envío de correo de verificación durante el registro', () => {
    cy.visit('http://localhost:8000/register');

    // Completar formulario de registro
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

    // Enviar formulario
    cy.get('button[type="submit"]').click();

    // Verificar redirección a página de verificación
    cy.url().should('include', '/verify-email');
    cy.contains('Verificar email');
  });

  it('SIS-007: Verificacion de enlace valido', () => {
    cy.request('POST', '/testing/user', {
      email: 'johanatreidesi66@gmail.com',
      password: 'Admin123@',
      email_verified_at: null,
    }).then((response) => {
      const user = response.body;

      cy.request(`/testing/verification-url/${user.id}`).then((res) => {
        const verificationUrl = res.body.url;
        cy.visit('http://localhost:8000/login')
        cy.get('input[name="email"]').type(user.email);
        cy.get('input[name="password"]').type('Admin123@');
        cy.get('button[type="submit"]').click();
        cy.wait(5000)
        cy.visit(verificationUrl);
        cy.url().should('include', '/publication');
        cy.get('span').contains('Publicaciones')
      });
    });

  });
})