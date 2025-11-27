/// <reference types="cypress" />

describe('Vista y filtrado de apelaciones', () => {
  let moderadorId: number;
  let vendedorId: number;
  let categoryId: number;

  const ensureFiltersOpen = () => {
    cy.contains('Moderación', { timeout: 10000 });
    
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes('Mostrar Filtros') || bodyText.includes('mostrar filtros') || bodyText.includes('Mostrar filtros')) {
        cy.contains(/Mostrar Filtros|mostrar filtros|Mostrar filtros/i, { timeout: 5000 })
          .should('be.visible')
          .click({ force: true });
      }
    });
    
    cy.contains(/Filtros/i, { timeout: 10000 }).should('be.visible');
  };


  const selectEstado = (optionText: string) => {
    cy.intercept('GET', '**/moderation*status*').as('filterByStatus');
    cy.contains('label', 'Estado', { timeout: 10000 })
      .closest('div')
      .then(($container) => {
        const hasCombobox = $container.find('button[role="combobox"], [role="combobox"]').length > 0;
        const hasSelect = $container.find('select').length > 0;
        
        if (hasCombobox) {
          cy.wrap($container).within(() => {
            cy.get('button[role="combobox"], [role="combobox"]')
              .first()
              .scrollIntoView()
              .should('be.visible')
              .should('not.be.disabled')
              .click({ force: true });
          });
          
          cy.get('[role="listbox"], [role="menu"], [role="option"]', { timeout: 5000 })
            .should('be.visible');
          
          cy.contains('[role="option"], [role="menuitem"]', optionText, { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        } else if (hasSelect) {
          cy.wrap($container).within(() => {
            cy.get('select')
              .first()
              .scrollIntoView()
              .should('be.visible')
              .should('not.be.disabled')
              .select(optionText);
          });
        } else {
          throw new Error('No se encontró ni combobox ni select para el filtro de estado');
        }
      });
    
    cy.wait('@filterByStatus', { timeout: 10000 });
  };

  
  const setFechaDesde = (valueISO: string) => {
    
    cy.intercept('GET', '**/moderation*date_from*').as('filterByDateFrom');
    
    
    cy.contains('label', 'Fecha desde', { timeout: 10000 })
      .closest('div')
      .within(() => {
       
        cy.get('input[type="date"]')
          .first()
          .scrollIntoView()
          .should('be.visible')
          .should('not.be.disabled')
          .clear({ force: true })
          .type(valueISO, { force: true })
          .trigger('input')
          .trigger('change')
          .blur();
      });
    

    cy.wait('@filterByDateFrom', { timeout: 10000 });
  };

  const setFechaHasta = (valueISO: string) => {
    
    cy.log('⚠️ setFechaHasta no se puede usar: el campo "Fecha hasta" está siempre deshabilitado');
  };

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
        title: 'Publicación apelada pendiente',
        description: 'Descripción',
        price: 100.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId1 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId1,
          source: 'system',
          status: 'pending',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
          });
        });
      });

      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación apelación cerrada',
        description: 'Descripción',
        price: 200.00,
        category_id: categoryId,
        created_by: vendedorId,
        type: 'producto',
        disponibility: true,
        published_at: new Date().toISOString(),
        is_hidden: true,
      }).then((pubResponse) => {
        const pubId2 = pubResponse.body.id;
        
        cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
          publication_id: pubId2,
          source: 'system',
          status: 'closed',
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          cy.request('POST', 'http://localhost:8080/testing/moderation-appeal', {
            moderation_case_id: caseResponse.body.id,
            appealer_id: vendedorId,
            appeal_reason: 'Razón de apelación',
            reviewed_at: new Date().toISOString(),
            reviewing_moderator_id: moderadorId,
          });
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('moderador-login-listar-filtros', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        cy.setCookie('XSRF-TOKEN', resp.body.token);
      });
      
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('moderador@test.com');
      cy.get('input[name="password"]').type('Admin123@');
      
      cy.intercept('POST', 'http://localhost:8080/login').as('loginRequest');
      
      cy.get('button[type="submit"]').should('be.visible').click();
      
      
      cy.wait('@loginRequest').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 302]);
      });
      
     
      cy.url({ timeout: 20000 }).should('satisfy', (url) => !url.includes('/login'));
      cy.wait(2000);
    });

 
    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      cy.setCookie('XSRF-TOKEN', resp.body.token);
    });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - filtrar por estado', () => {
   
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
   
    cy.wait('@loadModeration', { timeout: 10000 });

   
    ensureFiltersOpen();

    
    selectEstado('Pendiente');


    cy.wait(1500);

    
    const waitForPendingPublication = (retries = 20): Cypress.Chainable => {
      return cy.get('body', { timeout: 1000 }).then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes('Publicación apelada pendiente')) {
          cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
          return cy.wrap(true);
        } else if (retries > 0) {
          cy.wait(500);
          return waitForPendingPublication(retries - 1);
        } else {
          throw new Error('La publicación pendiente no apareció después de aplicar el filtro');
        }
      });
    };
    
    waitForPendingPublication();
    
    
    cy.get('body', { timeout: 5000 }).then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes('Publicación apelación cerrada')) {
       
        cy.wait(1000);
        cy.contains('Publicación apelación cerrada', { timeout: 2000 }).should('not.exist');
      }
    });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - filtrar por fecha', () => {
    
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
   
    cy.wait('@loadModeration', { timeout: 10000 });

    
    ensureFiltersOpen();
    const pastDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]; 
    setFechaDesde(pastDate);

    
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');
    
    
    cy.contains('label', 'Fecha hasta', { timeout: 10000 })
      .closest('div')
      .within(() => {
        cy.get('input[type="date"]')
          .first()
          .should('be.visible')
          .should('be.disabled')
          .should('have.class', 'cursor-not-allowed');
      });
  });

  it('UI-APE-007: Listar y filtrar apelaciones según su estado u otros criterios definidos - limpiar filtros', () => {
  
    cy.intercept('GET', '**/moderation**').as('loadModeration');
    
    cy.visit('http://localhost:8080/moderation');
    
   
    cy.wait('@loadModeration', { timeout: 10000 });

   
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');

    
    ensureFiltersOpen();


    cy.intercept('GET', '**/moderation**').as('applyFilter');

    
    selectEstado('Pendiente');

    cy.wait('@applyFilter', { timeout: 10000 });
    
   
    cy.wait(1000);

    
    cy.url().should('include', 'status=pending');

   
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    
    
    cy.contains('Publicación apelación cerrada', { timeout: 5000 }).should('not.exist');

    
    cy.intercept('GET', '**/moderation**').as('clearFilters');

   
    cy.contains('button', /Limpiar filtros|Limpiar/i, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled')
      .click();
    
   
    cy.wait('@clearFilters', { timeout: 10000 });
    
    
    cy.wait(1000);

   
    cy.contains('Publicación apelada pendiente', { timeout: 10000 }).should('be.visible');
    cy.contains('Publicación apelación cerrada', { timeout: 10000 }).should('be.visible');
  });
});
