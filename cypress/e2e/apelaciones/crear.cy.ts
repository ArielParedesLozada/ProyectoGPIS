/// <reference types="cypress" />

describe('Creación de apelaciones', () => {
  let vendedorId: number;
  let moderadorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;

  before(() => {
    
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
    
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
      
        cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
          cy.setCookie('XSRF-TOKEN', resp.body.token);
        });
        
        cy.request({
          method: 'POST',
          url: 'http://localhost:8080/testing/moderation-case',
          body: {
            publication_id: publicationId,
            source: 'system',
            status: 'action_taken',
          },
          timeout: 60000,
        }).then((caseResponse) => {
          expect(caseResponse.status).to.eq(200);
          expect(caseResponse.body).to.exist;
          expect(caseResponse.body.id).to.exist;
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'vendedor@test.com',
          password: 'Admin123@',
        },
        timeout: 60000,
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf')
      .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
  });

  it('UI-APE-001: El usuario puede crear una apelación desde la interfaz', () => {
   
    expect(caseId).to.exist;
    
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Mis Publicaciones', { timeout: 10000 });

  
    cy.contains('Publicación oculta para apelar', { timeout: 10000 }).should('be.visible');
    
    
    cy.contains(/Oculta|Ocultada|Hidden/i, { timeout: 10000 }).should('be.visible');

    cy.contains('Publicación oculta para apelar', { timeout: 10000 })
      .closest('[data-testid="publication-card"]')
      .should('exist')
      .within(() => {
        cy.contains(/Oculta|Ocultada|Hidden/i).should('be.visible');
        
        cy.get('[data-testid="publication-menu"]')
          .should('be.visible')
          .click({ force: true });
      });

    cy.get('[role="menu"]', { timeout: 5000 })
      .should('be.visible')
      .should('exist');

    cy.get('[role="menuitem"]')
      .contains(/Apelar Moderación|Apelar decisión|Apelar/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');
    
    const appealReason = 'Mi publicación no contiene contenido prohibido';
    
    cy.get('textarea', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .clear({ force: true })
      .type(appealReason, { force: true })
      .trigger('input')
      .trigger('change')
      .blur();
    
    cy.get('textarea')
      .filter(':visible')
      .first()
      .should('have.value', appealReason);
    
    cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    cy.contains(/apelación enviada|éxito|enviada correctamente/i, { timeout: 10000 })
      .should('be.visible');

    cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 30000 })
      .then((response) => {
        const appeal = response.body.find((a: any) => 
          a.moderation_case_id === caseId && a.appealer_id === vendedorId
        );
        expect(appeal).to.exist;
      });
  });
});
