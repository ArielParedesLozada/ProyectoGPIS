/// <reference types="cypress" />

describe('Eliminar publicación', () => {
  let productoId: number;
  let servicioId: number;

  const setupGeolocationStub = (win: Window) => {
    win.navigator.geolocation.getCurrentPosition = (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: -0.2299,
            longitude: -78.5249,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          } as GeolocationCoordinates,
          timestamp: Date.now()
        } as GeolocationPosition);
      }, 100);
    };
  };

  const getUserId = (): Cypress.Chainable<number> => {
    return cy.request('GET', 'http:
      const user = response.body.find((u: any) => u.email === 'vendedor@test.com');
      if (!user) {
        throw new Error('Usuario vendedor@test.com no encontrado');
      }
      return user.id;
    });
  };

  const createPublication = (title: string, description: string, price: string, type: 'producto' | 'servicio'): Cypress.Chainable<number> => {
    return cy.visit('http:
      onBeforeLoad: setupGeolocationStub
    }).then(() => {
      cy.contains('Crear Nueva Publicación', { timeout: 10000 });

      return cy.request('GET', 'http:
        const category = response.body[0];

        cy.get('#title').type(title);
        cy.get('#description').type(description);
        cy.get('#price').type(price);

        cy.contains('label', 'Categoría').parent().within(() => {
          cy.get('[role="combobox"]').click();
        });
        cy.get('[role="option"]').first().click();
        cy.wait(500);

        cy.contains('label', 'Tipo').parent().within(() => {
          cy.get('[role="combobox"]').click();
        });
        cy.get('[role="option"]').contains(type === 'producto' ? 'Producto' : 'Servicio').click();
        cy.wait(1000);

        cy.contains('button', 'Usar mi ubicación').click();
        cy.wait(2000);

        const fileName = 'test-image.png';
        const fileContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: fileName,
          mimeType: 'image/png',
        }, { force: true });

        cy.wait(1000);

        cy.get('button[type="submit"]').contains('Crear Publicación').click();

        cy.url({ timeout: 10000 }).should('include', '/my-publications');

        cy.wait(4000);

        return getUserId().then((userId) => {
          return cy.request('GET', 'http:
            const userPublications = response.body.filter((p: any) => p.created_by === userId);
            const publication = userPublications.find((p: any) =>
              p.title && (p.title.includes(title) || p.title === title)
            );

            if (!publication && userPublications.length > 0) {
              const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
              return sorted[0].id;
            } else if (publication) {
              return publication.id;
            }
            throw new Error(`No se encontró la publicación con título: ${title}`);
          });
        });
      });
    });
  };

  before(() => {
    cy.request('POST', 'http:

    cy.request('POST', 'http:
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    });
  });

  beforeEach(() => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http:
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http:
      cy.get('input[name="email"]').type('vendedor@test.com');
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

  it('PUB-ELIMINAR-001: Eliminar publicación de tipo producto exitosamente', () => {
    createPublication(
      'Laptop Dell XPS 15',
      'Laptop de alto rendimiento con procesador Intel i7.',
      '1299.99',
      'producto'
    ).then((id) => {
      productoId = id;

      return createPublication(
        'Servicio de Reparación',
        'Servicio profesional de reparación de equipos electrónicos.',
        '199.99',
        'servicio'
      );
    }).then((id) => {
      servicioId = id;

      cy.request('GET', 'http:
        const producto = response.body.find((p: any) => p.id === productoId);
        const servicio = response.body.find((p: any) => p.id === servicioId);

        expect(producto).to.exist;
        expect(servicio).to.exist;
        expect(producto.type).to.eq('producto');
        expect(servicio.type).to.eq('servicio');
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Laptop Dell XPS 15', { timeout: 10000 }).should('be.visible');

      cy.contains('Laptop Dell XPS 15').then(($title) => {
        cy.wrap($title).parents().filter((index, el) => {
          const hasButton = el.querySelector('button') !== null;
          const hasTitle = el.textContent?.includes('Laptop Dell XPS 15');
          return hasButton && hasTitle;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            return el.querySelector('svg') !== null;
          }).first().click({ force: true });
        });
      });

      cy.wait(1000);

      cy.get('[role="menuitem"]').contains('Eliminar').should('be.visible').click({ force: true });

      cy.wait(1000);

      cy.contains('Confirmar eliminación', { timeout: 5000 }).should('be.visible');
      cy.contains('¿Estás seguro?').should('be.visible');

      cy.contains('¿Estás seguro?').parents('div').filter((index, el) => {
        return el.textContent?.includes('Esta acción no se puede deshacer') &&
               el.querySelector('button') !== null;
      }).first().within(() => {
        cy.get('button').contains('Eliminar').should('be.visible').should('not.be.disabled').click({ force: true });
      });

      cy.wait(2000);

      cy.contains('Confirmar eliminación', { timeout: 10000 }).should('not.exist');

      cy.wait(2000);

      cy.url({ timeout: 10000 }).should('include', '/my-publications');

      cy.visit('http:
      cy.wait(3000);

      cy.contains('Laptop Dell XPS 15', { timeout: 10000 }).should('not.exist');

      cy.request('GET', 'http:
        const deletedProducto = response.body.find((p: any) => p.id === productoId);
        const servicio = response.body.find((p: any) => p.id === servicioId);

        expect(deletedProducto).to.be.undefined;

        expect(servicio).to.exist;
        expect(servicio.type).to.eq('servicio');
      });

      cy.contains('Servicio de Reparación').should('be.visible');
    });
  });

  it('PUB-ELIMINAR-002: Cancelar eliminación de publicación y verificar que no se eliminó', () => {
    let testPublicationId: number;

    createPublication(
      'Producto para Cancelar',
      'Descripción del producto para probar cancelar eliminación.',
      '299.99',
      'producto'
    ).then((id) => {
      testPublicationId = id;

      cy.request('GET', 'http:
        const publication = response.body.find((p: any) => p.id === testPublicationId);
        expect(publication).to.exist;
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Producto para Cancelar', { timeout: 10000 }).should('be.visible');

      cy.contains('Producto para Cancelar').then(($title) => {
        cy.wrap($title).parents().filter((index, el) => {
          const hasButton = el.querySelector('button') !== null;
          const hasTitle = el.textContent?.includes('Producto para Cancelar');
          return hasButton && hasTitle;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            return el.querySelector('svg') !== null;
          }).first().click({ force: true });
        });
      });

      cy.wait(1000);

      cy.get('[role="menuitem"]').contains('Eliminar').should('be.visible').click({ force: true });

      cy.contains('Confirmar eliminación', { timeout: 5000 }).should('be.visible');
      cy.contains('¿Estás seguro?').should('be.visible');

      cy.get('button').contains('Cancelar').should('be.visible').click({ force: true });

      cy.wait(2000);

      cy.url({ timeout: 10000 }).should('include', '/my-publications');

      cy.request('GET', 'http:
        const publication = response.body.find((p: any) => p.id === testPublicationId);
        expect(publication).to.exist;
        expect(publication.title).to.include('Producto para Cancelar');
      });

      cy.visit('http:
      cy.wait(2000);
      cy.contains('Producto para Cancelar', { timeout: 10000 }).should('be.visible');
    });
  });

  it('PUB-ELIMINAR-003: Deshabilitar publicación y luego eliminarla', () => {
    let testPublicationId: number;

    createPublication(
      'Producto para Deshabilitar y Eliminar',
      'Descripción del producto para deshabilitar y luego eliminar.',
      '399.99',
      'producto'
    ).then((id) => {
      testPublicationId = id;

      cy.request('GET', 'http:
        const publication = response.body.find((p: any) => p.id === testPublicationId);
        expect(publication).to.exist;
        expect(publication.status).to.eq(1);
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Producto para Deshabilitar y Eliminar', { timeout: 10000 }).should('be.visible');

      cy.contains('Producto para Deshabilitar y Eliminar').then(($title) => {
        cy.wrap($title).parents().filter((index, el) => {
          const hasButton = el.querySelector('button') !== null;
          const hasTitle = el.textContent?.includes('Producto para Deshabilitar y Eliminar');
          return hasButton && hasTitle;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            return el.querySelector('svg') !== null;
          }).first().click({ force: true });
        });
      });

      cy.wait(1000);

      cy.get('[role="menuitem"]').contains('Inhabilitar').should('be.visible').click({ force: true });

      cy.wait(2000);

      cy.request('GET', 'http:
        const publication = response.body.find((p: any) => p.id === testPublicationId);
        expect(publication).to.exist;
        expect(publication.status).to.eq(2);
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Producto para Deshabilitar y Eliminar', { timeout: 10000 }).should('be.visible');

      cy.contains('Producto para Deshabilitar y Eliminar').then(($title) => {
        cy.wrap($title).parents().filter((index, el) => {
          const hasButton = el.querySelector('button') !== null;
          const hasTitle = el.textContent?.includes('Producto para Deshabilitar y Eliminar');
          return hasButton && hasTitle;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            return el.querySelector('svg') !== null;
          }).first().click({ force: true });
        });
      });

      cy.wait(1000);

      cy.get('[role="menuitem"]').contains('Eliminar').should('be.visible').click({ force: true });

      cy.contains('Confirmar eliminación', { timeout: 5000 }).should('be.visible');
      cy.contains('¿Estás seguro?').should('be.visible');

      cy.contains('¿Estás seguro?').parents('div').filter((index, el) => {
        return el.textContent?.includes('Esta acción no se puede deshacer') &&
               el.querySelector('button') !== null;
      }).first().within(() => {
        cy.get('button').contains('Eliminar').should('be.visible').click({ force: true });
      });

      cy.wait(3000);

      cy.url({ timeout: 10000 }).should('include', '/my-publications');

      cy.request('GET', 'http:
        const deletedPublication = response.body.find((p: any) => p.id === testPublicationId);
        expect(deletedPublication).to.be.undefined;
      });

      cy.visit('http:
      cy.wait(2000);
      cy.contains('Producto para Deshabilitar y Eliminar').should('not.exist');
    });
  });
});
