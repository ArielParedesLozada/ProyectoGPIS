/// <reference types="cypress" />

describe('Listar publicaciones', () => {

  before(() => {
    cy.request('POST', 'http:

    cy.request('POST', 'http:
      email: 'usuario@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
    });
  });

  beforeEach(() => {

    cy.session('usuario-login', () => {
      cy.request('GET', 'http:
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http:
      cy.get('input[name="email"]').type('usuario@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should('satisfy', (url) => {
        return !url.includes('/login');
      });
      cy.wait(2000);
    });

    cy.request('GET', 'http:
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('PUB-LISTAR-001: Visualizar listado de publicaciones', () => {

    cy.request('GET', 'http:
      const category = categoryResponse.body[0];

      cy.request('POST', 'http:
        email: 'vendedor1@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;

        cy.request('POST', 'http:
          title: 'Publicación Test 1',
          description: 'Descripción de prueba 1',
          price: 100.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.request('POST', 'http:
          title: 'Publicación Test 2',
          description: 'Descripción de prueba 2',
          price: 200.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http:

        cy.contains('Publicaciones', { timeout: 10000 });

        cy.contains('Publicación Test 1', { timeout: 10000 });
        cy.contains('Publicación Test 2');
      });
    });
  });

  it('PUB-LISTAR-002: Filtrar publicaciones por categoría', () => {
    cy.request('GET', 'http:
      const category1 = categoryResponse.body[0];
      const category2 = categoryResponse.body[1] || categoryResponse.body[0];

      cy.request('POST', 'http:
        email: 'vendedor2@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;

        cy.request('POST', 'http:
          title: 'Pub Categoría 1',
          description: 'Descripción',
          price: 100.00,
          category_id: category1.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.request('POST', 'http:
          title: 'Pub Categoría 2',
          description: 'Descripción',
          price: 200.00,
          category_id: category2.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http:

        cy.contains('Publicaciones', { timeout: 10000 });

        cy.contains('Pub Categoría 1', { timeout: 10000 });
      });
    });
  });

  it('PUB-LISTAR-003: Buscar publicaciones', () => {
    cy.request('GET', 'http:
      const category = categoryResponse.body[0];

      cy.request('POST', 'http:
        email: 'vendedor3@test.com',
        password: 'Admin123@',
        role: 'vendedor',
      }).then((sellerResponse) => {
        const seller = sellerResponse.body;

        cy.request('POST', 'http:
          title: 'Laptop HP',
          description: 'Laptop en excelente estado',
          price: 500.00,
          category_id: category.id,
          created_by: seller.id,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
        });

        cy.visit('http:

        cy.contains('Publicaciones', { timeout: 10000 });

        cy.contains('Laptop HP', { timeout: 10000 });
      });
    });
  });
});
