/// <reference types="cypress" />

describe('Validación de formulario de resolución de apelación', () => {
  let moderadorId: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;
  let appealId: number;

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
        title: 'Publicación para validar resolución',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        publicationId = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: publicationId,
          source: 'auto',
          status: 'appealed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
          
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseId,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
          }).then((appealResponse) => {
            appealId = appealResponse.body.id;
          });
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]').type('moderador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      cy.get('button[type="submit"]').click();
      cy.wait(3000);
      cy.url().should('not.include', '/login');
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });
  });

  it('Validar campo requerido - Sin notas', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 });

    cy.contains('button', 'Aceptar apelación', { timeout: 10000 }).click();
    cy.wait(1000);

    cy.get('button[type="submit"]').contains('Confirmar').click();
    cy.wait(1000);

    cy.contains('El campo notas es requerido', { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud mínima', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 });

    cy.contains('button', 'Aceptar apelación', { timeout: 10000 }).click();
    cy.wait(1000);

    cy.get('textarea[name="review_notes"]', { timeout: 10000 }).type('A');
    cy.get('button[type="submit"]').contains('Confirmar').click();
    cy.wait(1000);

    cy.contains('Las notas deben tener al menos', { timeout: 10000 }).should('be.visible');
  });

  it('Validar longitud máxima', () => {
    cy.visit(`http://localhost:8080/moderation/${caseId}`);

    cy.contains('Publicación para validar resolución', { timeout: 10000 });

    cy.contains('button', 'Aceptar apelación', { timeout: 10000 }).click();
    cy.wait(1000);

    const longText = 'a'.repeat(2001);
    cy.get('textarea[name="review_notes"]', { timeout: 10000 }).type(longText);
    cy.get('button[type="submit"]').contains('Confirmar').click();
    cy.wait(1000);

    cy.contains('Las notas no pueden exceder', { timeout: 10000 }).should('be.visible');
  });

  it('Resolver con datos válidos', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación válida para resolver',
      description: 'Descripción',
      price: 150.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: true,
    }).then((pubResponse) => {
      const validPubId = pubResponse.body.id;
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: validPubId,
        source: 'auto',
        status: 'appealed',
        assigned_moderator_id: moderadorId,
      }).then((caseResponse) => {
        const validCaseId = caseResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
          moderation_case_id: validCaseId,
          appealer_id: vendedorId,
          appeal_reason: 'Razón de apelación',
        }).then(() => {
          cy.visit(`http://localhost:8080/moderation/${validCaseId}`);
          cy.contains('Publicación válida para resolver', { timeout: 10000 });

          cy.contains('button', 'Aceptar apelación', { timeout: 10000 }).click();
          cy.wait(1000);

          cy.get('textarea[name="review_notes"]', { timeout: 10000 }).type('Notas válidas para la resolución');
          cy.get('button[type="submit"]').contains('Confirmar').click();

          cy.wait(3000);

          cy.contains('Apelación aceptada', { timeout: 10000 }).should('be.visible');
        });
      });
    });
  });
});

