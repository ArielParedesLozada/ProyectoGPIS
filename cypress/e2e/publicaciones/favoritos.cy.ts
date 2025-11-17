/// <reference types="cypress" />

describe('Favoritos de publicaciones', () => {
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

  const getUserId = (email: string): Cypress.Chainable<number> => {
    return cy.request('GET', 'http://localhost:8080/testing/users').then((response) => {
      const user = response.body.find((u: any) => u.email === email);
      if (!user) {
        throw new Error(`Usuario ${email} no encontrado`);
      }
      return user.id;
    });
  };

  const createPublication = (title: string, description: string, price: string, type: 'producto' | 'servicio'): Cypress.Chainable<number> => {
    return cy.visit('http://localhost:8080/my-publications/create', {
      onBeforeLoad: setupGeolocationStub
    }).then(() => {
      cy.contains('Crear Nueva Publicación', { timeout: 10000 });

      return cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
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
        
        return getUserId('vendedor@test.com').then((userId) => {
          return cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
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
    cy.request('POST', 'http://localhost:8080/testing/reset-db', { seed: true });
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    });
  });

  it('PUB-FAV-004: Crear publicación servicio, marcar favorito, desmarcar desde favoritos y verificar en publicaciones', () => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should('satisfy', (url) => {
        return !url.includes('/login');
      });
      cy.wait(2000);
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });

    createPublication(
      'Servicio de Consultoría IT',
      'Servicio profesional de consultoría en tecnologías de la información.',
      '299.99',
      'servicio'
    ).then((id) => {
      servicioId = id;

      cy.visit('http://localhost:8080/publication');
      cy.contains('Servicio de Consultoría IT', { timeout: 10000 }).should('be.visible');

      cy.contains('Servicio de Consultoría IT').then(($title) => {
        cy.wrap($title).parents('div').filter((index, el) => {
          const hasTitle = el.textContent?.includes('Servicio de Consultoría IT');
          const hasFavoriteButton = el.querySelector('button[title*="Agregar"]') !== null ||
                                   el.querySelector('button[title*="favorito"]') !== null ||
                                   el.querySelector('button svg') !== null;
          return hasTitle && hasFavoriteButton;
        }).first().within(() => {
          cy.get('button').filter((index, el) => {
            const title = el.getAttribute('title') || '';
            const hasHeartIcon = el.querySelector('svg') !== null;
            const isFavoriteButton = title.includes('Agregar') || title.includes('favorito') || hasHeartIcon;
            return hasHeartIcon && isFavoriteButton;
          }).first().click({ force: true });
        });
      });

      cy.wait(2000);

      cy.visit('http://localhost:8080/favorites');
      cy.contains('Servicio de Consultoría IT', { timeout: 10000 }).should('be.visible');

      cy.contains('Servicio de Consultoría IT').then(($title) => {
        cy.wrap($title).parents('div').filter((index, el) => {
          const hasTitle = el.textContent?.includes('Servicio de Consultoría IT');
          const hasLink = el.querySelector('a[href*="/publication/"]') !== null;
          return hasTitle && hasLink;
        }).first().within(() => {
          cy.get('a[href*="/publication/"]').first().click({ force: true });
        });
      });
      cy.url({ timeout: 10000 }).should('include', `/publication/${servicioId}`);
      cy.contains('Servicio de Consultoría IT', { timeout: 10000 }).should('be.visible');

      cy.get('button').contains('Quitar de Favoritos').click();
      cy.wait(2000);

      cy.contains('a', 'Publicaciones').click();
      cy.url({ timeout: 10000 }).should('include', '/publication');

      cy.contains('Servicio de Consultoría IT', { timeout: 10000 }).should('be.visible');

      cy.visit('http://localhost:8080/favorites');
      cy.contains('Servicio de Consultoría IT', { timeout: 10000 }).should('not.exist');
    });
  });
});

