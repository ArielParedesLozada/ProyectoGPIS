pipeline {
    agent any

    environment {
        COMPOSE_FILE = "docker-compose.yml"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Copiar .env desde credencial') {
            steps {
                // Usa el archivo de credenciales ape7-env-file
                withCredentials([file(credentialsId: 'ape7-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        cp "$ENV_FILE" .env
                        echo "Archivo .env copiado al workspace"
                    '''
                }
            }
        }

        stage('Validar ENV del Pipeline') {
            steps {
                sh '''
                    echo "========== INFO DEL WORKSPACE =========="
                    echo "WORKSPACE: $PWD"

                    echo "========== EXISTENCIA DEL .env =========="
                    ls -l .env || echo "⚠ No se encontró el archivo .env"

                    echo "Ruta absoluta del .env:"
                    readlink -f .env || echo "⚠ No se pudo resolver la ruta"

                    echo "========== VALORES DEL .env =========="

                    echo "MAIL_MAILER=$(grep ^MAIL_MAILER= .env | cut -d '=' -f2-)"
                    echo "MAIL_HOST=$(grep ^MAIL_HOST= .env | cut -d '=' -f2-)"
                    echo "MAIL_PORT=$(grep ^MAIL_PORT= .env | cut -d '=' -f2-)"
                    echo "MAIL_USERNAME=$(grep ^MAIL_USERNAME= .env | cut -d '=' -f2-)"
                    echo "MAIL_FROM_ADDRESS=$(grep ^MAIL_FROM_ADDRESS= .env | cut -d '=' -f2-)"
                    echo "MAIL_FROM_NAME=$(grep ^MAIL_FROM_NAME= .env | cut -d '=' -f2-)"

                    echo "MAIL_PASSWORD=***OCULTO***"
                    echo "======================================"
                '''
            }
        }

        stage('Build images') {
            steps {
                sh """
                    docker compose -f ${COMPOSE_FILE} build
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    docker compose -f ${COMPOSE_FILE} down -v --remove-orphans
                    docker compose -f ${COMPOSE_FILE} up -d
                """
            }
        }

    }

    post {
        success {
            echo "Pipeline completado correctamente. Proyecto GPIS desplegado con Docker."
        }
        failure {
            echo "El pipeline falló. Revisar la consola de Jenkins."
        }
    }
}
