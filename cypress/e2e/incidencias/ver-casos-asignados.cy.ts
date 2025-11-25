/// <reference types="cypress" />

// SIS-011: Casos asignados
describe('Gestión de incidencias – visualización de casos asignados al moderador', () => {
  let moderadorId: number;
  let vendedorId: number;
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
    
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: {
        email: 'moderador@test.com',
        password: 'Admin123@',
        role: 'moderador',
        email_verified_at: new Date().toISOString(),
        is_active: true,
      },
      timeout: 60000,
    }).then((response) => {
      moderadorId = response.body.id;
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
      timeout: 60000,
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request({
      method: 'GET',
      url: 'http://localhost:8080/testing/categories',
      timeout: 60000,
    }).then((response) => {
      categoryId = response.body[0].id;
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/publication',
        body: {
          title: 'Publicación asignada',
          description: 'Descripción',
          price: 100.00,
          category_id: categoryId,
          created_by: vendedorId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
          is_hidden: false,
        },
        timeout: 60000,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request({
          method: 'POST',
          url: 'http://localhost:8080/testing/moderation-case',
          body: {
            publication_id: publicationId,
            source: 'user',
            status: 'in_review',
            assigned_moderator_id: moderadorId,
            assigned_at: new Date().toISOString(),
          },
          timeout: 60000,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
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
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('moderador@test.com');
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

  it('UI-INC-005: Visualizar casos asignados al moderador/administrador en el panel', () => {
    cy.visit('http://localhost:8080/moderation');
    cy.wait(2000);

    cy.contains('Moderación', { timeout: 10000 });

    // Verificar que el caso asignado aparece en el panel
    cy.contains('Publicación asignada', { timeout: 15000 }).should('be.visible');
    cy.wait(1000);

    // Abrir el caso para ver detalles
    cy.contains('Publicación asignada').click();
    cy.wait(2000);
    cy.location('pathname', { timeout: 10000 }).should('include', '/moderation/');

    // Verificar que se muestra la publicación asociada (verificación principal)
    cy.contains('Publicación asignada', { timeout: 15000 }).should('be.visible');
    
    // Verificar que la página cargó correctamente
    cy.get('body').should('be.visible');
  });
});

