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

        stage('Construir imágenes Docker') {
            steps {
                sh """
                    docker compose -f ${COMPOSE_FILE} build postgis pgadmin app web
                """
            }
        }

        stage('Desplegar contenedores') {
            steps {
                sh """
                    # Apagar lo que esté corriendo (si falla, no rompe el pipeline)
                    docker compose -f ${COMPOSE_FILE} down || true

                    # Levantar todo el stack: BD, pgadmin, backend (app) y nginx (web)
                    docker compose -f ${COMPOSE_FILE} up -d postgis pgadmin app web
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
