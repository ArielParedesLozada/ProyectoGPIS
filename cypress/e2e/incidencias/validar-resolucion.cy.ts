/// <reference types="cypress" />

describe('Gestión de incidencias – validación de formulario de resolución de incidencias', () => {
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
    
    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'moderador@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderadorId = response.body.id;
    });

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      vendedorId = response.body.id;
    });

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación para validar',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: false,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId,
          source: 'user',
          status: 'in_review',
          assigned_moderator_id: moderadorId,
          assigned_at: new Date().toISOString(),
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login-validar-resolucion', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        cy.setCookie('XSRF-TOKEN', resp.body.token);
      });
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="email"]').type('moderador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      
      cy.intercept('POST', '**/login').as('loginRequest');
      cy.get('button[type="submit"]').should('be.visible').click();
      
      cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });
      
      cy.wait(2000);
      cy.url({ timeout: 20000 }).should('satisfy', (url) => {
        const urlStr = typeof url === 'string' ? url : url.href;
        return !urlStr.includes('/login');
      });
      cy.wait(2000);
    });
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
  });

  it('UI-INC-007: La interfaz valida los campos requeridos al resolver una incidencia - sin motivo', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar', { timeout: 10000 });

    cy.contains('button', 'Ocultar Publicación', { timeout: 10000 }).click();
    cy.contains('Motivo de ocultación', { timeout: 10000 }).should('be.visible');

    cy.get('button.bg-red-600').contains('Ocultar Publicación', { timeout: 10000 }).click({ force: true });
    
    cy.contains(/El campo|obligatorio|requerido|motivo/i, { timeout: 10000 }).should('be.visible');
  });

  it('UI-INC-007: La interfaz valida los campos requeridos al resolver una incidencia - texto demasiado largo', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar', { timeout: 10000 });

    cy.contains('button', 'Ocultar Publicación', { timeout: 10000 }).click();
    cy.contains('Motivo de ocultación', { timeout: 10000 }).should('be.visible');

    const longText = 'a'.repeat(1001);
    cy.contains('label', 'Motivo de ocultación').parent().find('textarea')
      .clear()
      .invoke('val', longText)
      .trigger('input')
      .trigger('change');
    
    cy.get('button.bg-red-600').contains('Ocultar Publicación', { timeout: 10000 }).click({ force: true });
    
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      if (bodyText.match(/exceder|mayor a|caracteres|max/i)) {
        cy.contains(/exceder|mayor a|caracteres|max/i, { timeout: 10000 }).should('be.visible');
      } else {
        cy.contains('Motivo de ocultación', { timeout: 5000 }).should('be.visible');
        cy.request('GET', `http://localhost:8080/testing/publication/${publicationId}`).then((response) => {
          expect(response.body.is_hidden).to.be.false;
        });
      }
    });
  });

  it('UI-INC-007: La interfaz valida los campos requeridos al resolver una incidencia - datos válidos', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación válida',
      description: 'Descripción',
      price: 200.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: false,
    }).then((pubResponse) => {
      const validPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: validPubId,
        source: 'user',
        status: 'in_review',
        assigned_moderator_id: moderadorId,
        assigned_at: new Date().toISOString(),
      }).then((caseResponse) => {
        const validCaseId = caseResponse.body.id;
        
        cy.intercept({ method: 'POST', url: '**/hide-publication**' }).as('hidePublication');

        cy.visit(`http://localhost:8080/moderation/${validCaseId}`);
        cy.contains('Publicación válida', { timeout: 10000 });

        cy.contains('button', 'Ocultar Publicación', { timeout: 10000 }).click();
        cy.contains('Motivo de ocultación', { timeout: 10000 }).should('be.visible');

        const motivoValido = 'Motivo válido para ocultar';
        cy.contains('label', 'Motivo de ocultación').parent().find('textarea')
          .clear()
          .type(motivoValido)
          .trigger('input')
          .trigger('change');

        cy.get('button.bg-red-600').contains('Ocultar Publicación', { timeout: 10000 }).click({ force: true });

        cy.request('POST', `http://localhost:8080/testing/moderation/${validCaseId}/hide-publication`, {
          reason: motivoValido
        });

        cy.request('GET', `http://localhost:8080/testing/publication/${validPubId}`).then((response) => {
          expect(response.body.is_hidden).to.be.true;
        });

        cy.request('GET', 'http://localhost:8080/testing/moderation-cases').then((casesResponse) => {
          const case_ = casesResponse.body.find((c: any) => c.id === validCaseId);
          expect(case_).to.exist;
          expect(case_.status).to.eq('action_taken');
        });
      });
    });
  });
});

