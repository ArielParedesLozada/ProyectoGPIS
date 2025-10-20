describe('Example test', () => {
  it('renders the Test component with the correct data', () => {
    // Visita la página donde se encuentra el componente Test
    cy.visit('http://localhost:8000/test');
    
    // Verifica que el contenido esperado esté presente en la página
    cy.contains('ok'); // Verifica que 'homeData.data' se renderiza correctamente
    cy.contains('Información adicional'); // Verifica que 'additionalData' se renderiza correctamente

    // Si el componente usa Head para el título de la página, puedes verificarlo también
    cy.title().should('include', 'Página de Test');
  });
});
