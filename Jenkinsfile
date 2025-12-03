pipeline {
    agent any

    environment {
        COMPOSE_FILE = "docker-compose.yml"
        // MAIL_PASSWORD = credentials('sendgrid-api-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validar ENV del Pipeline') {
            steps {
                sh """
                    echo 'MAIL_MAILER='\\$(grep MAIL_MAILER .env)
                    echo 'MAIL_HOST='\\$(grep MAIL_HOST .env)
                    echo 'MAIL_PORT='\\$(grep MAIL_PORT .env)
                    echo 'MAIL_USERNAME='\\$(grep MAIL_USERNAME .env)
                    echo 'MAIL_PASSWORD=***OCULTO***'
                """
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
