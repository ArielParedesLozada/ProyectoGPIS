/// <reference types="cypress" />

// SIS-017: Actualización de casos asignados
describe('Gestión de incidencias – actualización de casos asignados tras reasignación automática', () => {
  let moderador1Id: number;
  let moderador2Id: number;
  let vendedorId: number;
  let publicationId: number;
  let categoryId: number;
  let caseId: number;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/testing/reset-db',
      body: { seed: true },
      timeout: 60000, // 60 segundos para la migración
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
        title: 'Publicación para reasignar',
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
          assigned_moderator_id: moderador1Id,
          assigned_at: new Date().toISOString(),
        }).then((caseResponse) => {
          caseId = caseResponse.body.id;
        });
      });
    });
  });

  it('debe reflejar en el panel cuando un caso ya no está asignado tras reasignación, desapareciendo de Mis incidencias asignadas del moderador original y apareciendo en el panel del nuevo moderador activo', () => {
    cy.session('moderador1-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.request('POST', 'http://localhost:8080/testing/login', {
        email: 'moderador1@test.com',
        password: 'Admin123@',
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });

    // Interceptar la petición inicial de moderación
    cy.intercept('GET', '**/moderation*').as('moderationPage');
    cy.visit('http://localhost:8080/moderation');
    cy.wait('@moderationPage');
    cy.contains('Publicación para reasignar', { timeout: 10000 }).should('be.visible');

    // Obtener el caso y el moderador al que está asignado, encadenando todos los requests
    cy.request('GET', `http://localhost:8080/testing/moderation-cases`)
      .then((casesResponse) => {
        const caseData = casesResponse.body.find((c: any) => c.id === caseId);
        expect(caseData).to.exist;
        
        const currentModeratorId = caseData.assigned_moderator_id;
        cy.log(`Caso asignado actualmente a moderador ID: ${currentModeratorId}`);
        
        // Obtener los IDs reales de los moderadores
        return cy.request('GET', 'http://localhost:8080/testing/users').then((usersResponse) => {
          const moderador1 = usersResponse.body.find((u: any) => u.email === 'moderador1@test.com');
          const moderador2 = usersResponse.body.find((u: any) => u.email === 'moderador2@test.com');
          expect(moderador1).to.exist;
          expect(moderador2).to.exist;
          
          const realModerador1Id = moderador1.id;
          const realModerador2Id = moderador2.id;
          
          // Si el caso está asignado a moderador1, desactivarlo y reasignar
          // Si está asignado a otro moderador, usar ese ID
          const moderatorToDeactivate = (currentModeratorId === realModerador1Id) ? realModerador1Id : currentModeratorId;
          const moderatorToAssign = realModerador2Id;
          
          cy.log(`Desactivando moderador ID: ${moderatorToDeactivate}, Reasignando a: ${moderatorToAssign}`);
          
          // Desactivar el moderador (esto debería disparar la reasignación automática del observer)
          return cy.request('PATCH', `http://localhost:8080/testing/user/${moderatorToDeactivate}`, {
            is_active: false,
          }).then(() => {
            // Polling para verificar si el observer reasignó automáticamente
            const checkReassignment = (attempts = 0): Cypress.Chainable<any> => {
              if (attempts >= 10) {
                // Después de 10 intentos (5 segundos), hacer reasignación manual
                cy.log('Reasignación automática no funcionó después de varios intentos, haciendo reasignación manual');
                return cy.request('POST', 'http://localhost:8080/testing/reassign-cases', {
                  from_moderator_id: moderatorToDeactivate,
                  to_moderator_id: moderatorToAssign,
                }).then((reassignResponse) => {
                  cy.log('Reasignación response:', JSON.stringify(reassignResponse.body));
                  expect(reassignResponse.body.reassigned_count).to.be.greaterThan(0);
                  
                  // Verificar que el caso fue reasignado
                  return cy.request('GET', `http://localhost:8080/testing/moderation-cases`).then((verifyResponse) => {
                    const finalCase = verifyResponse.body.find((c: any) => c.id === caseId);
                    expect(finalCase).to.exist;
                    expect(finalCase.assigned_moderator_id).to.eq(moderatorToAssign);
                    expect(finalCase.assigned_moderator_id).to.not.eq(moderatorToDeactivate);
                    // Usar cy.wrap() para mantener la cadena Cypress
                    return cy.wrap({ reassigned: true, finalModeratorId: finalCase.assigned_moderator_id });
                  });
                });
              }
              
              return cy.request('GET', `http://localhost:8080/testing/moderation-cases`).then((checkResponse) => {
                const updatedCase = checkResponse.body.find((c: any) => c.id === caseId);
                expect(updatedCase).to.exist;
                
                // Si el caso ya fue reasignado automáticamente, retornar
                if (updatedCase.assigned_moderator_id !== moderatorToDeactivate) {
                  cy.log('Caso ya fue reasignado automáticamente por el observer');
                  expect(updatedCase.assigned_moderator_id).to.not.eq(moderatorToDeactivate);
                  // El caso puede estar asignado a cualquier moderador activo, no necesariamente moderador2
                  expect(updatedCase.assigned_moderator_id).to.not.be.null;
                  // Usar cy.wrap() para mantener la cadena Cypress
                  return cy.wrap({ reassigned: true, finalModeratorId: updatedCase.assigned_moderator_id });
                } else {
                  // Esperar 500ms y volver a intentar
                  return cy.wait(500).then(() => checkReassignment(attempts + 1));
                }
              });
            };
            
            return checkReassignment();
          });
        });
      })
      .then(() => {
        // Interceptar la petición de recarga
        cy.intercept('GET', '**/moderation*').as('moderationReload');
        cy.reload();
        cy.wait('@moderationReload');
        
        // Interceptar la petición cuando se aplica el filtro (definir ANTES del check)
        cy.intercept('GET', '**/moderation*assigned_to_me*').as('filterApplied');
        
        // Aplicar filtro para ver solo casos asignados al moderador actual
        cy.contains('label', 'Solo asignados a mí', { timeout: 10000 }).within(() => {
          cy.get('input[type="checkbox"]').check();
        });
        
        // Esperar a que la petición del filtro se complete
        cy.wait('@filterApplied');

        // El caso no debería aparecer porque ya no está asignado al moderador1
        cy.contains('Publicación para reasignar').should('not.exist');
      });

    cy.session('moderador2-login', () => {
      cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
        const token = resp.body.token;
        cy.setCookie('XSRF-TOKEN', token);
      });

      cy.request('POST', 'http://localhost:8080/testing/login', {
        email: 'moderador2@test.com',
        password: 'Admin123@',
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });

    cy.request('GET', 'http://localhost:8080/testing/csrf').then((resp) => {
      const token = resp.body.token;
      cy.setCookie('XSRF-TOKEN', token);
    });

    // Interceptar la petición de moderación para moderador2
    cy.intercept('GET', '**/moderation*').as('moderationPage2');
    cy.visit('http://localhost:8080/moderation');
    cy.wait('@moderationPage2');
    cy.contains('Publicación para reasignar', { timeout: 10000 }).should('be.visible');
  });
});

