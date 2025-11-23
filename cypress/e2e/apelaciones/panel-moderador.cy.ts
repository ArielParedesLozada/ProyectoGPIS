/// <reference types="cypress" />

describe('Panel del moderador - Reasignación automática', () => {
  let moderador1Id: number;
  let moderador2Id: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;
  let appealId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'moderador1@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderador1Id = response.body.id;
    });

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'moderador2@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderador2Id = response.body.id;
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
        title: 'Publicación para reasignar apelación',
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
          assigned_moderator_id: moderador1Id,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
          
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
          }).then((appealResponse) => {
            appealId = appealResponse.body.id;
          });
        });
      });
    });
  });

  it('Panel refleja reasignación automática de apelación', () => {
    cy.session('moderador1-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('moderador1@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.wait(3000);
      cy.url().should('not.include', '/login');
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });

    cy.visit('http://localhost:8080/moderation');
    cy.contains('Apelaciones', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.contains('Publicación para reasignar apelación', { timeout: 10000 }).should('be.visible');

    cy.request('PATCH', `http://localhost:8080/testing/user/${moderador1Id}`, {
      is_active: false,
    });

    cy.request('POST', 'http://localhost:8080/testing/reassign-cases', {
      from_moderator_id: moderador1Id,
      to_moderator_id: moderador2Id,
    });

    cy.reload();
    cy.wait(2000);

    cy.contains('Publicación para reasignar apelación').should('not.exist');

    cy.session('moderador2-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('moderador2@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.wait(3000);
      cy.url().should('not.include', '/login');
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });

    cy.visit('http://localhost:8080/moderation');
    cy.contains('Apelaciones', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.contains('Publicación para reasignar apelación', { timeout: 10000 }).should('be.visible');
  });
});

