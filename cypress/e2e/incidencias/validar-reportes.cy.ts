/// <reference types="cypress" />

// SIS-009: Reportes de usuario (mensajes de error)
describe('Gestión de incidencias – validación de mensajes de error en reportes de usuario', () => {
  let compradorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;

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
        email: 'comprador@test.com',
        password: 'Admin123@',
        role: 'comprador',
        email_verified_at: new Date().toISOString(),
        is_active: true,
      },
      timeout: 30000,
    }).then((response) => {
      compradorId = response.body.id;
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
      timeout: 30000,
    }).then((response) => {
      vendedorId = response.body.id;
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
          title: 'Publicación para validar reportes',
          description: 'Descripción de prueba',
          price: 100.00,
          category_id: categoryId,
          created_by: vendedorId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
          is_hidden: false,
        },
        timeout: 30000,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
      });
    });
  });

  beforeEach(() => {
    cy.session('comprador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('comprador@test.com');
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

  it('debe impedir que un usuario reporte su propia publicación mostrando que el control de reporte no está disponible', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Mi propia publicación',
      description: 'Descripción',
      price: 50.00,
      category_id: categoryId,
      created_by: compradorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const myPubId = pubResponse.body.id;
      
      cy.visit(`http://localhost:8080/publication/${myPubId}`);
      cy.contains('Mi propia publicación', { timeout: 10000 });

      // Verificar que NO existe el control de reporte (es mi propia publicación)
      cy.get('button[title="Reportar publicación"]').should('not.exist');
    });
  });

  it('debe mostrar mensaje de error claro cuando se intenta reportar la misma publicación dentro de la ventana de tiempo permitida', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);
    cy.contains('Publicación para validar reportes', { timeout: 10000 });

    // Interceptar peticiones de reporte
    cy.intercept('POST', `**/publication/${publicationId}/report`).as('reportPublication');

    // Primer reporte: hacer click en el icono de reportar
    cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
    cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

    // Seleccionar una razón y enviar el reporte
    cy.contains('Estafa', { timeout: 10000 }).click();
    cy.contains('Vas a enviar un reporte', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Enviar', { timeout: 10000 }).click();

    // Esperar a que se complete el primer reporte
    cy.wait('@reportPublication', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
    });

    // Esperar a que el modal se cierre
    cy.wait(3000);

    // Verificar que se creó el caso de moderación en la BD (verificación principal)
    cy.request('GET', 'http://localhost:8080/testing/moderation-cases').then((response) => {
      const case_ = response.body.find((c: any) => 
        c.publication_id === publicationId && c.source === 'user'
      );
      expect(case_, 'Debe existir un caso de moderación creado por el primer reporte').to.exist;
    });

    // Recargar la página para simular un nuevo intento
    cy.reload();
    cy.contains('Publicación para validar reportes', { timeout: 10000 });

    // Intentar reportar de nuevo inmediatamente (dentro de la ventana de 60 minutos)
    cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
    cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

    // Seleccionar una razón y enviar el reporte de nuevo
    cy.contains('Estafa', { timeout: 10000 }).click();
    cy.contains('button', 'Enviar', { timeout: 10000 }).click();

    // Esperar respuesta del segundo intento
    cy.wait('@reportPublication').then((interception) => {
      // Puede ser 200 con error o 302 con error
      expect(interception.response?.statusCode).to.be.oneOf([200, 302, 422]);
    });

    // Verificar mensaje de error por doble reporte
    cy.contains('Ya has reportado esta publicación recientemente', { timeout: 10000 }).should('be.visible');
  });

  it('debe mostrar mensaje de error claro cuando se intenta reportar una publicación con caso descartado', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación descartada',
      description: 'Descripción',
      price: 75.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const descartadaId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: descartadaId,
        source: 'user',
        status: 'dismissed',
      });

      cy.visit(`http://localhost:8080/publication/${descartadaId}`);
      cy.contains('Publicación descartada', { timeout: 10000 });

      // Interceptar petición de reporte
      cy.intercept('POST', `**/publication/${descartadaId}/report`).as('reportDismissed');

      // Hacer click en el icono de reportar
      cy.get('button[title="Reportar publicación"]', { timeout: 10000 }).click();
      cy.contains('¿Por qué quieres reportar esta publicación?', { timeout: 10000 }).should('be.visible');

      // Seleccionar una razón y enviar el reporte
      cy.contains('Estafa', { timeout: 10000 }).click();
      cy.contains('button', 'Enviar', { timeout: 10000 }).click();

      // Esperar respuesta
      cy.wait('@reportDismissed').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302, 422]);
      });

      // Verificar mensaje de error específico para caso descartado
      cy.contains('Esta publicación fue revisada y descartada', { timeout: 10000 }).should('be.visible');
    });
  });
});
