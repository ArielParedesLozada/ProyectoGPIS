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
