/// <reference types="cypress" />

describe('Creación de apelaciones', () => {
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
        title: 'Publicación oculta para apelar',
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
          assigned_at: new Date().toISOString(),
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

  it('El usuario puede crear una apelación desde la interfaz', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Mis Publicaciones', { timeout: 10000 });

    cy.contains('Publicación oculta para apelar', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Oculta', { timeout: 10000 }).should('be.visible');

    cy.contains('button', 'Apelar decisión', { timeout: 10000 }).should('be.visible').click();
    cy.wait(2000);

    cy.contains('Formulario de apelación', { timeout: 10000 }).should('be.visible');
    
    cy.get('textarea[name="appeal_reason"]', { timeout: 10000 }).type('Mi publicación no contiene contenido prohibido');
    cy.get('button[type="submit"]').contains('Enviar apelación').click();

    cy.wait(3000);

    cy.contains('Apelación enviada exitosamente', { timeout: 10000 }).should('be.visible');
    
    cy.contains('button', 'Apelación enviada', { timeout: 10000 }).should('be.visible');
    
    cy.contains('button', 'Apelar decisión').should('not.exist');

    cy.request('GET', `http://localhost:8080/testing/moderation-appeals`).then((response) => {
      const appeal = response.body.find((a: any) => 
        a.moderation_case_id === caseId && a.appealer_id === vendedorId
      );
      expect(appeal).to.exist;
    });
  });
});

