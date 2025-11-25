/// <reference types="cypress" />

describe('Filtros de publicaciones', () => {
  const setupGeolocationStub = (win: Window, lat: number, lng: number) => {
    win.navigator.geolocation.getCurrentPosition = (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: lat,
            longitude: lng,
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

  const createPublication = (
    title: string,
    description: string,
    price: string,
    type: 'producto' | 'servicio',
    categoryName: string,
    lat: number,
    lng: number
  ): Cypress.Chainable<number> => {
    return cy.visit('http:
      onBeforeLoad: (win) => setupGeolocationStub(win, lat, lng)
    }).then(() => {
      cy.contains('Crear Nueva Publicación', { timeout: 10000 });

      return cy.request('GET', 'http:
        const category = response.body.find((c: any) => c.name === categoryName);
        if (!category) {
          throw new Error(`Categoría ${categoryName} no encontrada`);
        }

        cy.get('#title').type(title);
        cy.get('#description').type(description);
        cy.get('#price').type(price);

        cy.contains('label', 'Categoría').parent().within(() => {
          cy.get('[role="combobox"]').click();
        });
        cy.get(`[role="option"]`).contains(categoryName).click();
        cy.wait(500);

        cy.contains('label', 'Tipo').parent().within(() => {
          cy.get('[role="combobox"]').click();
        });
        cy.get('[role="option"]').contains(type === 'producto' ? 'Producto' : 'Servicio').click();
        cy.wait(500);

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
      }).then(() => {
        return getUserId().then((userId) => {
          return cy.request('GET', 'http:
            const userPublications = response.body.filter((p: any) => p.created_by === userId);

            let publication = userPublications.find((p: any) =>
              p.title && (p.title.includes(title) || p.title === title)
            );

            if (!publication && userPublications.length > 0) {
              const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
              publication = sorted[0];
            }

            expect(publication).to.exist;
            return publication.id;
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

  it('PUB-FILTROS-001: Crear 3 publicaciones y probar filtros por categoría, tipo, precio y ubicación', () => {
    let publicacion1Id: number;
    let publicacion2Id: number;
    let publicacion3Id: number;

    createPublication(
      'Smartphone Samsung Galaxy',
      'Smartphone de última generación con pantalla AMOLED.',
      '50.00',
      'producto',
      'Electrónicos',
      -0.2299,
      -78.5249
    ).then((id) => {
      publicacion1Id = id;

      return createPublication(
        'Servicio de Diseño de Moda',
        'Servicio profesional de diseño y confección de ropa a medida.',
        '200.00',
        'servicio',
        'Ropa y Accesorios',
        -2.1709,
        -79.9224
      );
    }).then((id) => {
      publicacion2Id = id;

      return createPublication(
        'Mesa de Comedor Moderna',
        'Mesa de comedor de madera maciza con capacidad para 6 personas.',
        '500.00',
        'producto',
        'Hogar y Jardín',
        -2.9001,
        -79.0059
      );
    }).then((id) => {
      publicacion3Id = id;

      cy.request('GET', 'http:
        const pub1 = response.body.find((p: any) => p.id === publicacion1Id);
        const pub2 = response.body.find((p: any) => p.id === publicacion2Id);
        const pub3 = response.body.find((p: any) => p.id === publicacion3Id);

        expect(pub1).to.exist;
        expect(pub2).to.exist;
        expect(pub3).to.exist;
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
      cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
      cy.contains('Mesa de Comedor Moderna', { timeout: 10000 }).should('be.visible');

      cy.request('GET', 'http:
        const categoriaElectronicos = categoriesResponse.body.find((c: any) => c.name === 'Electrónicos');
        const categoriaRopa = categoriesResponse.body.find((c: any) => c.name === 'Ropa y Accesorios');
        const categoriaHogar = categoriesResponse.body.find((c: any) => c.name === 'Hogar y Jardín');

        cy.get('button').contains('Filtros').click({ force: true });
        cy.wait(1000);

        if (categoriaElectronicos) {
          cy.get(`#category-${categoriaElectronicos.id}`).click({ force: true });
          cy.wait(2000);

          cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
          cy.contains('Servicio de Diseño de Moda').should('not.exist');
          cy.contains('Mesa de Comedor Moderna').should('not.exist');

          cy.get(`#category-${categoriaElectronicos.id}`).click({ force: true });
          cy.wait(2000);
        }

        cy.get('label').contains('Tipo').parent().within(() => {
          cy.get('[role="combobox"]').click({ force: true });
        });
        cy.get('[role="option"]').contains('Servicio').click({ force: true });
        cy.wait(2000);

        cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
        cy.contains('Smartphone Samsung Galaxy').should('not.exist');
        cy.contains('Mesa de Comedor Moderna').should('not.exist');

        cy.get('label').contains('Tipo').parent().within(() => {
          cy.get('[role="combobox"]').click({ force: true });
        });
        cy.get('[role="option"]').contains('Todos los tipos').click({ force: true });
        cy.wait(2000);

        cy.get('label').contains('Precio').parent().within(() => {
          cy.get('button').contains('Mostrar').click({ force: true });
        });
        cy.wait(500);
        cy.get('#min-price').clear({ force: true }).type('100', { force: true });
        cy.get('#max-price').clear({ force: true }).type('300', { force: true });
        cy.get('button').contains('Aplicar Filtro de Precio').click({ force: true });
        cy.wait(2000);

        cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
        cy.contains('Smartphone Samsung Galaxy').should('not.exist');
        cy.contains('Mesa de Comedor Moderna').should('not.exist');

        cy.get('#min-price').clear({ force: true });
        cy.get('#max-price').clear({ force: true });
        cy.wait(1000);

        cy.window().then((win) => {
          setupGeolocationStub(win, -0.2299, -78.5249);
        });

        cy.get('button').contains('Buscar cerca de mí').scrollIntoView().should('be.visible');
        cy.get('button').contains('Buscar cerca de mí').click({ force: true });
        cy.wait(2000);

        cy.contains('Buscar cerca de mí', { timeout: 5000 }).should('exist');
        cy.wait(3000);

        cy.get('button').contains('Aplicar filtro', { timeout: 5000 }).scrollIntoView().should('be.visible');
        cy.get('button').contains('Aplicar filtro').click({ force: true });
        cy.wait(3000);

        cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');

        cy.get('button').contains('Desactivar ubicación').click({ force: true });
        cy.wait(2000);

        cy.get('button').contains('Cerrar').click({ force: true });
        cy.wait(1000);

        cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
        cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
        cy.contains('Mesa de Comedor Moderna', { timeout: 10000 }).should('be.visible');

        cy.contains('Ordenar:').parent().within(() => {
          cy.get('[role="combobox"]').click({ force: true });
        });
        cy.get('[role="option"]').contains('Precio: mayor').click({ force: true });
        cy.wait(2000);

        cy.get('h3.font-bold.text-lg').should('have.length.at.least', 3).then(($titles) => {
          const titles = Array.from($titles).map(el => el.textContent?.trim());

          expect(titles[0]).to.include('Mesa de Comedor Moderna');

          expect(titles[1]).to.include('Servicio de Diseño de Moda');

          expect(titles[2]).to.include('Smartphone Samsung Galaxy');
        });

        cy.contains('Ordenar:').parent().within(() => {
          cy.get('[role="combobox"]').click({ force: true });
        });
        cy.get('[role="option"]').contains('Más recientes').click({ force: true });
        cy.wait(2000);

        cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
        cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
        cy.contains('Mesa de Comedor Moderna', { timeout: 10000 }).should('be.visible');

        cy.get('input[type="text"][placeholder*="Buscar"]').clear({ force: true }).type('Samsung', { force: true });
        cy.get('form').submit();
        cy.wait(2000);

        cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
        cy.contains('Servicio de Diseño de Moda').should('not.exist');
        cy.contains('Mesa de Comedor Moderna').should('not.exist');

        cy.get('input[type="text"][placeholder*="Buscar"]').clear({ force: true });
        cy.get('form').submit();
        cy.wait(2000);

        cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
        cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
        cy.contains('Mesa de Comedor Moderna', { timeout: 10000 }).should('be.visible');
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Smartphone Samsung Galaxy', { timeout: 10000 }).should('be.visible');
      cy.contains('Servicio de Diseño de Moda', { timeout: 10000 }).should('be.visible');
      cy.contains('Mesa de Comedor Moderna', { timeout: 10000 }).should('be.visible');
    });
  });
});
