pipeline {
    agent any

    environment {
        COMPOSE_FILE = "docker-compose.yml"
        // Usar la credencial de SendGrid configurada en Jenkins
        MAIL_PASSWORD = credentials('sendgrid-api-key')
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
            docker-compose -f ${COMPOSE_FILE} build postgis pgadmin app web
        """
    }
}

       stage('Desplegar contenedores') {
    steps {
        sh """
            # Intentar bajar cualquier stack previo
            docker-compose -f ${COMPOSE_FILE} down || true

            # Forzar eliminación de contenedores con los mismos nombres (si existen)
            docker rm -f postgis pgadmin_postgis php83_app nginx_app || true

            # Levantar de nuevo todo el entorno
            docker-compose -f ${COMPOSE_FILE} up -d postgis pgadmin app web
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
