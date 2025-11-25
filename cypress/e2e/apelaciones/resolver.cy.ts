/// <reference types="cypress" />

/**
 * SIS-021: Resolución de apelaciones
 * Restaurar publicación y confirmar decisión de ocultar desde interfaz
 */

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
          source: 'system',
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

  it('UI-APE-004: La interfaz del moderador muestra todas las opciones para resolver una apelación - aceptar apelación', () => {
    // Interceptar la request POST /moderation/:id/restore-publication
    cy.intercept('POST', `**/moderation/${caseId}/restore-publication**`).as('restorePublication');
    
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para resolver apelación', { timeout: 10000 }).should('be.visible');

    // Manejar window.confirm() nativo antes de hacer click
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });

    // Buscar y hacer click en el botón "Restaurar Publicación"
    cy.contains('button', /Restaurar Publicación/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click();

    // Esperar la request HTTP (opcional, puede ser navegación Inertia)
    // Si no se dispara el intercept, continuamos con validación por BD
    cy.wait('@restorePublication', { timeout: 10000 }).then((interception) => {
      if (interception && interception.response) {
        expect(interception.response.statusCode).to.be.oneOf([200, 201, 204, 302]);
      }
    });

    // Validar resultado por BD con polling (método más confiable)
    const checkPublicationRestored = (retries = 10): Cypress.Chainable => {
      return cy.request('GET', `http://localhost:8080/testing/publication/${publicationId}`, { timeout: 10000 })
        .then((response) => {
          if (response.body.is_hidden === false) {
            expect(response.body.is_hidden).to.be.false;
            return cy.wrap(true);
          } else if (retries > 0) {
            cy.wait(500);
            return checkPublicationRestored(retries - 1);
          } else {
            throw new Error(`La publicación ${publicationId} no se restauró después de 10 intentos`);
          }
        });
    };
    
    checkPublicationRestored();

    // Validar que el caso está cerrado y tiene resolved_at
    cy.request('GET', 'http://localhost:8080/testing/moderation-cases', { timeout: 10000 })
      .then((response) => {
        const caseItem = response.body.find((c: any) => c.id === caseId);
        expect(caseItem).to.exist;
        expect(caseItem.status).to.eq('closed');
        expect(caseItem.resolved_at).to.exist;
      });

    // Validar mensajes en UI si aparecen (flexible, secundario)
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes('Apelación aceptada') || bodyText.includes('Publicación restaurada') || bodyText.includes('Cerrado')) {
        cy.contains(/Apelación aceptada|Publicación restaurada|Cerrado/i, { timeout: 5000 }).should('be.visible');
      }
    });
  });

  it('UI-APE-004: La interfaz del moderador muestra todas las opciones para resolver una apelación - rechazar apelación', () => {
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
        source: 'system',
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
          cy.contains('Publicación para rechazar apelación', { timeout: 10000 }).should('be.visible');

          // Buscar y hacer click en el botón "Confirmar Decisión de Ocultar"
          cy.contains('button', /Confirmar Decisión de Ocultar/i, { timeout: 10000 })
            .scrollIntoView()
            .should('be.visible')
            .click();

          // Esperar a que aparezca el modal (el título del modal)
          cy.contains(/Confirmar Decisión de Ocultar/i, { timeout: 10000 })
            .should('be.visible');

          // Buscar el contenedor del modal usando el título como referencia
          // El modal tiene estructura: h2 (título) -> div (header) -> div (contenedor modal)
          cy.contains('h2', /Confirmar Decisión de Ocultar/i, { timeout: 10000 })
            .should('be.visible')
            .closest('div.bg-white.rounded-2xl')
            .should('exist')
            .within(() => {
              // Buscar el textarea visible dentro del modal (sin depender de name fijo)
              cy.get('textarea', { timeout: 10000 })
                .filter(':visible')
                .first()
                .should('be.visible')
                .clear({ force: true })
                .type('La decisión original se mantiene', { force: true })
                .trigger('input')
                .trigger('change')
                .blur();

              // Buscar y hacer click en el botón "Confirmar Decisión" dentro del modal
              cy.contains('button', /Confirmar Decisión/i, { timeout: 10000 })
                .should('be.visible')
                .should('not.be.disabled')
                .click({ force: true });
            });

          // NO esperar que el modal desaparezca como assert principal
          // El frontend hace window.location.reload() en onSuccess, pero puede tardar
          // Validar por efectos en BD (método más confiable)

          // Polling para validar que el caso se cerró y tiene resolved_at
          const checkCaseClosed = (retries = 10): Cypress.Chainable => {
            return cy.request('GET', 'http://localhost:8080/testing/moderation-cases', { timeout: 10000 })
              .then((response) => {
                const caseItem = response.body.find((c: any) => c.id === rechazarCaseId);
                if (caseItem && caseItem.status === 'closed' && caseItem.resolved_at) {
                  // Caso cerrado correctamente
                  expect(caseItem.status).to.eq('closed');
                  expect(caseItem.resolved_at).to.exist;
                  expect(caseItem.resolution_notes).to.include('La decisión original se mantiene');
                  return cy.wrap(true);
                } else if (retries > 0) {
                  cy.wait(500);
                  return checkCaseClosed(retries - 1);
                } else {
                  // Log para debugging
                  cy.log('Estado del caso:', JSON.stringify(caseItem, null, 2));
                  throw new Error(`El caso ${rechazarCaseId} no se cerró después de 10 intentos. Estado actual: ${caseItem?.status}, resolved_at: ${caseItem?.resolved_at}`);
                }
              });
          };
          
          checkCaseClosed();

          // Validar que la publicación sigue oculta (is_hidden = true)
          cy.request('GET', `http://localhost:8080/testing/publication/${rechazarPubId}`, { timeout: 10000 })
            .then((response) => {
              expect(response.body.is_hidden).to.be.true;
            });

          // Validar mensajes en UI si aparecen (flexible, secundario)
          // Esperar un poco para que la UI se actualice después del reload
          cy.wait(1000);
          cy.get('body').then(($body) => {
            const bodyText = $body.text();
            if (bodyText.includes('Apelación rechazada') || bodyText.includes('Decisión original mantenida') || bodyText.includes('Cerrado')) {
              cy.contains(/Apelación rechazada|Decisión original mantenida|Cerrado/i, { timeout: 5000 }).should('be.visible');
            }
          });
        });
      });
    });
  });
});
