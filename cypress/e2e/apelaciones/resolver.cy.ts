/// <reference types="cypress" />

describe('Resolución de apelaciones - Interfaz completa', () => {
  let moderadorId: number;
  let otroModeradorId: number;
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
      email: 'moderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderadorId = response.body.id;
    });

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'otromoderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      otroModeradorId = response.body.id;
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
        title: 'Publicación para resolver apelación',
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

  it('Aceptar apelación desde interfaz', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para resolver apelación', { timeout: 10000 });

    cy.contains('button', 'Aceptar apelación', { timeout: 10000 }).click();
    cy.wait(1000);

    cy.get('textarea[name="review_notes"]', { timeout: 10000 }).type('La apelación es válida, se restaura la publicación');
    cy.get('button[type="submit"]').contains('Confirmar').click();

    cy.wait(3000);

    cy.contains('Apelación aceptada', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Publicación restaurada', { timeout: 10000 }).should('be.visible');
    
    cy.contains('Cerrado', { timeout: 10000 }).should('be.visible');

    cy.request('GET', `http://localhost:8080/testing/publication/${publicationId}`).then((response) => {
      expect(response.body.is_hidden).to.be.false;
    });
  });

  it('Rechazar apelación desde interfaz', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación para rechazar apelación',
      description: 'Descripción',
      price: 200.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: true,
    }).then((pubResponse) => {
      const rechazarPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: rechazarPubId,
        source: 'auto',
        status: 'appealed',
        assigned_moderator_id: moderadorId,
      }).then((caseResponse) => {
        const rechazarCaseId = caseResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
          moderation_case_id: rechazarCaseId,
          appealer_id: vendedorId,
          appeal_reason: 'Razón de apelación',
        }).then(() => {
          cy.visit(`http://localhost:8080/moderation/${rechazarCaseId}`);
          cy.contains('Publicación para rechazar apelación', { timeout: 10000 });

          cy.contains('button', 'Rechazar apelación', { timeout: 10000 }).click();
          cy.wait(1000);

          cy.get('textarea[name="review_notes"]', { timeout: 10000 }).type('La decisión original se mantiene');
          cy.get('button[type="submit"]').contains('Confirmar').click();

          cy.wait(3000);

          cy.contains('Apelación rechazada', { timeout: 10000 }).should('be.visible');
          
          cy.contains('Decisión original mantenida', { timeout: 10000 }).should('be.visible');
          
          cy.contains('Cerrado', { timeout: 10000 }).should('be.visible');

          cy.request('GET', `http://localhost:8080/testing/publication/${rechazarPubId}`).then((response) => {
            expect(response.body.is_hidden).to.be.true;
          });
        });
      });
    });
  });
});

