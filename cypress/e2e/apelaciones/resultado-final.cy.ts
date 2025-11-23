/// <reference types="cypress" />

describe('Resultado final de apelación', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId1: number;
  let publicationId2: number;
  let categoryId: number;
  let caseId1: number;
  let caseId2: number;

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
        title: 'Publicación apelación aceptada',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        publicationId1 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId1,
          source: 'auto',
          status: 'closed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId1 = caseResponse.body.id;
          
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId1,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
            reviewed_at: new Date().toISOString(),
            reviewing_moderator_id: moderadorId,
          });
        });
      });

      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación rechazada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        publicationId2 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId2,
          source: 'auto',
          status: 'closed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId2 = caseResponse.body.id;
          
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId2,
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

  it('Mostrar resultado de apelación aceptada', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId1}`);

    cy.contains('Publicación apelación aceptada', { timeout: 10000 });

    cy.contains('Apelación aceptada', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Publicación restaurada', { timeout: 10000 }).should('be.visible');

    cy.contains('Historial', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.contains('Apelación aceptada', { timeout: 10000 }).should('be.visible');

    cy.request('GET', `http://localhost:8080/testing/publication/${publicationId1}`).then((response) => {
      expect(response.body.is_hidden).to.be.false;
    });
  });

  it('Mostrar resultado de apelación rechazada', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId2}`);

    cy.contains('Publicación apelación rechazada', { timeout: 10000 });

    cy.contains('Apelación rechazada', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Decisión original mantenida', { timeout: 10000 }).should('be.visible');

    cy.contains('Historial', { timeout: 10000 }).click();
    cy.wait(2000);

    cy.contains('Apelación rechazada', { timeout: 10000 }).should('be.visible');

    cy.request('GET', `http://localhost:8080/testing/publication/${publicationId2}`).then((response) => {
      expect(response.body.is_hidden).to.be.true;
    });
  });
});

