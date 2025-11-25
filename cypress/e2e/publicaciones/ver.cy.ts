/// <reference types="cypress" />

describe('Ver publicación', () => {
  let publicationId: number;

  before(() => {
    cy.request('POST', 'http:

    cy.request('POST', 'http:
      email: 'usuario@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
    });

    cy.request('GET', 'http:
      const category = categoryResponse.body[0];

      cy.request('POST', 'http:
        email: 'vendedor@test.com',
        password: 'Admin123@',
        role: 'vendedor',
        email_verified_at: new Date().toISOString(),
      }).then((sellerResponse) => {
        const sellerId = sellerResponse.body.id;

        cy.request('POST', 'http:
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

  it('PUB-VER-001: Visualizar detalles de publicación', () => {
    cy.visit(`http:

    cy.contains('Publicación para ver', { timeout: 10000 });
    cy.contains('Esta es una publicación de prueba para visualizar');
    cy.contains('150.00');
  });

  it('PUB-VER-002: Ver información del vendedor', () => {
    cy.visit(`http:

    cy.contains('Publicación para ver', { timeout: 10000 });

    cy.contains('Información del Vendedor', { timeout: 10000 });

    cy.contains('Vendedor verificado', { timeout: 10000 });
  });

  it('PUB-VER-003: Agregar a favoritos desde vista', () => {
    cy.visit(`http:

    cy.contains('Publicación para ver', { timeout: 10000 });

    cy.get('button').contains('Agregar a Favoritos').click();

    cy.wait(2000);
    cy.get('button').contains('Quitar de Favoritos', { timeout: 10000 });
  });
});
