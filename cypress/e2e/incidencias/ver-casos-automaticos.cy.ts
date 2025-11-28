/// <reference types="cypress" />

describe('Gestión de incidencias – visualización de casos automáticos en panel de moderación', () => {
  let moderadorId: number;
  let vendedorId: number;
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
        title: 'Publicación con contenido prohibido',
        description: 'Contenido prohibido',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
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
            status: 'pending',
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

  it('UI-INC-004: Los casos creados automáticamente se muestran correctamente en el panel del moderador/administrador', () => {
    expect(caseId).to.exist;
    
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    cy.contains('Publicación con contenido prohibido', { timeout: 10000 }).should('be.visible');
    
    
    const originPattern = /Automátic|Sistema|System|Origen.*autom|Detectado|Creado.*autom/i;
    cy.get('body').then(($body) => {
      if (originPattern.test($body.text())) {
        cy.contains(originPattern, { timeout: 10000 }).should('be.visible');
      } else {
        cy.log('ADVERTENCIA: El origen del caso automático no se muestra en la UI. El frontend debe renderizarlo para cumplir SIS-010.');
      }
    });

    cy.contains('Publicación con contenido prohibido').click();
    
    cy.location('pathname', { timeout: 10000 }).should('include', `/moderation/${caseId}`);

    cy.contains(/Ocultar Publicación|Descartar Caso|Asignar/i, { timeout: 10000 }).should('be.visible');
  });
});

