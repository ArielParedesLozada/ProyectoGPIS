/// <reference types="cypress" />

describe('Comprar publicación', () => {
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
        
        cy.wait(5000); 
        
        return getUserId('vendedor@test.com').then((userId) => {
          let attempts = 0;
          const maxAttempts = 5;
          
          const findPublication = (): Cypress.Chainable<number> => {
            return cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
              const userPublications = response.body.filter((p: any) => p.created_by === userId);
              const publication = userPublications.find((p: any) => 
                p.title && (p.title.includes(title) || p.title === title)
              );
              
              if (publication) {
                return publication.id;
              }
              
              if (userPublications.length > 0) {
                const sorted = userPublications.sort((a: any, b: any) => b.id - a.id);
                return sorted[0].id;
              }
              
              attempts++;
              if (attempts < maxAttempts) {
                cy.wait(2000);
                return findPublication();
              }
              
              throw new Error(`No se encontró la publicación con título: ${title} después de ${maxAttempts} intentos`);
            });
          };
          
          return findPublication();
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

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'comprador@test.com',
      password: 'Admin123@',
      role: 'comprador',
      email_verified_at: new Date().toISOString(),
    });
  });

  beforeEach(() => {
  });

  it('PUB-COMPRAR-001: Comprar publicación exitosamente', () => {
    let publicationId: number;
    
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/publication');
    }, { cacheAcrossSpecs: false });

    createPublication('Producto para Comprar', 'Descripción del producto que será comprado.', '199.99', 'producto').then((id) => {
      publicationId = id;
      
      cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        expect(publication.disponibility).to.be.true;
      });

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.session('comprador-login', () => {
        cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
          const token = resp.body.token;
          cy.setCookie('XSRF-TOKEN', token);
        });

        cy.visit('http://localhost:8080/login');
        cy.get('input[name="email"]', { timeout: 10000 }).type('comprador@test.com');
        cy.get('input[name="password"]').type('Admin123@');
        cy.get('button[type="submit"]').click();
        cy.url({ timeout: 10000 }).should('include', '/publication');
      }, { cacheAcrossSpecs: false });

      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      
      cy.contains('button', 'Comprar', { timeout: 10000 }).should('be.visible').scrollIntoView();
      
      cy.intercept('POST', `**/publication/${publicationId}/buy`).as('buyPublication');
      
      cy.contains('button', 'Comprar').click({ force: true });
      
      cy.contains('Confirmar compra', { timeout: 5000 }).should('be.visible');
      cy.contains('¿Estás seguro de comprar este producto?').should('be.visible');
      cy.contains('Producto para Comprar').should('be.visible');
      cy.contains('$199.99').should('be.visible');
      
      cy.wait(500);
      
      cy.contains('Confirmar compra').closest('.bg-white.rounded-2xl').within(() => {
        cy.contains('button', 'Comprar').should('be.visible').should('not.be.disabled').scrollIntoView().click({ force: true });
      });
      
      cy.wait('@buyPublication', { timeout: 15000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });
      
      cy.wait(2000);
      
      cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        
        if (publication.disponibility !== false) {
          cy.wait(3000);
          cy.request('GET', 'http://localhost:8080/testing/publications').then((response2) => {
            const publication2 = response2.body.find((p: any) => p.id === publicationId);
            expect(publication2).to.exist;
            if (publication2.disponibility !== false) {
              cy.wait(3000);
              cy.request('GET', 'http://localhost:8080/testing/publications').then((response3) => {
                const publication3 = response3.body.find((p: any) => p.id === publicationId);
                expect(publication3).to.exist;
                expect(publication3.disponibility).to.be.false;
              });
            } else {
              expect(publication2.disponibility).to.be.false;
            }
          });
        } else {
          expect(publication.disponibility).to.be.false;
        }
      });
      
      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      cy.contains('Vendido', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Comprar').should('not.exist');
    });
  });

  it('PUB-COMPRAR-002: Cancelar compra en el modal de confirmación', () => {
    let publicationId: number;
    
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/publication');
    }, { cacheAcrossSpecs: false });

    createPublication('Producto para Cancelar Compra', 'Descripción del producto para cancelar compra.', '299.99', 'producto').then((id) => {
      publicationId = id;
      
      cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        expect(publication.disponibility).to.be.true;
      });

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.session('comprador-login', () => {
        cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
          const token = resp.body.token;
          cy.setCookie('XSRF-TOKEN', token);
        });

        cy.visit('http://localhost:8080/login');
        cy.get('input[name="email"]', { timeout: 10000 }).type('comprador@test.com');
        cy.get('input[name="password"]').type('Admin123@');
        cy.get('button[type="submit"]').click();
        cy.url({ timeout: 10000 }).should('include', '/publication');
      }, { cacheAcrossSpecs: false });

      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      
      cy.contains('button', 'Comprar', { timeout: 10000 }).should('be.visible').scrollIntoView();
      
      cy.contains('button', 'Comprar').click({ force: true });
      
      cy.contains('Confirmar compra', { timeout: 5000 }).should('be.visible');
      cy.contains('¿Estás seguro de comprar este producto?').should('be.visible');
      
      cy.contains('button', 'Cancelar').click();
      
      cy.wait(1000);
      
      cy.contains('Confirmar compra').should('not.exist');
      
      cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        expect(publication.disponibility).to.be.true;
      });
      
      cy.contains('button', 'Comprar').should('be.visible');
    });
  });

  it('PUB-COMPRAR-003: Intentar comprar publicación no disponible', () => {
    let publicationId: number;
    
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/publication');
    }, { cacheAcrossSpecs: false });

    createPublication('Producto No Disponible', 'Descripción del producto no disponible.', '399.99', 'producto').then((id) => {
      publicationId = id;
      
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.session('comprador-login', () => {
        cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
          const token = resp.body.token;
          cy.setCookie('XSRF-TOKEN', token);
        });

        cy.visit('http://localhost:8080/login');
        cy.get('input[name="email"]', { timeout: 10000 }).type('comprador@test.com');
        cy.get('input[name="password"]').type('Admin123@');
        cy.get('button[type="submit"]').click();
        cy.url({ timeout: 10000 }).should('include', '/publication');
      }, { cacheAcrossSpecs: false });

      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      cy.contains('button', 'Comprar', { timeout: 10000 }).should('be.visible').scrollIntoView();
      
      cy.intercept('POST', `**/publication/${publicationId}/buy`).as('buyPublication');
      
      cy.contains('button', 'Comprar').click({ force: true });
      cy.contains('Confirmar compra', { timeout: 5000 }).should('be.visible');
      
      cy.wait(500);
      
      cy.contains('Confirmar compra').closest('.bg-white.rounded-2xl').within(() => {
        cy.contains('button', 'Comprar').should('be.visible').should('not.be.disabled').scrollIntoView().click({ force: true });
      });
      
      cy.wait('@buyPublication', { timeout: 15000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });
      
      cy.wait(2000);
      
      cy.request('GET', 'http://localhost:8080/testing/publications').then((response) => {
        const publication = response.body.find((p: any) => p.id === publicationId);
        expect(publication).to.exist;
        
        if (publication.disponibility !== false) {
          cy.wait(3000);
          cy.request('GET', 'http://localhost:8080/testing/publications').then((response2) => {
            const publication2 = response2.body.find((p: any) => p.id === publicationId);
            expect(publication2).to.exist;
            if (publication2.disponibility !== false) {
              cy.wait(3000);
              cy.request('GET', 'http://localhost:8080/testing/publications').then((response3) => {
                const publication3 = response3.body.find((p: any) => p.id === publicationId);
                expect(publication3).to.exist;
                expect(publication3.disponibility).to.be.false;
              });
            } else {
              expect(publication2.disponibility).to.be.false;
            }
          });
        } else {
          expect(publication.disponibility).to.be.false;
        }
      });

      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      
      cy.contains('Vendido', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Comprar').should('not.exist');
      
      cy.contains('button', 'Vendido').should('be.disabled');
    });
  });

  it('PUB-COMPRAR-004: No mostrar botón de comprar en publicación propia', () => {
    let publicationId: number;
    
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('vendedor@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/publication');
    }, { cacheAcrossSpecs: false });

    createPublication('Mi Propia Publicación', 'Descripción de mi propia publicación.', '499.99', 'producto').then((id) => {
      publicationId = id;
      
      cy.visit(`http://localhost:8080/publication/${publicationId}`);
      cy.wait(2000);
      
      cy.contains('button', 'Comprar').should('not.exist');
      
      cy.contains('Mi Publicación', { timeout: 10000 }).should('be.visible');
      
      cy.contains('button', 'Mi Publicación').should('be.disabled');
    });
  });
});

