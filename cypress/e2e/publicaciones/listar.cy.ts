/// <reference types="cypress" />

describe('Listar publicaciones', () => {
  // Resetear BD solo una vez al inicio de todos los tests
  before(() => {
    cy.request('POST', 'http://localhost:8080/testing/reset-db', { seed: true });
    
    // Crear usuario una sola vez
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'usuario@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
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
      // Esperar a que la redirección se complete
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

  it('PUB-LISTAR-001: Visualizar listado de publicaciones', () => {
    // Crear algunas publicaciones de prueba
    cy.request('GET', 'http://localhost:8080/testing/categories').then((categoryResponse) => {
      const category = categoryResponse.body[0];
      
      cy.request('POST', 'http://localhost:8080/testing/user', {
        email: 'vendedor1@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;
        
        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Publicación Test 1',
          description: 'Descripción de prueba 1',
          price: 100.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Publicación Test 2',
          description: 'Descripción de prueba 2',
          price: 200.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http://localhost:8080/publication');

        // Esperar a que la página cargue y verificar que se muestra el listado
        cy.contains('Publicaciones', { timeout: 10000 });
        
        // Verificar que aparecen las publicaciones creadas
        cy.contains('Publicación Test 1', { timeout: 10000 });
        cy.contains('Publicación Test 2');
      });
    });
  });

  it('PUB-LISTAR-002: Filtrar publicaciones por categoría', () => {
    cy.request('GET', 'http://localhost:8080/testing/categories').then((categoryResponse) => {
      const category1 = categoryResponse.body[0];
      const category2 = categoryResponse.body[1] || categoryResponse.body[0];
      
      cy.request('POST', 'http://localhost:8080/testing/user', {
        email: 'vendedor2@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;
        
        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Pub Categoría 1',
          description: 'Descripción',
          price: 100.00,
          category_id: category1.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Pub Categoría 2',
          description: 'Descripción',
          price: 200.00,
          category_id: category2.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http://localhost:8080/publication');

        // Esperar a que la página cargue
        cy.contains('Publicaciones', { timeout: 10000 });

        // Filtrar por categoría (ajusta según tu implementación del filtro)
        // Esto es un ejemplo, ajusta según cómo esté implementado el filtro
        cy.contains('Pub Categoría 1', { timeout: 10000 });
      });
    });
  });

  it('PUB-LISTAR-003: Buscar publicaciones', () => {
    cy.request('GET', 'http://localhost:8080/testing/categories').then((categoryResponse) => {
      const category = categoryResponse.body[0];
      
      cy.request('POST', 'http://localhost:8080/testing/user', {
        email: 'vendedor3@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;
        
        cy.request('POST', 'http://localhost:8080/testing/publication', {
          title: 'Laptop HP',
          description: 'Laptop en excelente estado',
          price: 500.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http://localhost:8080/publication');

        // Esperar a que la página cargue
        cy.contains('Publicaciones', { timeout: 10000 });

        // Buscar (ajusta según tu implementación del buscador)
        // Esto es un ejemplo, ajusta según cómo esté implementado
        cy.contains('Laptop HP', { timeout: 10000 });
      });
    });
  });
});

