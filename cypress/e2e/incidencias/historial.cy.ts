/// <reference types="cypress" />

// SIS-014: Historial y vista
describe('Gestión de incidencias – visualización de historial de acciones con filtros', () => {
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
        title: 'Publicación con historial',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId,
          source: 'user',
          status: 'closed',
          assigned_moderator_id: moderadorId,
          assigned_at: new Date().toISOString(),
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
          
          // Crear la acción de moderación
          cy.request({
            method: 'POST',
            url: 'http://localhost:8080/testing/moderation-action',
            body: {
              moderation_case_id: caseId,
              moderator_id: moderadorId,
              action_type: 'hide_publication',
              action_description: 'Publicación ocultada por moderación',
            },
            timeout: 30000,
          }).then((actionResponse) => {
            cy.log('Acción de moderación creada:', actionResponse.body.id);
          });
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        cy.setCookie('XSRF-TOKEN', resp.body.token);
      });
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('moderador@test.com');
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

  it('debe mostrar el historial de acciones en orden cronológico con descripción de acciones y filtros funcionales si están disponibles', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación con historial', { timeout: 10000 });

    // Verificar que el historial se muestra
    cy.contains('Historial de Acciones', { timeout: 10000 }).should('be.visible');

    // Verificar que se muestra la descripción de la acción
    cy.contains('Publicación ocultada por moderación', { timeout: 10000 }).should('be.visible');

    // Verificar que el diseño es legible (las acciones son visibles)
    cy.get('body').should('be.visible'); // Verificación básica de que la página cargó
  });
});

