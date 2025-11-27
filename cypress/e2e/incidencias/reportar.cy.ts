/// <reference types="cypress" />


describe('Gestión de incidencias – creación por reporte de usuario', () => {
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
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'comprador@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      compradorId = response.body.id;
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
        title: 'Publicación para reportar',
        description: 'Descripción de prueba',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
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
      
      cy.url({ timeout: 20000 }).should('satisfy', (url) => {
        return !url.includes('/login');
      });
      cy.wait(2000);
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('UI-INC-002: El usuario puede reportar una publicación desde la interfaz', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);

    cy.contains('Publicación para reportar', { timeout: 10000 });

    cy.intercept('POST', `**/publication/${publicationId}/report`).as('reportPublication');

    cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();

    cy.contains('Reportar', { timeout: 10000 }).should('be.visible');
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
      expect(case_, 'Debe existir un caso de moderación creado por reporte de usuario').to.exist;
    });

    
    cy.wait(1000);
    cy.get('body').should('exist'); 
  });
});

