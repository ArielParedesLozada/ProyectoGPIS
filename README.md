# Proyecto de GPIS
Una aplicación de publicaciones de compra y venta.
énfasis en la moderación

## PRUEBAS

Las pruebas de *Pest, Codeception, Volt-Test PHP y PHP Stan* ya están descargadas en el proyecto y **no** hace falta seguir los pasos de *Instalación y Configuración*.

### Pruebas de Pest
**Instalación**

Ya viene integrado con Laravel

**Creación de pruebas**

- Crear una nueva funcionalidad a probar
- Ejecutar el comando ```php artisan make:test PruebaTest```
- Opcionalmente se usan flags para indicar pruebas unitarias: ```php artisan make:test PruebaTest --unit```
- Prueba generada en *test/Feature/PruebaTest.php*
- Prueba generada en *test/Unit/PruebaTest.php* si es unitaria
- Se escribe la prueba

**Ejecución de pruebas**

- Para ejecutar todas las pruebas: ```php artisan test```
- Para ejecutar una prueba particular: ```php artisan test --testsuite=Feature --stop-on-failure```

### Pruebas de Codeception

**Instalación y Configuración**

- Se usa Composer para instalar la dependencia: ```composer require codeception/codeception codeception/module-laravel codeception/module-rest codeception/module-webdriver codeception/module-asserts --dev```
- Se ejecuta el comando de bootsrap: `php vendor/bin/codecept bootstrap`
- Se modifican los archivos: *test/Acceptance.suite.yml, test/Functional.suite.yml, test/Unit.suite.yml* como se requiera

**Creación de pruebas**

- Usa comando: `vendor/bin/codecept generate:cest <Acceptance|Functional|Unit> Prueba`
- Prueba generada en *test/{Acceptance|Functional|Unit}/PruebaCest.php*
- Se modifica la prueba generada

**Ejecución de pruebas**

- Usa comando: `vendor/bin/codecept run <Acceptance|Functional|Unit> PruebaCest.php`

### Pruebas de Volt-Test PHP

**Instalación y configuración**

- Instala Volt-Test PHP: `composer require volt-test/php-sdk`
- Instala paquete para Laravel: `composer requiere volt-test/laravel-performance-testing --dev`
- Publica paquete: `php artisan vendor:publish --tag=volttest-config`
- Archivo de configuración en *config/volttest.php*

**Creación de pruebas**

- Crea prueba con comando: `php artisan volttest:make PruebaTest`
- Prueba creada en: `app/VoltTest/PruebaTest.php`
- Modifica prueba creada

**Ejecución de pruebas**

- Usa comando: `php artisan volttest:run PruebaTest`

### Pruebas de PHP Stan

**Instalación y Configuración**

- Instala paquete: `composer require --dev phpstan/phpstan`
- Instala paquete para Laravel: `composer require --dev larastan/larastan:^3.0`
- Crea archivo de configuración en *phpstan.neon*

**Creación de pruebas**

- Análisis estático de código, no hace falta crear pruebas

**Ejecución de pruebas**

- Usa comando: `/vendor/bin/phpstan analyse`
- Opcionalmente, se usa un comando para usar más memoria: `/vendor/bin/phpstan analyse --memory-limit=128M`

### Pruebas de ESLint

**Instalación y Configuración**

- Paquete integrado junto con Laravel
- Configuración en *eslint.conf.js*

**Ejecución de pruebas**

- Usa comando: `npm run lint`

### Pruebas de Prettier

**Instalación y Configuración**

- Paquete integrado junto con Laravel
- Configuración en *.prettierrc*

**Ejecución de pruebas**

- Usa comando para ver los problemas: `npm run format:check`
- Usa comando para arreglar las cosas: `npm run format`

### Pruebas de Sonarqube

**Instalación y Configuración**

- Ir al archivo de docker-compose: `cd docker/sonarqube`
- Crear contenedor: `docker-compose up -d`
- Obtener un token en Sonarqube
- Poner el token en un archivo de configuración *sonar-project.properties*
- Instalar SonarScanner CLI
- Ejecutar el comando propuesto por Sonarqube

**Ejecución de pruebas**

- Se ejecuta comando propuesto por Sonaqube
```bash
sonar-scanner \
    -Dsonar.projectKey=ProyectoGPIS \
    -Dsonar.sources=. \
    -Dsonar.host.url=http://localhost:9000 \ 
    -Dsonar.token=tokenDeSonarqube

```
### Pruebas de OWASP ZAP

**Instalación y Configuración**

- Ir al archivo de OWASP: `cd docker/owasp`
- Ejecutar el contenedor volátil: `./sonarscanner_cli.sh`

**Ejecución de pruebas**

- Ejecutar el contenedor volátil: `./sonarscanner_cli.sh`
- Ver los resultados en: `owasp/reports/scan-report.html`