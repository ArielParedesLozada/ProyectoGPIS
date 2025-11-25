/// <reference types="cypress" />

/**
 * SIS-024: Vista y filtrado de apelaciones
 * Filtrar apelaciones por estado y fecha
 */

describe('Vista y filtrado de apelaciones', () => {
  let moderadorId: number;
  let vendedorId: number;
  let categoryId: number;

  // Helper: Asegurar que el panel de filtros esté abierto
  const ensureFiltersOpen = () => {
    cy.contains('Moderación', { timeout: 10000 });
    
    // Verificar si existe el texto "Mostrar Filtros" o similar
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes('Mostrar Filtros') || bodyText.includes('mostrar filtros') || bodyText.includes('Mostrar filtros')) {
        cy.contains(/Mostrar Filtros|mostrar filtros|Mostrar filtros/i, { timeout: 5000 })
          .should('be.visible')
          .click({ force: true });
      }
    });
    
    // Asegurar que el panel de filtros es visible
    cy.contains(/Filtros/i, { timeout: 10000 }).should('be.visible');
  };

  // Helper: Seleccionar estado usando combobox custom o select nativo
  // Corrección: Detecta dinámicamente qué tipo de componente existe
  const selectEstado = (optionText: string) => {
    // Interceptar la request GET /moderation que se dispara al cambiar el estado
    cy.intercept('GET', '**/moderation*status*').as('filterByStatus');
    
    // Buscar el contenedor del filtro de estado por label "Estado"
    cy.contains('label', 'Estado', { timeout: 10000 })
      .closest('div')
      .then(($container) => {
        // Detectar qué tipo de componente existe en el contenedor
        const hasCombobox = $container.find('button[role="combobox"], [role="combobox"]').length > 0;
        const hasSelect = $container.find('select').length > 0;
        
        if (hasCombobox) {
          // Usar combobox custom
          cy.wrap($container).within(() => {
            cy.get('button[role="combobox"], [role="combobox"]')
              .first()
              .scrollIntoView()
              .should('be.visible')
              .should('not.be.disabled')
              .click({ force: true });
          });
          
          // Esperar a que aparezca el menú de opciones (fuera del contenedor)
          cy.get('[role="listbox"], [role="menu"], [role="option"]', { timeout: 5000 })
            .should('be.visible');
          
          // Seleccionar la opción por texto
          cy.contains('[role="option"], [role="menuitem"]', optionText, { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        } else if (hasSelect) {
          // Usar select nativo
          cy.wrap($container).within(() => {
            cy.get('select')
              .first()
              .scrollIntoView()
              .should('be.visible')
              .should('not.be.disabled')
              .select(optionText);
          });
        } else {
          throw new Error('No se encontró ni combobox ni select para el filtro de estado');
        }
      });
    
    // Esperar a que se complete la request HTTP del filtro
    cy.wait('@filterByStatus', { timeout: 10000 });
  };

  // Helper: Establecer fecha desde usando input[type="date"] nativo
  // Análisis DOM: El frontend usa input[type="date"] que acepta formato ISO (YYYY-MM-DD)
  // Comportamiento REAL: El campo "Fecha hasta" NUNCA se habilita, está siempre deshabilitado
  // Por lo tanto, este helper solo establece "Fecha desde" y espera la request HTTP
  const setFechaDesde = (valueISO: string) => {
    // Interceptar la request GET /moderation que se dispara al cambiar la fecha
    cy.intercept('GET', '**/moderation*date_from*').as('filterByDateFrom');
    
    // Buscar el input de fecha desde por label
    cy.contains('label', 'Fecha desde', { timeout: 10000 })
      .closest('div')
      .within(() => {
        // El DOM real usa input[type="date"] que acepta formato ISO (YYYY-MM-DD)
        cy.get('input[type="date"]')
          .first()
          .scrollIntoView()
          .should('be.visible')
          .should('not.be.disabled')
          .clear({ force: true })
          .type(valueISO, { force: true })
          .trigger('input')
          .trigger('change')
          .blur();
      });
    
    // Esperar a que se complete la request HTTP del filtro
    cy.wait('@filterByDateFrom', { timeout: 10000 });
  };

  // Helper: Establecer fecha hasta - NO IMPLEMENTADO
  // Comportamiento REAL: El campo "Fecha hasta" NUNCA se habilita en la UI
  // Está siempre deshabilitado con disabled, cursor-not-allowed, bg-gray-100
  // Por lo tanto, este helper no debe usarse en los tests
  // Se mantiene aquí solo como referencia/documentación
  const setFechaHasta = (valueISO: string) => {
    // NO IMPLEMENTADO: El campo "Fecha hasta" está siempre deshabilitado
    // No se puede escribir en este campo según el comportamiento real de la UI
    cy.log('⚠️ setFechaHasta no se puede usar: el campo "Fecha hasta" está siempre deshabilitado');
  };

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
        title: 'Publicación apelada pendiente',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId1 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId1,
          source: 'system',
          status: 'pending',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
          });
        });
      });

      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación cerrada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId2 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId2,
          source: 'system',
          status: 'closed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
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
    cy.session('moderador-login-listar-filtros', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        cy.setCookie('XSRF-TOKEN', resp.body.token);
      });
      
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('moderador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      
      // Interceptar la petición POST de login
      cy.intercept('POST', 'http://localhost:8080/login').as('loginRequest');
      
      cy.get('button[type="submit"]').should('be.visible').click();
      
      // Esperar a que la petición de login se complete
      cy.wait('@loginRequest').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });
      
      // Verificar que la URL cambió (login exitoso)
      cy.url({ timeout: 20000 }).should('satisfy', (url) => !url.includes('/login'));
      cy.wait(2000);
    });

    // Obtener CSRF token después de la sesión
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - filtrar por estado', () => {
    // Interceptar la request inicial de carga de la página
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
    // Esperar a que la página cargue completamente
    cy.wait('@loadModeration', { timeout: 10000 });

    // Asegurar que los filtros estén abiertos
    ensureFiltersOpen();

    // Seleccionar estado "Pendiente" usando el helper (ya incluye intercept y wait)
    selectEstado('Pendiente');

    // Esperar un momento para que la página se actualice después del filtro
    cy.wait(1500);

    // Verificar que la publicación pendiente aparece
    // Usar polling para esperar a que aparezca después del filtro
    const waitForPendingPublication = (retries = 20): Cypress.Chainable => {
      return cy.get('body', { timeout: 1000 }).then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes('Publicación apelada pendiente')) {
          cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
          return cy.wrap(true);
        } else if (retries > 0) {
          cy.wait(500);
          return waitForPendingPublication(retries - 1);
        } else {
          throw new Error('La publicación pendiente no apareció después de aplicar el filtro');
        }
      });
    };
    
    waitForPendingPublication();
    
    // Validación: verificar que la publicación cerrada NO aparece cuando se filtra por "Pendiente"
    // Usar polling para verificar que no existe
    cy.get('body', { timeout: 5000 }).then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes('Publicación apelación cerrada')) {
        // Si aparece, esperar un poco más y verificar de nuevo
        cy.wait(1000);
        cy.contains('Publicación apelación cerrada', { timeout: 2000 }).should('not.exist');
      }
    });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - filtrar por fecha', () => {
    // Interceptar la request inicial de carga de la página
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
    // Esperar a que la página cargue completamente
    cy.wait('@loadModeration', { timeout: 10000 });

    // Asegurar que los filtros estén abiertos
    ensureFiltersOpen();

    // Calcular fecha en formato ISO (YYYY-MM-DD) para input[type="date"]
    // Usar una fecha pasada para filtrar publicaciones creadas después de esa fecha
    const pastDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]; // 7 días atrás

    // Establecer fecha desde
    // Comportamiento REAL: El campo "Fecha hasta" NUNCA se habilita, está siempre deshabilitado
    // Por lo tanto, solo se puede filtrar por "Fecha desde"
    // El helper setFechaDesde:
    // 1. Escribe en input[type="date"] con formato ISO
    // 2. Espera la request HTTP /moderation?date_from=...
    setFechaDesde(pastDate);

    // Verificar que el filtro por fecha funciona correctamente
    // Las publicaciones creadas después de la fecha seleccionada deben aparecer
    // (Ambas publicaciones fueron creadas recientemente, así que deberían aparecer)
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');
    
    // Verificar que el campo "Fecha hasta" está deshabilitado (comportamiento real de la UI)
    cy.contains('label', 'Fecha hasta', { timeout: 10000 })
      .closest('div')
      .within(() => {
        cy.get('input[type="date"]')
          .first()
          .should('be.visible')
          .should('be.disabled')
          .should('have.class', 'cursor-not-allowed');
      });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - limpiar filtros', () => {
    // Interceptar la request inicial de carga de la página
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
    // Esperar a que la página cargue completamente
    cy.wait('@loadModeration', { timeout: 10000 });

    // Verificar que ambas publicaciones aparecen inicialmente (sin filtros)
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');

    // Asegurar que los filtros estén abiertos
    ensureFiltersOpen();

    // Interceptar la request que se dispara al aplicar el filtro
    cy.intercept('GET', '**/moderation**').as('applyFilter');

    // Aplicar un filtro (estado "Pendiente" para la primera publicación)
    // La publicación "apelada pendiente" tiene estado "pending"
    selectEstado('Pendiente');

    // Esperar a que la página se actualice después del filtro
    cy.wait('@applyFilter', { timeout: 10000 });
    
    // Esperar un momento adicional para que la UI se actualice
    cy.wait(1000);

    // Verificar que la URL contiene el filtro de estado
    cy.url().should('include', 'status=pending');

    // Verificar que la publicación pendiente aparece
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    
    // Verificar que la publicación cerrada NO aparece (filtro aplicado)
    cy.contains('Publicación apelación cerrada', { timeout: 5000 }).should('not.exist');

    // Interceptar la request que se dispara al limpiar filtros
    cy.intercept('GET', '**/moderation**').as('clearFilters');

    // Limpiar filtros
    cy.contains('button', /Limpiar filtros|Limpiar/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled')
      .click();
    
    // Esperar a que se complete la request HTTP de limpiar filtros
    cy.wait('@clearFilters', { timeout: 10000 });
    
    // Esperar un momento adicional para que la UI se actualice
    cy.wait(1000);

    // Verificar que ambas publicaciones aparecen después de limpiar
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');
  });
});
