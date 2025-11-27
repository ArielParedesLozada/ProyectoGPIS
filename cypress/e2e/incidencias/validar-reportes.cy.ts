/// <reference types="cypress" />

describe('Gestión de incidencias – validación de mensajes de error en reportes de usuario', () => {
  let compradorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: {
        email: 'comprador@test.com',
        password: 'Admin123@',
        role: 'comprador',
        email_verified_at: new Date().toISOString(),
        is_active: true,
      },
      timeout: 30000,
    }).then((response) => {
      compradorId = response.body.id;
    });

    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: {
        email: 'vendedor@test.com',
        password: 'Admin123@',
        role: 'vendedor',
        email_verified_at: new Date().toISOString(),
      },
      timeout: 30000,
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request({
      method: 'GET',
      url: 'http://localhost:8080/testing/categories',
      timeout: 30000,
    }).then((response) => {
      categoryId = response.body[0].id;
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/publication',
        body: {
          title: 'Publicación para validar reportes',
          description: 'Descripción de prueba',
          price: 100.00,
          category_id: categoryId,
          created_by: vendedorId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
          is_hidden: false,
        },
        timeout: 30000,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
      });
    });
  });

  beforeEach(() => {
    cy.session('comprador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('comprador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').should('be.visible').click();
      cy.wait(3000);
      cy.url({ timeout: 20000 }).should('satisfy', (url) => !url.includes('/login'));
      cy.wait(2000);
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
  });

  it('UI-INC-003: La interfaz muestra mensajes de error apropiados al reportar - auto-reporte', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Mi propia publicación',
      description: 'Descripción',
      price: 50.00,
      category_id: categoryId,
      created_by: compradorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const myPubId = pubResponse.body.id;
      
      cy.visit(`http://localhost:8080/publication/${myPubId}`);
      cy.contains('Mi propia publicación', { timeout: 10000 });

      cy.get('button[title="Reportar publicación"]').should('not.exist');
    });
  });

  it('UI-INC-003: La interfaz muestra mensajes de error apropiados al reportar - doble reporte', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);
    cy.contains('Publicación para validar reportes', { timeout: 10000 });

    cy.intercept('POST', `**/publication/${publicationId}/report`).as('reportPublication');

    cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
    cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

    cy.contains('Estafa', { timeout: 10000 }).click();
    cy.contains('Vas a enviar un reporte', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Enviar', { timeout: 10000 }).click();

    cy.wait('@reportPublication', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
    });

    cy.wait(3000);

    cy.request('GET', 'http://localhost:8080/testing/moderation-cases').then((response) => {
      const case_ = response.body.find((c: any) => 
        c.publication_id === publicationId && c.source === 'user'
      );
      expect(case_, 'Debe existir un caso de moderación creado por el primer reporte').to.exist;
    });

    cy.reload();
    cy.contains('Publicación para validar reportes', { timeout: 10000 });

    cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
    cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

    cy.contains('Estafa', { timeout: 10000 }).click();
    cy.contains('button', 'Enviar', { timeout: 10000 }).click();

    cy.wait('@reportPublication').then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 302, 422]);
    });

    cy.contains('Ya has reportado esta publicación recientemente', { timeout: 10000 }).should('be.visible');
  });

  it('UI-INC-003: La interfaz muestra mensajes de error apropiados al reportar - caso descartado', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación descartada',
      description: 'Descripción',
      price: 75.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const descartadaId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: descartadaId,
        source: 'user',
        status: 'dismissed',
      });

      cy.visit(`http://localhost:8080/publication/${descartadaId}`);
      cy.contains('Publicación descartada', { timeout: 10000 });

      cy.intercept('POST', `**/publication/${descartadaId}/report`).as('reportDismissed');

      cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
      cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

      cy.contains('Estafa', { timeout: 10000 }).click();
      cy.contains('button', 'Enviar', { timeout: 10000 }).click();

      cy.wait('@reportDismissed').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302, 422]);
      });

      cy.contains('Esta publicación fue revisada y descartada', { timeout: 10000 }).should('be.visible');
    });
  });
});
