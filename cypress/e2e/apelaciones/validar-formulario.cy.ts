/// <reference types="cypress" />

describe('Validación de formulario de apelación', () => {
  let vendedorId: number;
  let moderadorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'moderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderadorId = response.body.id;
    });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación para validar apelación',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId,
          source: 'auto',
          status: 'appealed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.wait(3000);
      cy.url().should('not.include', '/login');
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('Validar campo requerido - Sin razón', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Publicación para validar apelación', { timeout: 10000 });

    cy.contains('button', 'Apelar decisión', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.get('button[type="submit"]').contains('Enviar apelación').click();
    cy.wait(1000);

    cy.contains('El campo razón es requerido', { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud mínima', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Publicación para validar apelación', { timeout: 10000 });

    cy.contains('button', 'Apelar decisión', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.get('textarea[name="appeal_reason"]', { timeout: 10000 }).type('A');
    cy.get('button[type="submit"]').contains('Enviar apelación').click();
    cy.wait(1000);

    cy.contains('La razón debe tener al menos', { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud máxima', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Publicación para validar apelación', { timeout: 10000 });

    cy.contains('button', 'Apelar decisión', { timeout: 10000 }).click();
    cy.wait(2000);

    const longText = 'a'.repeat(2001);
    cy.get('textarea[name="appeal_reason"]', { timeout: 10000 }).type(longText);
    cy.get('button[type="submit"]').contains('Enviar apelación').click();
    cy.wait(1000);

    cy.contains('La razón no puede exceder', { timeout: 10000 }).should('be.visible');
  });

  it('Enviar con datos válidos', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación válida para apelar',
      description: 'Descripción',
      price: 150.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: true,
    }).then((pubResponse) => {
      const validPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: validPubId,
        source: 'auto',
        status: 'appealed',
        assigned_moderator_id: moderadorId,
      }).then(() => {
        cy.visit('http://localhost:8080/my-publications');
        cy.contains('Publicación válida para apelar', { timeout: 10000 });

        cy.contains('button', 'Apelar decisión', { timeout: 10000 }).click();
        cy.wait(2000);

        cy.get('textarea[name="appeal_reason"]', { timeout: 10000 }).type('Razón válida para apelar la decisión');
        cy.get('button[type="submit"]').contains('Enviar apelación').click();

        cy.wait(3000);

        cy.contains('Apelación enviada exitosamente', { timeout: 10000 }).should('be.visible');
      });
    });
  });
});

