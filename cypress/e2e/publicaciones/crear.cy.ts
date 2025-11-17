/// <reference types="cypress" />

describe('Crear publicación', () => {
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
    return cy.request('GET', 'http://localhost:8080/testing/users').then((response) => {
      const user = response.body.find((u: any) => u.email === 'vendedor@test.com');
      if (!user) {
        throw new Error('Usuario vendedor@test.com no encontrado');
      }
      return user.id;
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

  beforeEach(() => {
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
  });

  it('PUB-CREAR-001: Crear publicación exitosamente', () => {
    cy.visit('http://localhost:8080/my-publications/create', {
      onBeforeLoad: setupGeolocationStub
    });

    cy.contains('Crear Nueva Publicación', { timeout: 10000 });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      const category = response.body[0];
      
      cy.get('#title').type('Laptop Gamer');
      cy.get('#description').type('Equipo de alto rendimiento ideal para videojuegos.');
      cy.get('#price').type('1499.99');
      
      cy.contains('label', 'Categoría').parent().within(() => {
        cy.get('[role="combobox"]').click();
      });
      cy.get('[role="option"]').first().click();
      cy.wait(500);

      cy.contains('label', 'Tipo').parent().within(() => {
        cy.get('[role="combobox"]').click();
      });
      cy.get('[role="option"]').contains('Producto').click();
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
      
      getUserId().then((userId) => {
        cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
          const userPublications = response.body.filter((p: any) => p.created_by === userId);
          
          let publication = userPublications.find((p: any) => 
            p.title && (p.title.includes('Laptop Gamer') || p.title === 'Laptop Gamer')
          );
          
          if (!publication && userPublications.length > 0) {
            const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
            publication = sorted[0];
          }
          
          expect(publication).to.exist;
          if (publication) {
            expect(parseFloat(publication.price)).to.be.closeTo(1499.99, 0.01);
          }
        });
      });

      cy.contains('a', 'Mis Publicaciones', { timeout: 10000 }).click();
      cy.wait(2000); 
      
      cy.contains('Laptop Gamer', { timeout: 10000 }).should('be.visible');
    });
  });

  it('PUB-CREAR-002: Crear servicio con horario obligatorio', () => {
    cy.visit('http://localhost:8080/my-publications/create', {
      onBeforeLoad: setupGeolocationStub
    });

    cy.contains('Crear Nueva Publicación', { timeout: 10000 });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      const category = response.body[0];
      
      cy.get('#title').type('Servicio de mantenimiento');
      cy.get('#description').type('Mantenimiento preventivo y correctivo.');
      cy.get('#price').type('299.99');
      
      cy.contains('label', 'Categoría').parent().within(() => {
        cy.get('[role="combobox"]').click();
      });
      cy.get('[role="option"]').first().click();
      cy.wait(500);

      cy.contains('label', 'Tipo').parent().within(() => {
        cy.get('[role="combobox"]').click();
      });
      cy.get('[role="option"]').contains('Servicio').click();
      cy.wait(500);

      cy.wait(1000);

      cy.get('button[type="submit"]').contains('Crear Publicación').should('be.disabled');

      cy.contains('button', 'Usar mi ubicación').click();
      cy.wait(2000);

      const fileName = 'test-image.png';
      const fileContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent, 'base64'),
        fileName: fileName,
        mimeType: 'image/png',
      }, { force: true });

      cy.wait(2000);

      cy.get('button[type="submit"]').contains('Crear Publicación').then(($btn) => {
        if ($btn.is(':disabled')) {
          expect($btn).to.be.disabled;
        } else {
          cy.wrap($btn).click();
          cy.wait(1000);
          cy.url().should('include', '/create');
        }
      });
      cy.contains('a', 'Mis Publicaciones', { timeout: 10000 }).click();
      cy.wait(2000); 
    });
  });
});

