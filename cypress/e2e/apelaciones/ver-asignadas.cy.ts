/// <reference types="cypress" />



describe('Visualización de apelaciones asignadas', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;
  let appealId: number;

  
  const createUserWithRetry = (userData: any, retries = 3): Cypress.Chainable => {
    return cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: userData,
      timeout: 60000,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        cy.log(`Usuario creado exitosamente: ${userData.email} (ID: ${response.body.id})`);
        return cy.wrap(response.body.id);
      } else if (retries > 0) {
        cy.log(`Error al crear usuario ${userData.email}: Status ${response.status}, Body: ${JSON.stringify(response.body)}. Reintentando...`);
        cy.wait(2000); 
        return createUserWithRetry(userData, retries - 1);
      } else {
        cy.log(`Error final al crear usuario ${userData.email}: Status ${response.status}, Body: ${JSON.stringify(response.body)}`);
        throw new Error(`No se pudo crear usuario ${userData.email} después de ${retries} intentos. Status: ${response.status}`);
      }
    });
  };

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.wait(1000);
    
    createUserWithRetry({
      email: 'moderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((id) => {
      moderadorId = id;
    });

    createUserWithRetry({
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((id) => {
      vendedorId = id;
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
          title: 'Publicación con apelación asignada',
          description: 'Descripción',
          price: 100.00,
          category_id: categoryId,
          created_by: vendedorId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
          is_hidden: true,
        },
        timeout: 60000,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request({
          method: 'POST',
          url: 'http://localhost:8080/testing/moderation-case',
          body: {
            publication_id: publicationId,
            source: 'system',
            status: 'appealed',
            assigned_moderator_id: moderadorId,
          },
          timeout: 60000,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
          
          cy.request({
            method: 'POST',
            url: 'http://localhost:8080/testing/moderation-appeal',
            body: {
              moderation_case_id: caseId,
              appealer_id: vendedorId,
              appeal_reason: 'Razón de apelación',
            },
            timeout: 60000,
          }).then((appealResponse) => {
            appealId = appealResponse.body.id;
          });
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'moderador@test.com',
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

  it('UI-APE-003: Visualización de apelaciones pendientes en el panel del moderador/administrador', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains(/Moderación/i, { timeout: 10000 }).should('be.visible');
    
    cy.contains(/Gestiona los reportes|Bandeja de Casos|Casos de Moderación/i, { timeout: 10000 })
      .should('be.visible');

    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      if (bodyText.includes('Estado') || bodyText.includes('Filtros')) {
        cy.get('body').then(($body) => {
          const hasShowFilters = $body.text().includes('Mostrar Filtros') || $body.text().includes('mostrar filtros');
          if (hasShowFilters) {
            cy.contains(/Mostrar Filtros|mostrar filtros/i, { timeout: 5000 })
              .should('be.visible')
              .click({ force: true });
            cy.wait(500);
          }
        });
        
        cy.contains('label', /Estado/i, { timeout: 5000 })
          .closest('div')
          .within(() => {
            cy.get('select')
              .first()
              .should('be.visible')
              .select('Apelado');
          });
        
        cy.wait(1000);
      }
    });

    
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .should('be.visible');
    
    
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .closest('div')
      .within(() => {
        
        cy.contains(/Apelado|Apelado|appealed/i, { timeout: 5000 })
          .should('be.visible');
      });

    
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .should('be.visible')
      .closest('div')
      .then(($container) => {
        const containerText = $container.text();
        const hasVerDetalles = containerText.includes('Ver Detalles');
        
        if (hasVerDetalles) {
          cy.wrap($container).within(() => {
            cy.contains(/Ver Detalles/i, { timeout: 5000 })
              .first()
              .should('be.visible')
              .click({ force: true });
          });
        } else {
          cy.contains('Publicación con apelación asignada', { timeout: 10000 })
            .should('be.visible')
            .first()
            .click({ force: true });
        }
      });

    cy.url({ timeout: 10000 }).should('include', '/moderation/');
    
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    
    cy.contains('Razón de apelación', { timeout: 10000 }).should('be.visible');
    
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      if (bodyText.includes('Usuario apelante') || bodyText.includes('Apelante')) {
        cy.contains(/Usuario apelante|Apelante/i, { timeout: 5000 }).should('be.visible');
      }
      
      if (bodyText.includes('Moderador original') || bodyText.includes('Moderador asignado')) {
        cy.contains(/Moderador original|Moderador asignado/i, { timeout: 5000 }).should('be.visible');
      }
    });
  });
});

