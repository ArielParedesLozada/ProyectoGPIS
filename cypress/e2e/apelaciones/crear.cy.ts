/// <reference types="cypress" />

/**
 * SIS-018: Creación de apelaciones
 * El usuario puede crear una apelación desde la interfaz
 */

describe('Creación de apelaciones', () => {
  let vendedorId: number;
  let moderadorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;

  before(() => {
    // Obtener CSRF token antes de cualquier POST
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
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      vendedorId = response.body.id;
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

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      // Crear publicación oculta por moderación (is_hidden: true)
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación oculta para apelar',
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
        
        // Obtener CSRF token nuevamente antes de crear el caso
        cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
          cy.setCookie('XSRF-TOKEN', resp.body.token);
        });
        
        // Crear caso de moderación con status 'action_taken' para que la publicación esté oculta y se pueda apelar
        // Usar source: 'system' (valor válido en BD, no 'auto')
        cy.request({
          method: 'POST',
          url: 'http://localhost:8080/testing/moderation-case',
          body: {
            publication_id: publicationId,
            source: 'system',
            status: 'action_taken',
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
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'vendedor@test.com',
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

  it('El usuario puede crear una apelación desde la interfaz', () => {
    // Verificar que caseId está definido
    expect(caseId).to.exist;
    
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Mis Publicaciones', { timeout: 10000 });

    // Verificar que la publicación oculta aparece en el listado
    cy.contains('Publicación oculta para apelar', { timeout: 10000 }).should('be.visible');
    
    // Verificar que se muestra el estado "Oculta" (texto flexible)
    cy.contains(/Oculta|Ocultada|Hidden/i, { timeout: 10000 }).should('be.visible');

    // Ubicar la tarjeta específica por el título y abrir el menú contextual dentro de esa tarjeta
    cy.contains('Publicación oculta para apelar', { timeout: 10000 })
      .closest('[data-testid="publication-card"]')
      .should('exist')
      .within(() => {
        // Verificar que se muestra el estado "Oculta" dentro de la tarjeta
        cy.contains(/Oculta|Ocultada|Hidden/i).should('be.visible');
        
        // Abrir el menú de tres puntos (Radix UI)
        cy.get('[data-testid="publication-menu"]')
          .should('be.visible')
          .click({ force: true });
      });

    // Esperar a que el menú de Radix UI aparezca (role="menu")
    cy.get('[role="menu"]', { timeout: 5000 })
      .should('be.visible')
      .should('exist');

    // Buscar el item "Apelar Moderación" dentro del menú abierto usando role="menuitem"
    // Usar force: true porque el body tiene pointer-events: none cuando el dropdown está abierto
    cy.get('[role="menuitem"]')
      .contains(/Apelar Moderación|Apelar decisión|Apelar/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    // Verificar que se abre el modal/formulario de apelación
    cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');
    
    // Ingresar razón válida de apelación
    const appealReason = 'Mi publicación no contiene contenido prohibido';
    
    // Buscar el primer textarea visible del modal (sin usar name, más robusto)
    cy.get('textarea', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .clear({ force: true })
      .type(appealReason, { force: true })
      .trigger('input')
      .trigger('change')
      .blur();
    
    // Verificar que el texto se escribió correctamente
    cy.get('textarea')
      .filter(':visible')
      .first()
      .should('have.value', appealReason);
    
    // Enviar la apelación (el botón NO tiene type="submit", es un botón normal)
    cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    // Verificar mensaje de éxito
    cy.contains(/apelación enviada|éxito|enviada correctamente/i, { timeout: 10000 })
      .should('be.visible');

    // Verificar que existe un registro en /testing/moderation-appeals asociado al caso y al vendedor
    cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 30000 })
      .then((response) => {
        const appeal = response.body.find((a: any) => 
          a.moderation_case_id === caseId && a.appealer_id === vendedorId
        );
        expect(appeal).to.exist;
      });
  });
});
