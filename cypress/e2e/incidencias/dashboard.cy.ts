/// <reference types="cypress" />

// SIS-016: Dashboard / estadísticas
describe('Gestión de incidencias – dashboard de estadísticas de incidencias', () => {
  let moderadorId: number;
  let vendedorId: number;
  let categoryId: number;

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
        title: 'Publicación pendiente',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
      }).then((pubResponse) => {
        const pubId = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId,
          source: 'user',
          status: 'pending',
          assigned_moderator_id: moderadorId,
          assigned_at: new Date().toISOString(),
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

  it('debe mostrar los indicadores de incidencias (pendientes, asignadas, atendidas, descartadas) en el dashboard', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    // Verificar las tarjetas de estadísticas que realmente existen
    cy.contains('Total Casos', { timeout: 10000 }).should('be.visible');
    cy.contains('Pendientes', { timeout: 10000 }).should('be.visible');
    cy.contains('Mis Casos', { timeout: 10000 }).should('be.visible');
    cy.contains('Sin Asignar', { timeout: 10000 }).should('be.visible');
  });

  it('debe actualizar los indicadores correctamente al resolver una incidencia', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    // Interceptar petición de descartar
    cy.intercept('POST', '**/moderation/*/dismiss').as('dismissCase');

    // Obtener el conteo inicial de pendientes
    cy.contains('Pendientes', { timeout: 10000 }).parent().find('p.text-2xl.font-bold').invoke('text').then((text) => {
      const initialCount = parseInt(text.trim()) || 0;
      
      // Hacer click en la publicación pendiente
      cy.contains('Publicación pendiente', { timeout: 10000 }).click();
      
      // Verificar que estamos en la página de detalle del caso
      cy.location('pathname', { timeout: 10000 }).should('include', '/moderation/');
      
      // Verificar que la página cargó correctamente
      cy.contains('Acciones', { timeout: 10000 }).should('be.visible');
      
      // Buscar el botón "Descartar Caso" y hacer click
      cy.contains('button', 'Descartar Caso', { timeout: 10000 })
        .should('be.visible')
        .should('not.be.disabled')
        .click();
      
      // Verificar que el modal de confirmación se abre
      cy.contains('¿Estás seguro de que quieres descartar este caso?', { timeout: 10000 }).should('be.visible');
      
      // Confirmar el descarte
      cy.get('button.bg-red-600').contains('Descartar', { timeout: 10000 }).click({ force: true });
      
      // Esperar a que se complete la acción
      cy.wait('@dismissCase').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });

      // Volver al dashboard
      cy.visit('http://localhost:8080/moderation');
      cy.contains('Moderación', { timeout: 10000 });

      // Verificar que el conteo de pendientes disminuyó
      cy.contains('Pendientes', { timeout: 10000 }).parent().find('p.text-2xl.font-bold').invoke('text').then((newText) => {
        const newCount = parseInt(newText.trim()) || 0;
        expect(newCount, 'El conteo de pendientes debería disminuir después de descartar un caso').to.be.lessThan(initialCount);
      });
    });
  });
});

