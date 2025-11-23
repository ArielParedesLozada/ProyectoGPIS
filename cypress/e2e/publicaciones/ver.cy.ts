/// <reference types="cypress" />

describe('Ver publicación', () => {
  let publicationId: number;

  // Resetear BD solo una vez al inicio de todos los tests
  before(() => {
    cy.request('POST', 'http://localhost:8080/testing/reset-db', { seed: true });
    
    // Crear usuario comprador una sola vez
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'usuario@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
    });

    // Crear vendedor y publicación una sola vez
    cy.request('GET', 'http://localhost:8080/testing/categories').then((categoryResponse) => {
      const category = categoryResponse.body[0];
      
      cy.request('POST', 'http://localhost:8080/testing/user', {
        email: 'vendedor@test.com',
        password: 'Admin123@',
        role: 'vendedor',
        email_verified_at: new Date().toISOString(),
      }).then((sellerResponse) => {
        const sellerId = sellerResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Publicación para ver',
          description: 'Esta es una publicación de prueba para visualizar',
          price: 150.00,
          category_id: category.id,
          created_by: sellerId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        }).then((pubResponse) => {
          publicationId = pubResponse.body.id;
        });
      });
    });
  });

  // Antes de cada test, solo manejar la sesión de login (sin resetear BD)
  beforeEach(() => {
    // Usar cy.session() para cachear la sesión de login entre tests
    cy.session('usuario-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      // Hacer login (el usuario ya existe)
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('usuario@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should('satisfy', (url) => {
        return !url.includes('/login');
      });
      cy.wait(2000);
    });

    // Restaurar cookies de la sesión cacheada
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('PUB-VER-001: Visualizar detalles de publicación', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);

    // Esperar a que la página cargue y verificar que se muestran los detalles
    cy.contains('Publicación para ver', { timeout: 10000 });
    cy.contains('Esta es una publicación de prueba para visualizar');
    cy.contains('150.00');
  });

  it('PUB-VER-002: Ver información del vendedor', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);

    // Esperar a que la página cargue
    cy.contains('Publicación para ver', { timeout: 10000 });

    // Verificar que existe la sección de información del vendedor
    cy.contains('Información del Vendedor', { timeout: 10000 });
    
    // El email no se muestra, pero podemos verificar que se muestra el nombre o la sección
    // La sección debe contener "Vendedor verificado" o el nombre del usuario
    cy.contains('Vendedor verificado', { timeout: 10000 });
  });

  it('PUB-VER-003: Agregar a favoritos desde vista', () => {
    cy.visit(`http://localhost:8080/publication/${publicationId}`);

    // Esperar a que la página cargue
    cy.contains('Publicación para ver', { timeout: 10000 });

    // Buscar botón de favoritos y hacer clic
    cy.get('button').contains('Agregar a Favoritos').click();

    // Verificar que cambió el texto del botón
    cy.wait(2000);
    cy.get('button').contains('Quitar de Favoritos', { timeout: 10000 });
  });
});

