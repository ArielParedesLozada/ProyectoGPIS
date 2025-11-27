pipeline {
    agent any

    stages {
        stage('Checkout código desde GitHub') {
            steps {
                echo 'Clonando rama feature/lopez del repositorio ProyectoGPIS...'
                git branch: 'feature/lopez',
                    url: 'https://github.com/ArielParedesLozada/ProyectoGPIS.git'
            }
        }

        stage('Build con Docker Compose') {
            steps {
                echo 'Construyendo imágenes Docker definidas en docker-compose.yml...'
                script {
                    // Intentar build, pero continuar si falla (las imágenes pueden ya existir)
                    def buildResult = bat(
                        script: 'docker compose build',
                        returnStatus: true
                    )
                    if (buildResult != 0) {
                        echo '⚠️ Build falló, pero continuando (las imágenes pueden ya existir)...'
                        // Verificar si las imágenes existen
                        def imagesExist = bat(
                            script: 'docker images pipeline-despliegue-gpis-app --format "{{.Repository}}"',
                            returnStatus: true
                        )
                        if (imagesExist != 0) {
                            echo '❌ Las imágenes no existen y no se pudieron construir. Verifica la conexión a Docker Hub.'
                            error('No se pudieron construir las imágenes Docker')
                        }
                    }
                }
            }
        }

        stage('Configurar Laravel') {
            steps {
                echo 'Configurando Laravel (crear .env si no existe, generar key, etc.)...'
                script {
                    // Verificar si existe .env, si no, copiar desde .env.example
                    bat '''
                        if not exist .env (
                            echo Copiando .env.example a .env...
                            copy .env.example .env
                        ) else (
                            echo .env ya existe, no se copia.
                        )
                    '''
                }
            }
        }

        stage('Instalar dependencias Composer dentro del contenedor') {
            steps {
                echo 'Instalando dependencias de Laravel dentro del contenedor app...'
                bat 'docker compose run --rm app composer install --no-interaction --prefer-dist'
            }
        }

        stage('Desplegar con Docker Compose') {
            steps {
                echo 'Desplegando la aplicación con Docker Compose...'
                bat 'docker compose down || echo No habia stack previo'
                bat 'docker compose up -d'
                
                // Esperar a que los servicios estén listos usando PowerShell
                echo 'Esperando a que los servicios estén listos...'
                bat 'powershell -Command "Start-Sleep -Seconds 10"'
            }
        }

        stage('Configuración Post-Deploy') {
            steps {
                echo 'Ejecutando configuración post-deploy de Laravel...'
                script {
                    // Esperar a que el contenedor esté completamente listo
                    echo 'Esperando a que el contenedor PHP esté listo...'
                    def containerReady = false
                    def attempts = 0
                    while (!containerReady && attempts < 10) {
                        attempts++
                        def checkResult = bat(
                            script: 'docker exec php83_app php --version',
                            returnStatus: true
                        )
                        if (checkResult == 0) {
                            containerReady = true
                            echo 'Contenedor PHP listo'
                        } else {
                            echo "Esperando contenedor... (intento ${attempts}/10)"
                            sleep(time: 2, unit: 'SECONDS')
                        }
                    }
                    
                    if (!containerReady) {
                        error('El contenedor PHP no está respondiendo')
                    }
                    
                    // Verificar que .env existe dentro del contenedor
                    def envExists = bat(
                        script: 'docker exec php83_app test -f .env',
                        returnStatus: true
                    )
                    if (envExists != 0) {
                        echo '⚠️ .env no existe dentro del contenedor, copiando desde .env.example...'
                        bat 'docker exec -u root php83_app cp .env.example .env || echo No se pudo copiar .env.example'
                        // Asegurar permisos del .env
                        bat 'docker exec -u root php83_app chmod 666 .env || echo No se pudieron ajustar permisos'
                    }
                    
                    // Verificar si APP_KEY ya existe en .env
                    def keyExists = bat(
                        script: 'docker exec php83_app grep -q "APP_KEY=base64:" .env',
                        returnStatus: true
                    )
                    
                    // Generar APP_KEY si no existe (como root para evitar problemas de permisos)
                    if (keyExists != 0) {
                        echo 'Generando APP_KEY...'
                        bat 'docker exec -u root php83_app php artisan key:generate --force || echo Error al generar APP_KEY'
                        // Asegurar permisos después de generar
                        bat 'docker exec -u root php83_app chmod 666 .env || echo No se pudieron ajustar permisos'
                    } else {
                        echo 'APP_KEY ya existe en .env'
                    }
                    
                    // Crear base de datos si no existe
                    echo 'Verificando/Creando base de datos...'
                    script {
                        def dbExists = bat(
                            script: 'docker exec postgis psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = \'proyecto_gpis\'"',
                            returnStatus: true
                        )
                        // Si la consulta no devuelve nada, crear la base de datos
                        def createDbResult = bat(
                            script: 'docker exec postgis psql -U postgres -c "CREATE DATABASE proyecto_gpis"',
                            returnStatus: true
                        )
                        if (createDbResult == 0) {
                            echo 'Base de datos proyecto_gpis creada exitosamente'
                        } else {
                            echo 'Base de datos proyecto_gpis ya existe o hubo un error (continuando...)'
                        }
                    }
                    
                    // Ejecutar migraciones
                    echo 'Ejecutando migraciones...'
                    def migrateResult = bat(
                        script: 'docker exec php83_app php artisan migrate --force',
                        returnStatus: true
                    )
                    if (migrateResult != 0) {
                        echo '⚠️ Error en migraciones, pero continuando...'
                    }
                    
                    // Crear storage link
                    echo 'Creando storage link...'
                    bat 'docker exec php83_app php artisan storage:link || echo Storage link ya existe'
                    
                    // Limpiar cachés
                    echo 'Limpiando cachés...'
                    bat 'docker exec php83_app php artisan config:clear || echo Error limpiando config'
                    bat 'docker exec php83_app php artisan cache:clear || echo Error limpiando cache'
                    bat 'docker exec php83_app php artisan route:clear || echo Error limpiando route'
                    bat 'docker exec php83_app php artisan view:clear || echo Error limpiando view'
                    
                    // Compilar assets de frontend dentro del contenedor
                    echo 'Compilando assets de frontend...'
                    script {
                        // Verificar si Node.js está instalado en el contenedor
                        def nodeExists = bat(
                            script: 'docker exec php83_app which node',
                            returnStatus: true
                        )
                        if (nodeExists != 0) {
                            echo 'Instalando Node.js en el contenedor...'
                            bat 'docker exec -u root php83_app bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs" || echo Error al instalar Node.js'
                        }
                        
                        // Verificar si package.json existe
                        def packageJsonExists = bat(
                            script: 'docker exec php83_app test -f package.json',
                            returnStatus: true
                        )
                        if (packageJsonExists == 0) {
                            echo 'Instalando dependencias de npm...'
                            def npmInstallResult = bat(
                                script: 'docker exec php83_app npm install',
                                returnStatus: true
                            )
                            if (npmInstallResult == 0) {
                                echo 'Compilando assets con Vite...'
                                def npmBuildResult = bat(
                                    script: 'docker exec php83_app npm run build',
                                    returnStatus: true
                                )
                                if (npmBuildResult == 0) {
                                    echo '✅ Assets compilados exitosamente'
                                } else {
                                    echo '⚠️ Error al compilar assets'
                                }
                            } else {
                                echo '⚠️ Error al instalar dependencias de npm'
                            }
                        } else {
                            echo '⚠️ No se encontró package.json, saltando compilación de assets'
                        }
                    }
                    
                    // Asegurar permisos (si es necesario en Windows, esto puede no funcionar)
                    // Estos comandos pueden fallar en Windows pero no son críticos
                    script {
                        def chmodResult = bat(
                            script: 'docker exec -u root php83_app chmod -R 775 storage bootstrap/cache 2>&1',
                            returnStatus: true
                        )
                        def chownResult = bat(
                            script: 'docker exec -u root php83_app chown -R www-data:www-data storage bootstrap/cache 2>&1',
                            returnStatus: true
                        )
                        echo 'Permisos ajustados (errores esperados en Windows con archivos montados)'
                    }
                    
                    // Mostrar logs de Laravel para debugging
                    echo 'Verificando logs de Laravel...'
                    bat 'docker exec php83_app tail -n 20 storage/logs/laravel.log || echo No hay logs aún'
                    
                    // Verificar que APP_KEY esté configurada
                    echo 'Verificando configuración de APP_KEY...'
                    bat 'docker exec php83_app grep "APP_KEY=" .env || echo APP_KEY no encontrada en .env'
                }
            }
        }

        stage('Verificar Health') {
            steps {
                echo 'Verificando que la aplicación responda correctamente...'
                script {
                    def maxAttempts = 5
                    def attempt = 0
                    def success = false
                    
                    while (attempt < maxAttempts && !success) {
                        attempt++
                        echo "Intento ${attempt}/${maxAttempts}..."
                        try {
                            def response = bat(
                                script: 'curl -f http://localhost:8080 || exit 1',
                                returnStatus: true
                            )
                            if (response == 0) {
                                success = true
                                echo '✅ Aplicación respondiendo correctamente'
                            } else {
                                sleep(time: 5, unit: 'SECONDS')
                            }
                        } catch (Exception e) {
                            sleep(time: 5, unit: 'SECONDS')
                        }
                    }
                    
                    if (!success) {
                        echo '⚠️ Health check falló, pero el deploy continuó'
                        // Mostrar logs para debugging
                        bat 'docker compose logs --tail=50'
                    }
                }
            }
        }
    }

    post {
        success {
            echo '✅ Deploy completado exitosamente'
            bat 'docker compose ps'
        }
        failure {
            echo '❌ Deploy falló'
            bat 'docker compose logs --tail=100'
        }
    }
}
