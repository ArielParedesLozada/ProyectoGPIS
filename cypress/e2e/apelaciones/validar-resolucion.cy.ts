/// <reference types="cypress" />

/**
 * SIS-022: Validación de formulario de resolución de apelación
 * Validar campo requerido, longitud mínima, longitud máxima y resolución con datos válidos
 */

describe('Validación de formulario de resolución de apelación', () => {
  let moderadorId: number;
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
    
    // Esperar un momento después del reset para que el servidor termine de procesar
    cy.wait(1000);
    
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

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación para validar resolución',
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

  it('Validar campo requerido - Sin notas', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 }).should('be.visible');

    // Buscar y hacer click en el botón "Revisar Apelación" dentro de la sección de apelaciones
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    cy.contains('button', /Revisar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // Verificar que se abre el modal
    cy.contains(/Revisar Apelación/i, { timeout: 10000 }).should('be.visible');

    // Verificar que el textarea está vacío
    cy.get('textarea[name="review_notes"]', { timeout: 10000 })
      .should('be.visible')
      .should('have.value', '');

    // Verificar que los botones están deshabilitados cuando no hay notas
    cy.contains('button', /Aceptar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .should('be.disabled');
    
    cy.contains('button', /Rechazar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .should('be.disabled');

    // Hacer focus y blur en el textarea para que aparezca el mensaje de error
    cy.get('textarea[name="review_notes"]')
      .focus()
      .blur();

    // Verificar que aparece el mensaje de error
    cy.contains(/El campo notas es requerido/i, { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud mínima', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 }).should('be.visible');

    // Buscar y hacer click en el botón "Revisar Apelación"
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    cy.contains('button', /Revisar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // Verificar que se abre el modal
    cy.contains(/Revisar Apelación/i, { timeout: 10000 }).should('be.visible');

    // Escribir solo un carácter (menos del mínimo requerido de 10)
    cy.get('textarea[name="review_notes"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type('A');
    
    // Verificar que el botón sigue deshabilitado
    cy.contains('button', /Aceptar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .should('be.disabled');

    // Verificar que aparece el mensaje de error de longitud mínima
    cy.contains(/Las notas deben tener al menos 10 caracteres/i, { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud máxima', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 }).should('be.visible');

    // Buscar y hacer click en el botón "Revisar Apelación"
    cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
    cy.contains('button', /Revisar Apelación/i, { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // Verificar que se abre el modal
    cy.contains(/Revisar Apelación/i, { timeout: 10000 }).should('be.visible');

    // El textarea tiene maxLength=100, así que no se puede escribir más de 100 caracteres
    cy.get('textarea[name="review_notes"]', { timeout: 10000 })
      .should('be.visible')
      .should('have.attr', 'maxLength', '100');

    // Intentar escribir texto de exactamente 100 caracteres (límite máximo)
    const maxText = 'a'.repeat(100);
    cy.get('textarea[name="review_notes"]')
      .clear()
      .type(maxText, { force: true });

    // Verificar que el textarea quedó con 100 caracteres
    cy.get('textarea[name="review_notes"]')
      .invoke('val')
      .should((val) => {
        expect((val as string).length).to.eq(100);
      });

    // Verificar contador de caracteres
    cy.contains(/100\s*\/\s*100(\s*caracteres)?/i, { timeout: 10000 })
      .should('be.visible');

    // Intentar escribir 1 más (no debería cambiar debido a maxLength)
    cy.get('textarea[name="review_notes"]')
      .type('b', { force: true });

    // Sigue teniendo 100
    cy.get('textarea[name="review_notes"]')
      .invoke('val')
      .should((val) => {
        const value = val as string;
        expect(value.length).to.eq(100);
        expect(value).to.not.include('b');
      });
  });

  it('Resolver con datos válidos', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación válida para resolver',
      description: 'Descripción',
      price: 150.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: true,
    }).then((pubResponse) => {
      const validPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: validPubId,
        source: 'system',
        status: 'appealed',
        assigned_moderator_id: moderadorId,
      }).then((caseResponse) => {
        const validCaseId = caseResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
          moderation_case_id: validCaseId,
          appealer_id: vendedorId,
          appeal_reason: 'Razón de apelación',
        }).then(() => {
          cy.visit(`http://localhost:8080/moderation/${validCaseId}`);
          cy.contains('Publicación válida para resolver', { timeout: 10000 }).should('be.visible');

          // Buscar y hacer click en el botón "Revisar Apelación"
          cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
          cy.contains('button', /Revisar Apelación/i, { timeout: 10000 })
            .should('be.visible')
            .click();
          
          // Verificar que se abre el modal
          cy.contains(/Revisar Apelación/i, { timeout: 10000 }).should('be.visible');

          // Escribir notas válidas (mínimo 10 caracteres, máximo 100)
          const validNotes = 'Notas válidas para la resolución de la apelación. Esta es una explicación detallada.';
          cy.get('textarea[name="review_notes"]', { timeout: 10000 })
            .should('be.visible')
            .clear()
            .type(validNotes);

          // Interceptar la request POST /moderation/:id/review-appeal
          cy.intercept('POST', `**/moderation/${validCaseId}/review-appeal**`).as('reviewAppeal');

          // Verificar que el botón está habilitado
          cy.contains('button', /Aceptar Apelación/i, { timeout: 10000 })
            .should('be.visible')
            .should('not.be.disabled')
            .click();

          // Esperar a que se complete la request POST
          cy.wait('@reviewAppeal', { timeout: 15000 }).then((interception) => {
            expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204, 302]);
          });

          // El frontend hace router.reload() después del éxito
          // Esperar a que el modal se cierre (el título "Revisar Apelación" no debe estar visible)
          cy.contains(/Revisar Apelación/i, { timeout: 10000 }).should('not.exist');

          // Esperar un momento para que Inertia complete el reload
          cy.wait(1000);

          // Verificar que la página cargó correctamente después del reload
          cy.contains('Publicación válida para resolver', { timeout: 15000 }).should('be.visible');
          
          // Verificar que aparece la apelación revisada en la sección de apelaciones
          cy.contains(/Apelaciones/i, { timeout: 10000 }).should('be.visible');
          
          // Verificar que las notas de revisión aparecen en la UI (dentro del bloque de apelaciones)
          // Buscar dentro de la sección de apelaciones específicamente
          cy.contains(/Apelaciones/i, { timeout: 10000 })
            .closest('div')
            .within(() => {
              // Verificar que aparece el texto "Revisión:" seguido de las notas
              cy.contains('Revisión:', { timeout: 15000 }).should('be.visible');
              cy.contains(validNotes, { timeout: 15000 }).should('be.visible');
            });
          
          // Validar en el backend que la apelación fue revisada
          cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 10000 })
            .then((response) => {
              const appeal = response.body.find((a: any) => 
                a.moderation_case_id === validCaseId && 
                a.appealer_id === vendedorId
              );
              expect(appeal).to.exist;
              expect(appeal.review_notes).to.eq(validNotes);
              expect(appeal.reviewed_at).to.exist;
              expect(appeal.reviewing_moderator_id).to.eq(moderadorId);
            });
        });
      });
    });
  });
});

