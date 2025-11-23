/// <reference types="cypress" />

describe('Vista y filtrado de apelaciones', () => {
  let moderadorId: number;
  let vendedorId: number;
  let categoryId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
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

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelada pendiente',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId1 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId1,
          source: 'auto',
          status: 'appealed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
          });
        });
      });

      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación cerrada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId2 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId2,
          source: 'auto',
          status: 'closed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
            reviewed_at: new Date().toISOString(),
            reviewing_moderator_id: moderadorId,
          });
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('moderador@test.com');
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

  it('Filtrar apelaciones por estado', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    cy.contains('Apelaciones', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.get('select[name="status"]', { timeout: 10000 }).select('pending');
    cy.wait(2000);

    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Publicación apelación cerrada').should('not.exist');
  });

  it('Filtrar apelaciones por fecha', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    cy.contains('Apelaciones', { timeout: 10000 }).click();
    cy.wait(2000);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    cy.get('input[name="date_from"]', { timeout: 10000 }).type(yesterday);
    cy.get('input[name="date_to"]', { timeout: 10000 }).type(today);
    cy.get('button').contains('Aplicar filtros').click();
    cy.wait(2000);

    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
  });

  it('Limpiar filtros', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    cy.contains('Apelaciones', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.get('select[name="status"]', { timeout: 10000 }).select('pending');
    cy.wait(2000);

    cy.contains('button', 'Limpiar filtros', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');
  });
});

