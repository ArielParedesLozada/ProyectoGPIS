/// <reference types="cypress" />

describe('Deshabilitar publicación', () => {
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

      cy.request('GET', 'http:
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
      });

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

  it('PUB-DESHABILITAR-001: Crear publicación, deshabilitarla y verificar que no aparece en publicaciones', () => {
    let publicationId: number;

    createPublication(
      'Producto de Prueba',
      'Descripción del producto de prueba para deshabilitar.',
      '199.99',
      'producto'
    ).then((id) => {
      publicationId = id;

      cy.visit('http:
      cy.contains('Producto de Prueba', { timeout: 10000 }).should('be.visible');

      cy.contains('Producto de Prueba').then(($title) => {
        cy.wrap($title).parents('div').filter((index, el) => {
          const hasButton = el.querySelector('button') !== null;
          const hasTitle = el.textContent?.includes('Producto de Prueba');
          return hasButton && hasTitle;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            return el.querySelector('svg') !== null;
          }).first().click({ force: true });
        });
      });

      cy.wait(1000);

      cy.get('[role="menuitem"]').contains('Inhabilitar').should('be.visible').click({ force: true });

      cy.wait(5000);

      cy.request('GET', 'http:
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        
        if (publication.status !== 2) {
          cy.wait(3000);
          cy.request('GET', 'http://localhost:8080/testing/publications').then((response2) => {
            const publication2 = response2.body.find((p: any) => p.id === publicationId);
            expect(publication2).to.exist;
            expect(publication2.status).to.eq(2);
          });
        } else {
          expect(publication.status).to.eq(2);
        }
      });

      cy.visit('http:
      cy.wait(2000);

      cy.contains('Producto de Prueba', { timeout: 10000 }).should('not.exist');
    });
  });
});
