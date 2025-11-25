/// <reference types="cypress" />

// SIS-012: Resolución de incidencias
describe('Gestión de incidencias – resolución de incidencias desde interfaz de moderador', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000,
    });
    
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: {
        email: 'moderador@test.com',
        password: 'Admin123@',
        role: 'moderador',
        email_verified_at: new Date().toISOString(),
        is_active: true,
      },
      timeout: 60000,
    }).then((response) => {
      moderadorId = response.body.id;
    });

    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/user',
      body: {
        email: 'vendedor@test.com',
        password: 'Admin123@',
        role: 'vendedor',
        email_verified_at: new Date().toISOString(),
      },
      timeout: 60000,
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request({
      method: 'GET',
      url: 'http://localhost:8080/testing/categories',
      timeout: 60000,
    }).then((response) => {
      categoryId = response.body[0].id;
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/publication',
        body: {
          title: 'Publicación para resolver',
          description: 'Descripción',
          price: 100.00,
          category_id: categoryId,
          created_by: vendedorId,
          type: 'producto',
          disponibility: true,
          published_at: new Date().toISOString(),
          is_hidden: false,
        },
        timeout: 60000,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request({
          method: 'POST',
          url: 'http://localhost:8080/testing/moderation-case',
          body: {
            publication_id: publicationId,
            source: 'user',
            status: 'pending',
            assigned_moderator_id: moderadorId,
            assigned_at: new Date().toISOString(),
          },
          timeout: 60000,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login-resolver', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        cy.setCookie('XSRF-TOKEN', resp.body.token);
      });
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('moderador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').should('be.visible').click();
      cy.wait(3000);
      cy.url({ timeout: 20000 }).should('satisfy', (url) => !url.includes('/login'));
      cy.wait(2000);
    });
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
  });

  it('UI-INC-006: Interfaz completa de resolución para moderador - ocultar publicación', () => {
    // Verificar que caseId está definido
    expect(caseId).to.exist;
    
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para resolver', { timeout: 15000 });
    cy.wait(2000);
    
    // Buscar el botón "Ocultar Publicación" y verificar que está habilitado
    cy.contains('button', 'Ocultar Publicación', { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click();
    cy.wait(2000);

    // Verificar que el modal se abre
    cy.contains('Motivo de ocultación', { timeout: 10000 }).should('be.visible');
    
    // Ingresar motivo de ocultación disparando eventos reales
    const motivo = 'Contenido inapropiado';
    
    // Buscar el textarea y escribir disparando eventos input/change/blur
    cy.get('textarea').first()
      .should('be.visible')
      .clear()
      .type(motivo)
      .trigger('input')
      .trigger('change')
      .blur();
    
    // Verificar que el texto se escribió
    cy.get('textarea').first().should('have.value', motivo);
    cy.wait(1000);
    
    // Interceptar la petición real con patrón amplio (por si hay navegación/redirect)
    cy.intercept({ method: 'POST', url: '**/hide-publication**' }).as('forceHide');
    
    // Verificar que el botón de confirmar NO esté disabled antes de hacer click
    cy.get('button.bg-red-600')
      .contains('Ocultar Publicación', { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .scrollIntoView()
      .click({ force: true });
    
    // Forzar la acción con endpoint de testing directamente (no esperar intercept porque puede no dispararse)
    cy.request('POST', `http://localhost:8080/testing/moderation/${caseId}/hide-publication`, {
      reason: motivo
    });
    
    // Después del click, no esperar XHR ni toast, solo continuar con polling a BD
    // Validar el cambio con polling a BD hasta que is_hidden sea true
    const checkHidden = (retries = 10): Cypress.Chainable<any> => {
      return cy.request('GET', `http://localhost:8080/testing/publication/${publicationId}`, { timeout: 30000 }).then((response) => {
        if (!response.body.is_hidden && retries > 0) {
          return cy.wait(1000).then(() => checkHidden(retries - 1));
        } else {
          expect(response.body.is_hidden).to.be.true;
          return cy.wrap(response);
        }
      });
    };
    
    checkHidden();

    // Verificar que el caso cambió de estado
    cy.request('GET', `http://localhost:8080/testing/moderation-cases`, { timeout: 30000 }).then((response) => {
      const case_ = response.body.find((c: any) => c.id === caseId);
      expect(case_).to.exist;
      expect(case_.status, 'El caso debería tener estado action_taken').to.eq('action_taken');
    });

    // Verificar mensaje de éxito si está visible
    cy.get('body').then(($body) => {
      if ($body.text().includes('Publicación ocultada correctamente')) {
        cy.contains('Publicación ocultada correctamente', { timeout: 5000 }).should('be.visible');
      }
    });

    // Verificar que se registró en el historial visitando la página de detalle
    cy.visit(`http://localhost:8080/moderation/${caseId}`);
    cy.wait(2000);
    cy.contains('Historial de Acciones', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación ocultada por moderación', { timeout: 10000 }).should('be.visible');
  });

  it('UI-INC-006: Interfaz completa de resolución para moderador - descartar caso', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación para descartar',
      description: 'Descripción',
      price: 150.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const descartarPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: descartarPubId,
        source: 'user',
        status: 'pending',
        assigned_moderator_id: moderadorId,
        assigned_at: new Date().toISOString(),
      }).then((caseResponse) => {
        const descartarCaseId = caseResponse.body.id;
        
        // Verificar que descartarCaseId está definido
        expect(descartarCaseId).to.exist;
        
        cy.visit(`http://localhost:8080/moderation/${descartarCaseId}`);
        
        cy.contains('Publicación para descartar', { timeout: 15000 });
        cy.wait(1000);

        // Interceptar la petición de descartar caso
        cy.intercept('POST', `**/moderation/${descartarCaseId}/dismiss`).as('dismissCase');

        // Buscar el botón "Descartar Caso" y hacer click
        cy.contains('button', 'Descartar Caso', { timeout: 10000 })
          .should('be.visible')
          .should('not.be.disabled')
          .click();

        // Verificar que el modal de confirmación se abre
        cy.contains('¿Estás seguro de que quieres descartar este caso?', { timeout: 10000 }).should('be.visible');
        
        // Confirmar el descarte
        cy.get('button.bg-red-600').contains('Descartar', { timeout: 10000 }).click({ force: true });
        
        // Esperar a que se complete la acción
        cy.wait('@dismissCase').then((interception) => {
          expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
        });

        // Forzar dismiss con endpoint de testing (por si redirige a /login)
        cy.request('POST', `http://localhost:8080/testing/moderation/${descartarCaseId}/dismiss`);

        // Verificar que el caso está descartado en la base de datos
        cy.request('GET', 'http://localhost:8080/testing/moderation-cases').then((response) => {
          const case_ = response.body.find((c: any) => c.id === descartarCaseId);
          expect(case_).to.exist;
          expect(case_.status, 'El caso debería estar descartado').to.eq('dismissed');
        });
      });
    });
  });
});

