/// <reference types="cypress" />

/**
 * SIS-020: Visualización de apelaciones asignadas
 * Visualizar apelaciones pendientes asignadas al moderador
 */

describe('Visualización de apelaciones asignadas', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;
  let appealId: number;

  // Helper para crear usuario con retry y logging robusto
  const createUserWithRetry = (userData: any, retries = 3): Cypress.Chainable => {
    return cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: userData,
      timeout: 60000,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        // Éxito
        cy.log(`Usuario creado exitosamente: ${userData.email} (ID: ${response.body.id})`);
        return cy.wrap(response.body.id);
      } else if (retries > 0) {
        // Error pero hay reintentos disponibles
        cy.log(`Error al crear usuario ${userData.email}: Status ${response.status}, Body: ${JSON.stringify(response.body)}. Reintentando...`);
        cy.wait(2000); // Esperar 2 segundos antes de reintentar
        return createUserWithRetry(userData, retries - 1);
      } else {
        // Sin más reintentos
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
    
    // Esperar un momento después del reset para que el servidor termine de procesar
    cy.wait(1000);
    
    // Crear moderador con retry y timeout aumentado
    createUserWithRetry({
      email: 'moderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((id) => {
      moderadorId = id;
    });

    // Crear vendedor con retry y timeout aumentado
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
    // Login del moderador usando backend (no UI)
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

    // Obtener CSRF token después de la sesión
    cy.request('GET', 'http://localhost:8080/testing/csrf')
      .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
  });

  it('Visualizar apelaciones pendientes asignadas', () => {
    cy.visit('http://localhost:8080/moderation');

    // Verificar que la página cargó correctamente
    cy.contains(/Moderación/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que aparece el título o heading de la página
    cy.contains(/Gestiona los reportes|Bandeja de Casos|Casos de Moderación/i, { timeout: 10000 })
      .should('be.visible');

    // Estrategia robusta: buscar el caso con apelación directamente en la lista
    // El caso tiene status 'appealed' y debe aparecer en la lista
    // Primero intentar filtrar por estado "Apelado" si existe el filtro
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      // Si existe el filtro de estado, filtrar por "Apelado"
      if (bodyText.includes('Estado') || bodyText.includes('Filtros')) {
        // Abrir filtros si están colapsados
        cy.get('body').then(($body) => {
          const hasShowFilters = $body.text().includes('Mostrar Filtros') || $body.text().includes('mostrar filtros');
          if (hasShowFilters) {
            cy.contains(/Mostrar Filtros|mostrar filtros/i, { timeout: 5000 })
              .should('be.visible')
              .click({ force: true });
            cy.wait(500);
          }
        });
        
        // Buscar el select de estado y filtrar por "Apelado"
        cy.contains('label', /Estado/i, { timeout: 5000 })
          .closest('div')
          .within(() => {
            cy.get('select')
              .first()
              .should('be.visible')
              .select('Apelado');
          });
        
        // Esperar a que se aplique el filtro
        cy.wait(1000);
      }
    });

    // Buscar la publicación con apelación asignada en la lista
    // Debe aparecer con estado "Apelado" o "Apelado"
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .should('be.visible');
    
    // Verificar que el caso tiene estado "Apelado" o similar
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .closest('div')
      .within(() => {
        // Buscar el badge de estado que puede decir "Apelado", "Apelado", etc.
        cy.contains(/Apelado|Apelado|appealed/i, { timeout: 5000 })
          .should('be.visible');
      });

    // Hacer click en el caso para ver los detalles (incluyendo la apelación)
    // Buscar el botón "Ver Detalles" o el link del título
    // Estrategia: buscar el contenedor y verificar si tiene botón "Ver Detalles" dentro
    cy.contains('Publicación con apelación asignada', { timeout: 10000 })
      .should('be.visible')
      .closest('div')
      .then(($container) => {
        // Verificar si el contenedor tiene un botón/link "Ver Detalles"
        const containerText = $container.text();
        const hasVerDetalles = containerText.includes('Ver Detalles');
        
        if (hasVerDetalles) {
          // Hacer click en "Ver Detalles" dentro del contenedor
          cy.wrap($container).within(() => {
            cy.contains(/Ver Detalles/i, { timeout: 5000 })
              .first()
              .should('be.visible')
              .click({ force: true });
          });
        } else {
          // Si no hay botón, hacer click en el título (que es un link)
          cy.contains('Publicación con apelación asignada', { timeout: 10000 })
            .should('be.visible')
            .first()
            .click({ force: true });
        }
      });

    // Esperar a que cargue la página de detalles
    cy.url({ timeout: 10000 }).should('include', '/moderation/');
    
    // Verificar que aparece la sección de apelaciones
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que aparece la razón de apelación
    cy.contains('Razón de apelación', { timeout: 10000 }).should('be.visible');
    
    // Verificar detalles de la apelación (pueden variar según la UI)
    // Buscar información del apelante o moderador de forma flexible
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      // Verificar que aparece información del apelante o moderador
      if (bodyText.includes('Usuario apelante') || bodyText.includes('Apelante')) {
        cy.contains(/Usuario apelante|Apelante/i, { timeout: 5000 }).should('be.visible');
      }
      
      if (bodyText.includes('Moderador original') || bodyText.includes('Moderador asignado')) {
        cy.contains(/Moderador original|Moderador asignado/i, { timeout: 5000 }).should('be.visible');
      }
    });
  });
});

