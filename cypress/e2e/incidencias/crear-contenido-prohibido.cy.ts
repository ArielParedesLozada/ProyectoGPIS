/// <reference types="cypress" />

// SIS-007: Creación automática de incidencias
describe('Gestión de incidencias – creación automática por contenido prohibido', () => {
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
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    });
  });

  beforeEach(() => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      
      // Esperar a que el formulario esté cargado
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').should('be.visible').click();
      
      // Esperar a que el login procese - aumentar tiempo
      cy.wait(3000);
      
      // Verificar que salimos de login con timeout más largo
      cy.url({ timeout: 20000 }).should('satisfy', (url) => {
        return !url.includes('/login');
      });
      cy.wait(2000);
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('debe ocultar la publicación en el listado público cuando contiene contenido prohibido y mostrarla como oculta en Mis publicaciones con mensaje de moderación automática', () => {
    cy.visit('http://localhost:8080/my-publications/create', {
      onBeforeLoad: setupGeolocationStub
    });

    cy.contains('Crear Nueva Publicación', { timeout: 10000 });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      const category = response.body[0];
      
      // Usar palabra prohibida "puta" que está en la lista de palabras prohibidas
      cy.get('#title').type('Producto puta calidad');
      cy.get('#description').type('Contenido con palabra prohibida para test');
      cy.get('#price').type('999.99');
      
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

      // Esperar a que se procese la creación
      cy.wait(4000);
      
      // Verificar si redirigió, si no, navegar manualmente
      cy.url().then((currentUrl) => {
        if (!currentUrl.includes('/my-publications')) {
          cy.visit('http://localhost:8080/my-publications');
          cy.wait(2000);
        }
      });
      
      // Primero verificar en la base de datos que la publicación está oculta
      getUserId().then((userId) => {
        cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
          const userPublications = response.body.filter((p: any) => p.created_by === userId);
          
          // Buscar la publicación más reciente del usuario
          const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
          const publication = sorted.find((p: any) => 
            p.title && (p.title.includes('Producto puta calidad') || p.title === 'Producto puta calidad')
          ) || sorted[0];
          
          expect(publication, 'La publicación debería existir en la base de datos').to.exist;
          expect(publication.is_hidden, 'La publicación debería estar oculta automáticamente').to.be.true;
        });
      });
      
      // Verificar en "Mis publicaciones" que la publicación aparece con estado "Oculta"
      cy.contains('Producto puta calidad', { timeout: 15000 }).should('be.visible');
      
      // Verificar que muestra el badge "Oculto por Moderación"
      cy.contains('Oculto por Moderación', { timeout: 10000 }).should('be.visible');
      
      // Verificar que muestra el badge "Oculto por Moderación"
      cy.contains('Oculto por Moderación', { timeout: 10000 }).should('be.visible');
      
      // Verificar mensaje de moderación automática - motivo de ocultación
      cy.contains('Motivo de ocultación', { timeout: 10000 }).should('be.visible');

      // Verificar que NO aparece en el listado público
      cy.visit('http://localhost:8080/publication');
      cy.location('pathname', { timeout: 10000 }).should('include', '/publication');
      cy.contains('Producto puta calidad').should('not.exist');
    });
  });
});

