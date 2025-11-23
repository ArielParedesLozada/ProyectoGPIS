/// <reference types="cypress" />

/**
 * SIS-023: Resultado final de apelación
 * Mostrar resultado de apelación aceptada y rechazada
 */

describe('Resultado final de apelación', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId1: number;
  let publicationId2: number;
  let categoryId: number;
  let caseId1: number;
  let caseId2: number;
  let appealId1: number;
  let appealId2: number;

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
      
      // ============================================
      // CASO 1: Apelación ACEPTADA (publicación restaurada)
      // ============================================
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación aceptada',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true, // Inicialmente oculta
      }).then((pubResponse) => {
        publicationId1 = pubResponse.body.id;
        
        // Crear caso en estado 'appealed' (no 'closed' directamente)
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId1,
          source: 'system',
          status: 'appealed', // Estado inicial: apelado
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId1 = caseResponse.body.id;
          
          // Crear apelación con revisión completada (aceptada)
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId1,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación - esta publicación no viola las reglas',
            reviewed_at: new Date().toISOString(),
            reviewing_moderator_id: moderadorId,
            review_notes: 'La apelación es válida, se restaura la publicación',
          }).then((appealResponse) => {
            appealId1 = appealResponse.body.id;
            
            // Crear la acción que representa la apelación aceptada
            cy.request('POST', 'http://localhost:8080/testing/moderation-action', {
              moderation_case_id: caseId1,
              moderator_id: moderadorId,
              action_type: 'appeal_overturned',
              action_description: 'Apelación aceptada - Publicación restaurada',
              metadata: {
                appeal_id: appealId1,
                appeal_reason: 'Razón de apelación - esta publicación no viola las reglas',
                review_notes: 'La apelación es válida, se restaura la publicación',
                final_decision: 'overturn',
              },
            });
            
            // Actualizar el caso a 'closed' y restaurar la publicación
            cy.request('PATCH', `http://localhost:8080/testing/moderation-case/${caseId1}`, {
              status: 'closed',
              resolved_at: new Date().toISOString(),
            });
            
            // Restaurar la publicación (is_hidden = false)
            cy.request('PATCH', `http://localhost:8080/testing/publication/${publicationId1}`, {
              is_hidden: false,
            });
          });
        });
      });

      // ============================================
      // CASO 2: Apelación RECHAZADA (decisión mantenida)
      // ============================================
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación rechazada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true, // Sigue oculta
      }).then((pubResponse) => {
        publicationId2 = pubResponse.body.id;
        
        // Crear caso en estado 'appealed' (no 'closed' directamente)
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId2,
          source: 'system',
          status: 'appealed', // Estado inicial: apelado
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId2 = caseResponse.body.id;
          
          // Crear apelación con revisión completada (rechazada)
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId2,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación - creo que mi publicación es válida',
            reviewed_at: new Date().toISOString(),
            reviewing_moderator_id: moderadorId,
            review_notes: 'La decisión original se mantiene, la publicación debe seguir oculta',
          }).then((appealResponse) => {
            appealId2 = appealResponse.body.id;
            
            // Crear la acción que representa la apelación rechazada
            cy.request('POST', 'http://localhost:8080/testing/moderation-action', {
              moderation_case_id: caseId2,
              moderator_id: moderadorId,
              action_type: 'appeal_rejected',
              action_description: 'Apelación rechazada - Decisión original mantenida',
              metadata: {
                appeal_id: appealId2,
                appeal_reason: 'Razón de apelación - creo que mi publicación es válida',
                review_notes: 'La decisión original se mantiene, la publicación debe seguir oculta',
                final_decision: 'uphold',
              },
            });
            
            // Actualizar el caso a 'closed' (la publicación sigue oculta)
            cy.request('PATCH', `http://localhost:8080/testing/moderation-case/${caseId2}`, {
              status: 'closed',
              resolved_at: new Date().toISOString(),
            });
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

  it('Mostrar resultado de apelación aceptada', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId1}`);

    // Verificar que la página carga correctamente
    cy.contains('Publicación apelación aceptada', { timeout: 10000 }).should('be.visible');

    // Verificar que aparece la sección de Apelaciones
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que la apelación aparece con sus notas de revisión
    cy.contains('Razón de apelación - esta publicación no viola las reglas', { timeout: 10000 })
      .should('be.visible');
    
    cy.contains('La apelación es válida, se restaura la publicación', { timeout: 10000 })
      .should('be.visible');

    // Verificar el historial de acciones
    cy.contains(/Historial de Acciones/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que aparece la acción de apelación aceptada en el historial
    cy.contains('Apelación aceptada - Publicación restaurada', { timeout: 10000 })
      .should('be.visible');

    // Verificar que la publicación está restaurada (is_hidden = false)
    cy.request('GET', `http://localhost:8080/testing/publication/${publicationId1}`, { timeout: 10000 })
      .then((response) => {
        expect(response.body.is_hidden).to.be.false;
      });
  });

  it('Mostrar resultado de apelación rechazada', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId2}`);

    // Verificar que la página carga correctamente
    cy.contains('Publicación apelación rechazada', { timeout: 10000 }).should('be.visible');

    // Verificar que aparece la sección de Apelaciones
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que la apelación aparece con sus notas de revisión
    cy.contains('Razón de apelación - creo que mi publicación es válida', { timeout: 10000 })
      .should('be.visible');
    
    cy.contains('La decisión original se mantiene, la publicación debe seguir oculta', { timeout: 10000 })
      .should('be.visible');

    // Verificar el historial de acciones
    cy.contains(/Historial de Acciones/i, { timeout: 10000 }).should('be.visible');
    
    // Verificar que aparece la acción de apelación rechazada en el historial
    cy.contains('Apelación rechazada - Decisión original mantenida', { timeout: 10000 })
      .should('be.visible');

    // Verificar que la publicación sigue oculta (is_hidden = true)
    cy.request('GET', `http://localhost:8080/testing/publication/${publicationId2}`, { timeout: 10000 })
      .then((response) => {
        expect(response.body.is_hidden).to.be.true;
      });
  });
});
