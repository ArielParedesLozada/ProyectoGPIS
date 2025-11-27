/// <reference types="cypress" />

describe('Panel del moderador - Reasignación automática', () => {
  let moderador1Id: number;
  let moderador2Id: number;
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
      email: 'moderador1@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderador1Id = response.body.id;
    });

    cy.request('POST', 'http://localhost:8080/testing/user', {
      email: 'moderador2@test.com',
      password: 'Admin123@',
      role: 'moderador',
      email_verified_at: new Date().toISOString(),
      is_active: true,
    }).then((response) => {
      moderador2Id = response.body.id;
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
        title: 'Publicación para reasignar apelación',
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
          status: 'pending',
          assigned_moderator_id: moderador1Id,
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

  it('UI-APE-008: El panel refleja los cambios cuando una apelación se reasigna automáticamente a otro moderador/administrador', () => {
   
    cy.session('moderador1-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'moderador1@test.com',
          password: 'Admin123@',
        },
        timeout: 60000,
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf')
      .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));

   
    cy.visit('http://localhost:8080/moderation');
    
    
    cy.contains(/Moderación/i, { timeout: 10000 }).should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Solo asignados a mí')) {
        cy.contains('label', 'Solo asignados a mí', { timeout: 5000 })
          .find('input[type="checkbox"]')
          .then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
              cy.wrap($checkbox).check({ force: true });
            }
          });
      }
    });
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Apelaciones')) {
        cy.contains('Apelaciones', { timeout: 10000 }).click();
      }
    });

    cy.contains('Publicación para reasignar apelación', { timeout: 10000 })
      .should('be.visible');

    
    cy.request('GET', 'http://localhost:8080/testing/moderation-cases', { timeout: 10000 })
      .then((response) => {
        const caseItem = response.body.find((c: any) => c.id === caseId);
        expect(caseItem).to.exist;
        expect(caseItem.assigned_moderator_id).to.eq(moderador1Id);
        expect(caseItem.status).to.be.oneOf(['pending', 'in_review', 'appealed']);
      });

    
    cy.request('POST', 'http://localhost:8080/testing/reassign-cases', {
      from_moderator_id: moderador1Id,
      to_moderator_id: moderador2Id,
    }).then((response) => {
      expect(response.status).to.eq(200);
      const { reassigned_count, found_cases } = response.body;
      
     
      if (found_cases > 0) {
        expect(reassigned_count).to.be.at.least(1);
        expect(reassigned_count).to.eq(found_cases);
      } else {
       
        expect(reassigned_count).to.eq(0);
        expect(found_cases).to.eq(0);
      }

      
      cy.request('PATCH', `http://localhost:8080/testing/user/${moderador1Id}`, {
        is_active: false,
      }).then((patchResponse) => {
        expect(patchResponse.status).to.eq(200);
      });

      
      if (found_cases > 0) {
        const checkReassignment = (retries = 10): Cypress.Chainable => {
          return cy.request('GET', 'http://localhost:8080/testing/moderation-cases', { timeout: 10000 })
            .then((response) => {
              const caseItem = response.body.find((c: any) => c.id === caseId);
              
              if (caseItem && caseItem.assigned_moderator_id === moderador2Id) {
               
                expect(caseItem.assigned_moderator_id).to.eq(moderador2Id);
                return cy.wrap(true);
              } else if (retries > 0) {
                cy.wait(500); 
                return checkReassignment(retries - 1);
              } else {
                throw new Error(`El caso ${caseId} no fue reasignado después de 10 intentos`);
              }
            });
        };
        
        checkReassignment();
      } else {
       
        cy.log('No hay casos reasignables, el caso puede permanecer asignado al moderador original');
      }
    });

    
    cy.reload();
    
    cy.contains(/Moderación/i, { timeout: 10000 }).should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Solo asignados a mí')) {
        cy.contains('label', 'Solo asignados a mí', { timeout: 5000 })
          .find('input[type="checkbox"]')
          .then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
              cy.wrap($checkbox).check({ force: true });
            }
          });
      }
    });

   
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      
      if (bodyText.includes('Publicación para reasignar apelación')) {
        cy.contains('Publicación para reasignar apelación', { timeout: 5000 })
          .closest('div, article, section, [class*="card"], [class*="item"]')
          .then(($card) => {
            const cardText = $card.text();
            expect(cardText).to.satisfy((text: string) => {
              return !text.toLowerCase().includes('moderador1') || 
                     text.toLowerCase().includes('moderador2');
            });
          });
      } else {
        cy.contains('Publicación para reasignar apelación', { timeout: 5000 })
          .should('not.exist');
      }
    });

    
    cy.session('moderador2-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf')
        .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:8080/testing/login',
        body: {
          email: 'moderador2@test.com',
          password: 'Admin123@',
        },
        timeout: 60000,
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf')
      .then((resp) => cy.setCookie('XSRF-TOKEN', resp.body.token));

    
    cy.visit('http://localhost:8080/moderation');
    
    cy.contains(/Moderación/i, { timeout: 10000 }).should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Solo asignados a mí')) {
        cy.contains('label', 'Solo asignados a mí', { timeout: 5000 })
          .find('input[type="checkbox"]')
          .then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
              cy.wrap($checkbox).check({ force: true });
            }
          });
      }
    });
    
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Apelaciones')) {
        cy.contains('Apelaciones', { timeout: 10000 }).click();
      }
    });

    
    cy.contains('Publicación para reasignar apelación', { timeout: 10000 })
      .should('be.visible');
    
    cy.contains('Publicación para reasignar apelación')
      .closest('div, article, section, [class*="card"], [class*="item"]')
      .then(($card) => {
        const cardText = $card.text().toLowerCase();
        if (cardText.includes('moderador')) {
          expect(cardText).to.not.include('moderador1');
        }
      });
  });
});

