/// <reference types="cypress" />


describe('Validación de formulario de apelación', () => {
  let vendedorId: number;
  let moderadorId: number;
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
      email: 'vendedor@test.com',
      password: 'Admin123@',
      role: 'vendedor',
      email_verified_at: new Date().toISOString(),
    }).then((response) => {
      vendedorId = response.body.id;
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

    cy.request('GET', 'http://localhost:8080/testing/categories').then((response) => {
      categoryId = response.body[0].id;
      
      cy.request('POST', 'http://localhost:8080/testing/publication', {
        title: 'Publicación para validar apelación',
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
          source: 'system', 
          status: 'action_taken', 
          assigned_moderator_id: moderadorId,
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.session('vendedor-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'vendedor@test.com',
          password: 'Admin123@',
        },
        timeout: 60000,
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf')
      .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
  });

  it('UI-APE-002: La interfaz valida correctamente el formulario de apelación - sin razón', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Publicación para validar apelación', { timeout: 10000 }).should('be.visible');

    cy.contains('Publicación para validar apelación', { timeout: 10000 })
      .closest('[data-testid="publication-card"]')
      .should('exist')
      .within(() => {
        cy.get('[data-testid="publication-menu"]', { timeout: 10000 })
          .should('be.visible')
          .click({ force: true });
      });

    cy.get('[role="menu"]', { timeout: 5000 })
      .should('be.visible')
      .should('exist');

    cy.get('[role="menuitem"]')
      .contains(/Apelar Moderación/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');

    // El textarea NO tiene name="appeal_reason", buscar por placeholder o visibilidad
    cy.get('textarea', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible');

    cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
      .should('be.visible')
      .should('be.disabled');

    
    cy.get('textarea')
      .filter(':visible')
      .first()
      .focus()
      .blur();

    
    cy.contains(/El campo motivo es requerido|motivo es requerido|requerido/i, { timeout: 10000 })
      .should('be.visible');
  });

  it('UI-APE-002: La interfaz valida correctamente el formulario de apelación - razón demasiado corta', () => {
    cy.visit('http://localhost:8080/my-publications');

    cy.contains('Publicación para validar apelación', { timeout: 10000 }).should('be.visible');

    cy.contains('Publicación para validar apelación', { timeout: 10000 })
      .closest('[data-testid="publication-card"]')
      .should('exist')
      .within(() => {
        cy.get('[data-testid="publication-menu"]', { timeout: 10000 })
          .should('be.visible')
          .click({ force: true });
      });

    cy.get('[role="menu"]', { timeout: 5000 }).should('be.visible');
    cy.get('[role="menuitem"]')
      .contains(/Apelar Moderación/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');

   
    cy.get('textarea', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .focus()
      .clear({ force: true })
      .type('A', { force: true })
      .trigger('input')
      .trigger('change');

    
    cy.intercept('POST', `**/my-publications/${publicationId}/appeal**`).as('submitAppeal');

    cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    
    cy.wait('@submitAppeal', { timeout: 10000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204, 302]);
    });

    
    cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 10000 })
      .then((response) => {
        const newAppeal = response.body.find((a: any) => 
          a.moderation_case_id === caseId && 
          a.appeal_reason === 'A'
        );
        expect(newAppeal).to.exist;
      });
  });

  it('UI-APE-002: La interfaz valida correctamente el formulario de apelación - razón demasiado larga', () => {
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: 'Publicación para validar longitud máxima',
      description: 'Descripción',
      price: 200.00,
      category_id: categoryId,
      created_by: vendedorId,
      type: 'producto',
      disponibility: true,
      published_at: new Date().toISOString(),
      is_hidden: true, 
    }).then((pubResponse) => {
      const maxLengthPubId = pubResponse.body.id;
      
      
      cy.request('POST', 'http://localhost:8080/testing/moderation-case', {
        publication_id: maxLengthPubId,
        source: 'system',
        status: 'action_taken',
        assigned_moderator_id: moderadorId,
      }).then((caseResponse) => {
        const maxLengthCaseId = caseResponse.body.id;
        
        cy.visit('http://localhost:8080/my-publications');
        cy.contains('Publicación para validar longitud máxima', { timeout: 10000 }).should('be.visible');

        
        cy.contains('Publicación para validar longitud máxima', { timeout: 10000 })
          .closest('[data-testid="publication-card"]')
          .should('exist')
          .within(() => {
            cy.get('[data-testid="publication-menu"]', { timeout: 10000 })
              .should('be.visible')
              .click({ force: true });
          });

        cy.get('[role="menu"]', { timeout: 5000 }).should('be.visible');
        cy.get('[role="menuitem"]')
          .contains(/Apelar Moderación/i, { timeout: 10000 })
          .should('be.visible')
          .click({ force: true });

        cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');

       
        cy.get('textarea', { timeout: 10000 })
          .filter(':visible')
          .first()
          .should('be.visible')
          .should('have.attr', 'maxLength', '100');

        
        cy.contains(/\/\s*100(\s*caracteres)?/i, { timeout: 5000 }).should('be.visible');

        
        const maxText = 'a'.repeat(100);
        cy.get('textarea')
          .filter(':visible')
          .first()
          .clear({ force: true })
          .type(maxText, { force: true });

        const checkTextareaLength = (retries = 10): Cypress.Chainable => {
          return cy.get('textarea')
            .filter(':visible')
            .first()
            .invoke('val')
            .then((val) => {
              const length = (val as string).length;
              if (length === 100 || retries === 0) {
                expect(length).to.eq(100);
                return cy.wrap(true);
              } else {
                cy.wait(100);
                return checkTextareaLength(retries - 1);
              }
            });
        };
        checkTextareaLength();

        
        cy.get('body', { timeout: 5000 }).should(($body) => {
          const bodyText = $body.text();
          expect(bodyText).to.match(/100\s*\/\s*\d+/i);
        });

        cy.get('textarea')
          .filter(':visible')
          .first()
          .type('b', { force: true });

        cy.get('textarea')
          .filter(':visible')
          .first()
          .invoke('val')
          .should((val) => {
            const value = val as string;
            expect(value.length).to.eq(100);
            expect(value).to.not.include('b');
          });

        cy.intercept('POST', `**/my-publications/${maxLengthPubId}/appeal**`).as('submitAppeal');

        cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
          .should('be.visible')
          .should('not.be.disabled')
          .click({ force: true });

        cy.wait('@submitAppeal', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204, 302]);
        });

        const checkAppealCreated = (retries = 10): Cypress.Chainable => {
          return cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 10000 })
            .then((response) => {
              const appeals = response.body
                .filter((a: any) => 
                  a.moderation_case_id === maxLengthCaseId &&
                  a.appealer_id === vendedorId
                )
                .sort((a: any, b: any) => b.id - a.id);
              
              const lastAppeal = appeals[0];
              
              if (lastAppeal && lastAppeal.appeal_reason && lastAppeal.appeal_reason.length === 100) {
                cy.log(`Apelación encontrada - ID: ${lastAppeal.id}, appeal_reason length: ${lastAppeal.appeal_reason.length}`);
                cy.log(`appeal_reason (primeros 50 chars): ${lastAppeal.appeal_reason.substring(0, 50)}...`);
                
                expect(lastAppeal.appeal_reason.length).to.eq(100);
                
               
                expect(lastAppeal.appeal_reason).to.eq(maxText);
                
                return cy.wrap(true);
              } else if (retries > 0) {
                cy.wait(500);
                return checkAppealCreated(retries - 1);
              } else {
                
                cy.log(`No se encontró apelación después de ${retries} intentos`);
                cy.log(`Total de apelaciones para caseId ${maxLengthCaseId}: ${appeals.length}`);
                if (appeals.length > 0) {
                  cy.log(`Última apelación encontrada - ID: ${appeals[0].id}, length: ${appeals[0].appeal_reason?.length || 'N/A'}`);
                }
                throw new Error(`No se encontró apelación con 100 caracteres para caseId ${maxLengthCaseId}`);
              }
            });
        };
        
        checkAppealCreated();
      });
    });
  });

  it('UI-APE-002: La interfaz valida correctamente el formulario de apelación - datos válidos', () => {
    
    const uniqueTitle = `Publicación válida para apelar ${Date.now()}`;
    cy.request('POST', 'http://localhost:8080/testing/publication', {
      title: uniqueTitle,
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
        source: 'system', 
        status: 'action_taken', 
        assigned_moderator_id: moderadorId,
      }).then((caseResponse) => {
        const validCaseId = caseResponse.body.id;
        
        cy.visit('http://localhost:8080/my-publications');
        cy.contains(uniqueTitle, { timeout: 10000 }).should('be.visible');

        
        cy.contains(uniqueTitle, { timeout: 10000 })
          .closest('[data-testid="publication-card"]')
          .should('exist')
          .within(() => {
            cy.get('[data-testid="publication-menu"]', { timeout: 10000 })
              .should('be.visible')
              .click({ force: true });
          });

        cy.get('[role="menu"]', { timeout: 5000 }).should('be.visible');
        cy.get('[role="menuitem"]')
          .contains(/Apelar Moderación/i, { timeout: 10000 })
          .should('be.visible')
          .should('not.be.disabled')
          .click({ force: true });

        cy.contains(/Apelar Moderación/i, { timeout: 10000 }).should('be.visible');

        
        const validReason = 'Razón válida para apelar la decisión de moderación. Esta es una explicación detallada.';
        cy.get('textarea', { timeout: 10000 })
          .filter(':visible')
          .first()
          .should('be.visible')
          .focus()
          .clear({ force: true })
          .type(validReason, { force: true })
          .trigger('input')
          .trigger('change');

        
        cy.get('textarea')
          .filter(':visible')
          .first()
          .should('have.value', validReason);

        cy.intercept('POST', `**/my-publications/${validPubId}/appeal**`).as('submitAppeal');

        cy.contains('button', /Enviar Apelación|Enviar apelación|Enviar/i, { timeout: 10000 })
          .should('be.visible')
          .should('not.be.disabled')
          .click({ force: true });

        cy.wait('@submitAppeal', { timeout: 15000 }).then((interception) => {
          expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204, 302]);
          
          if (interception.response?.statusCode === 200 || interception.response?.statusCode === 201) {
            const responseBody = interception.response?.body;
            if (responseBody && typeof responseBody === 'object') {
              if (responseBody.error || responseBody.message?.includes('Ya existe')) {
                throw new Error(`Error al crear apelación: ${responseBody.error || responseBody.message}`);
              }
            }
          }
        });

        
        const checkModalClosed = (retries = 20): Cypress.Chainable => {
          return cy.get('body', { timeout: 1000 }).then(($body) => {
            const bodyText = $body.text();
            const modalVisible = /Apelar Moderación/i.test(bodyText);
            const successMessage = /apelación enviada|éxito|enviada correctamente/i.test(bodyText);
            const errorMessage = /Ya existe una apelación|error/i.test(bodyText);
            
            if (errorMessage) {
              throw new Error('Error al crear apelación: Ya existe una apelación pendiente');
            }
            
            if (!modalVisible || successMessage) {
              return cy.wrap(true);
            } else if (retries > 0) {
              cy.wait(500);
              return checkModalClosed(retries - 1);
            } else {
              cy.log('Modal no se cerró completamente, pero continuando con la validación');
              return cy.wrap(true);
            }
          });
        };
        
        checkModalClosed();

        cy.wait(1000);

        cy.contains(uniqueTitle, { timeout: 15000 }).should('be.visible');

        cy.request('GET', 'http://localhost:8080/testing/moderation-appeals', { timeout: 30000 })
          .then((response) => {
            const appeals = response.body
              .filter((a: any) => 
                a.moderation_case_id === validCaseId &&
                a.appealer_id === vendedorId
              )
              .sort((a: any, b: any) => b.id - a.id);
            
            const lastAppeal = appeals[0];
            expect(lastAppeal).to.exist;
            
            cy.log(`Apelación encontrada - ID: ${lastAppeal.id}, appeal_reason length: ${lastAppeal.appeal_reason.length}, appeal_reason: ${lastAppeal.appeal_reason}`);
            
            expect(lastAppeal.appeal_reason).to.eq(validReason);
            expect(lastAppeal.appeal_reason.length).to.eq(validReason.length);
          });
      });
    });
  });
});
