/// <reference types="cypress" />

// SIS-015: Listado con filtros en interfaz
describe('Gestión de incidencias – listado de incidencias con filtros por estado y rango de fechas', () => {
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
        const pubId1 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId1,
          source: 'user',
          status: 'pending',
          assigned_moderator_id: moderadorId,
          assigned_at: new Date().toISOString(),
        });
      });

      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación cerrada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
      }).then((pubResponse) => {
        const pubId2 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId2,
          source: 'user',
          status: 'closed',
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

  it('UI-INC-009: La interfaz permite filtrar incidencias por estado, fecha, y limpiar los filtros - filtrar por estado', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    // Mostrar los filtros primero
    cy.contains('button', 'Mostrar Filtros', { timeout: 10000 }).click();
    cy.contains('label', 'Estado', { timeout: 10000 }).should('be.visible');

    // Buscar el select de estado por el label y seleccionar
    cy.contains('label', 'Estado').parent().within(() => {
      cy.get('select').select('pending');
    });
    
    // Esperar a que se aplique el filtro
    cy.contains('Publicación pendiente', { timeout: 10000 }).should('be.visible');

    // Verificar que solo se muestra la publicación con estado pendiente
    cy.contains('Publicación pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación cerrada').should('not.exist');
  });

  it('UI-INC-009: La interfaz permite filtrar incidencias por estado, fecha, y limpiar los filtros - filtrar por fecha', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    // Mostrar los filtros primero
    cy.contains('button', 'Mostrar Filtros', { timeout: 10000 }).click();
    cy.contains('label', 'Fecha desde', { timeout: 10000 }).should('be.visible');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Interceptar la petición que se dispara al escribir "Fecha desde"
    cy.intercept('GET', '**/moderation*date_from*').as('filterFrom');
    
    // Buscar el input de fecha desde por el label y escribir
    cy.contains('label', 'Fecha desde').parent().within(() => {
      cy.get('input[type="date"]').type(yesterday);
    });
    
    // Esperar a que se complete la petición del filtro "Fecha desde"
    cy.wait('@filterFrom');
    
    // Interceptar la petición que se dispara al escribir "Fecha hasta"
    cy.intercept('GET', '**/moderation*date_to*').as('filterTo');
    
    // Re-buscar el input de "Fecha hasta" (no reutilizar el nodo viejo) y verificar que no esté deshabilitado
    cy.contains('label', 'Fecha hasta').parent().within(() => {
      cy.get('input[type="date"]').should('not.be.disabled').type(today);
    });
    
    // Esperar a que se complete la petición del filtro "Fecha hasta"
    cy.wait('@filterTo');
    
    // Esperar a que se aplique el filtro
    cy.contains('Publicación pendiente', { timeout: 10000 }).should('be.visible');
  });

  it('UI-INC-009: La interfaz permite filtrar incidencias por estado, fecha, y limpiar los filtros - limpiar filtros', () => {
    cy.visit('http://localhost:8080/moderation');

    cy.contains('Moderación', { timeout: 10000 });

    // Mostrar los filtros primero
    cy.contains('button', 'Mostrar Filtros', { timeout: 10000 }).click();
    cy.contains('label', 'Estado', { timeout: 10000 }).should('be.visible');

    // Aplicar un filtro por estado
    cy.contains('label', 'Estado').parent().within(() => {
      cy.get('select').select('pending');
    });
    
    // Verificar que el filtro se aplicó
    cy.contains('Publicación pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación cerrada').should('not.exist');

    // Limpiar los filtros
    cy.contains('button', 'Limpiar Filtros', { timeout: 10000 })
      .should('not.be.disabled')
      .click();
    
    // Verificar que al limpiar filtros se muestran todas las incidencias
    cy.contains('Publicación pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación cerrada', { timeout: 10000 }).should('be.visible');
  });
});

