/// <reference types="cypress" />

describe('Pruebas de recuperacion de contraseña', () => {
  const host = "http://localhost:8000"


  beforeEach(() => {
    // Ajusta la URL base de tu servidor
    cy.visit(`${host}/login`);
    cy.exec('php artisan migrate:fresh --env=testing');
    cy.request('POST', '/testing/user', {
      email: 'johanatreidesi66@gmail.com',
      password: 'Admin123@',
      email_verified_at: new Date(),
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it('SIS-USU-008 - Envío del enlace de restablecimiento', () => {
    const email = "johanatreidesi66@gmail.com"
    cy.visit(`${host}/forgot-password`);

    cy.get('input[name="email"]').type(email);

    cy.get('button[type="submit"]').click();

    cy.wait(5000)
    cy.contains('Se enviará un enlace de recuperación si la cuenta existe.').should('be.visible');
    cy.request(`${host}/testing/verify-password-reset-token/${email}`)
      .then((data) => {
        const body = data.body
        expect(body).to.have.property('token');
        expect(body.token).to.exist;
      })

  });

  it('SIS-USU-009 - Pantalla de reset accesible', () => {
    const email = "johanatreidesi66@gmail.com"
    cy.visit(`${host}/forgot-password`);

    cy.get('input[name="email"]').type(email);

    cy.get('button[type="submit"]').click();

    cy.wait(5000)
    cy.contains('Se enviará un enlace de recuperación si la cuenta existe.').should('be.visible');
    cy.request('POST', `${host}/testing/create-password-reset-token`, { email })
      .then((res) => {
        const url = res.body.url;
        cy.visit(url);
        cy.get('input[name="email"]').should('have.value', email);
      });
  });

  it('SIS-USU-010', () => {
    const email = "johanatreidesi66@gmail.com"
    const password = "NewPassword"
    cy.visit(`${host}/forgot-password`);
    cy.get('input[name="email"]').type(email);
    cy.get('button[type="submit"]').click();

    cy.wait(5000)
    cy.contains('Se enviará un enlace de recuperación si la cuenta existe.').should('be.visible');
    cy.request('POST', `${host}/testing/create-password-reset-token`, { email })
      .then((res) => {
        const url = res.body.url;
        cy.visit(url);
        cy.get('input[name="email"]').should('have.value', email);
        cy.get('input[name="password"]').type(password)
        cy.get('input[name="password_confirmation"]').type(password)
        cy.get('button[type="submit"]').click()
        cy.contains('Your password has been reset').should("be.visible")
      });
  })

  it('SIS-USU-011', () => {
    const email = "johanatreidesi66@gmail.com"
    const password = "NewPassword"
    cy.visit(`${host}/forgot-password`);
    cy.get('input[name="email"]').type(email);
    cy.get('button[type="submit"]').click();

    cy.wait(5000)
    cy.contains('Se enviará un enlace de recuperación si la cuenta existe.').should('be.visible');
    cy.request('POST', `${host}/testing/create-password-reset-token`, { email })
      .then((res) => {
        const url = res.body.url;
        cy.visit(url);
        cy.get('input[name="email"]').should('have.value', email);
        cy.get('input[name="password"]').type(password)
        cy.get('input[name="password_confirmation"]').type(password + "!")
        cy.get('button[type="submit"]').click()
        cy.contains('La contraseña es obligatoria.').should("be.visible")
      });
  })

  it('SIS-USU-012', () => {
    const email = "notauthenticated@gmail.com"
    const password = "NewPassword"
    cy.request('POST', `${host}/testing/create-custom-user`, {
      email: "notauthenticated",
      password: password,
      email_verified_at: null
    })
    cy.visit(`${host}/forgot-password`);
    cy.get('input[name="email"]').type(email);
    cy.get('button[type="submit"]').click();

    cy.wait(5000)
    cy.contains('Se enviará un enlace de recuperación si la cuenta existe.').should('be.visible');
    cy.request('POST', `${host}/testing/create-password-reset-token`, { email })
      .then((res) => {
        const url = res.body.url;
        cy.visit(url);
        cy.get('input[name="email"]').should('have.value', email);
        cy.get('input[name="password"]').type(password)
        cy.get('input[name="password_confirmation"]').type(password)
        cy.get('button[type="submit"]').click()
        cy.contains("We can't find a user with that email address.").should("be.visible")
      });
  })
})