/// <reference types="cypress" />

describe('Editar publicación', () => {
  let publicationId: number;

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
        
        return getUserId().then((userId) => {
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

  it('PUB-EDITAR-001: Editar publicación exitosamente', () => {
    cy.visit('http://localhost:8080/my-publications/create', {
      onBeforeLoad: setupGeolocationStub
    });

    cy.contains('Crear Nueva Publicación', { timeout: 10000 });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      const category = response.body[0];
      
      cy.get('#title').type('Servicio de Mantenimiento');
      cy.get('#description').type('Servicio profesional de mantenimiento preventivo y correctivo.');
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
      
      getUserId().then((userId) => {
        cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
          const userPublications = response.body.filter((p: any) => p.created_by === userId);
          const publication = userPublications.find((p: any) => 
            p.title && (p.title.includes('Servicio de Mantenimiento') || p.title === 'Servicio de Mantenimiento')
          );
          
          if (!publication && userPublications.length > 0) {
            const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
            publicationId = sorted[0].id;
          } else if (publication) {
            publicationId = publication.id;
          }
          
          expect(publicationId).to.exist;
          
          cy.visit(`http://localhost:8080/my-publications/${publicationId}/edit`, {
            onBeforeLoad: setupGeolocationStub
          });

          cy.contains('Editar Publicación', { timeout: 10000 });

          cy.get('#title').clear();
          cy.wait(200);
          cy.get('#title').type('Servicio de Mantenimiento Actualizado');
          cy.wait(1500);
          
          cy.get('#description').clear();
          cy.wait(200);
          cy.get('#description').type('Servicio actualizado con nuevas características.');
          cy.wait(1000);
          
          cy.get('#price').clear();
          cy.wait(200);
          cy.get('#price').type('399.99');
          cy.wait(1000);

          cy.contains('button', 'Usar mi ubicación').click();
          cy.wait(3000);
          cy.wait(1000);

          cy.get('button[type="submit"]').contains('Guardar Cambios', { timeout: 15000 }).should('be.enabled');
          cy.wait(1000);
          
          cy.get('#title').should('have.value', 'Servicio de Mantenimiento Actualizado');
          cy.get('#description').should('have.value', 'Servicio actualizado con nuevas características.');
          cy.get('#price').should('have.value', '399.99');
          
          cy.get('button[type="submit"]').contains('Guardar Cambios').click({ force: true });

          cy.wait(2000);

          cy.url({ timeout: 20000 }).should('include', `/my-publications/${publicationId}`);
          
          cy.wait(3000);
          
          cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
            const updatedPublication = response.body.find((p: any) => p.id === publicationId);
            expect(updatedPublication).to.exist;
            expect(updatedPublication.title).to.eq('Servicio de Mantenimiento Actualizado');
            expect(updatedPublication.description).to.eq('Servicio actualizado con nuevas características.');
            expect(parseFloat(updatedPublication.price)).to.be.closeTo(399.99, 0.01);
            expect(updatedPublication.type).to.eq('servicio');
          });
        });
      });
    });
  });

  it('PUB-EDITAR-003: Validar errores de campos vacíos al editar publicación', () => {
    let testPublicationId: number;

    createPublication(
      'Producto de Prueba Edición',
      'Descripción del producto de prueba para validar campos vacíos.',
      '199.99',
      'producto'
    ).then((id) => {
      testPublicationId = id;

      cy.visit(`http://localhost:8080/my-publications/${testPublicationId}/edit`, {
        onBeforeLoad: setupGeolocationStub
      });

      cy.contains('Editar Publicación', { timeout: 10000 });
      cy.wait(2000);

      cy.get('#title').clear();
      cy.wait(200);
      cy.get('#title').type('Producto de Prueba Edición Modificado');
      cy.wait(500);
      
      cy.get('button[type="submit"]').contains('Guardar Cambios', { timeout: 3000 }).should('be.enabled');
      
      cy.get('#title').clear();
      cy.wait(300);
      cy.get('button[type="submit"]').contains('Guardar Cambios').should('be.disabled');

      cy.get('#title').type('Producto de Prueba Edición Modificado');
      cy.wait(300);
      cy.get('#description').clear();
      cy.wait(300);
      cy.get('button[type="submit"]').contains('Guardar Cambios').should('be.disabled');

      cy.get('#description').type('Descripción del producto de prueba para validar campos vacíos.');
      cy.wait(300);
      cy.get('#price').clear();
      cy.wait(300);
      cy.get('button[type="submit"]').contains('Guardar Cambios').should('be.disabled');

      cy.get('#price').type('199.99');
      cy.wait(300);

      cy.contains('Ubicación en el mapa *').should('be.visible');
      
      cy.contains('button', 'Usar mi ubicación').should('be.visible');

      cy.get('#title').clear();
      cy.wait(200);
      cy.get('#title').type('Producto de Prueba Edición Final');
      cy.wait(1000);
      
      cy.get('button[type="submit"]').contains('Guardar Cambios', { timeout: 5000 }).should('be.enabled');
    });
  });

  it('PUB-EDITAR-004: Validar error al subir más de 5 imágenes', () => {
    let testPublicationId: number;

    createPublication(
      'Producto para Imágenes',
      'Descripción del producto para probar límite de imágenes.',
      '299.99',
      'producto'
    ).then((id) => {
      testPublicationId = id;

      cy.visit(`http://localhost:8080/my-publications/${testPublicationId}/edit`, {
        onBeforeLoad: setupGeolocationStub
      });

      cy.contains('Editar Publicación', { timeout: 10000 });

      const fileContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      cy.wait(2000);

      for (let i = 1; i <= 4; i++) {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: `test-image-${i}.png`,
          mimeType: 'image/png',
        }, { force: true });
        cy.wait(800);
      }

      cy.wait(2000);

      cy.get('body').then(($body) => {
        if ($body.text().includes('Límite alcanzado')) {
          cy.contains('Límite alcanzado', { timeout: 3000 }).should('be.visible');
        }
      });

      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent, 'base64'),
        fileName: 'test-image-6.png',
        mimeType: 'image/png',
      }, { force: true });
      cy.wait(2000);

      cy.contains('Demasiadas imágenes', { timeout: 5000 }).should('be.visible');
      cy.get('body').should('satisfy', ($body) => {
        const bodyText = $body.text();
        return bodyText.includes('5 imágenes') || bodyText.includes('más de 5') || bodyText.includes('No se pueden tener más de 5');
      });
    });
  });

});

