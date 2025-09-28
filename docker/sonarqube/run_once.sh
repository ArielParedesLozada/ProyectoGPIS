#!/bin/bash
SONAR_QUBE_ROOT="./sonarqube"  #Cambia a la direccion que pusiste en los volumenes en el docker compose
mkdir -p "$SONAR_QUBE_ROOT/{sonarqube_data,sonarqube_extensions,postgresql,sonarqube_logs}"
sudo chown -R 999:999 "$SONAR_QUBE_ROOT/postgresql" 
sudo chown -R 999:999 "$SONAR_QUBE_ROOT/sonarqube_data"
sudo chown -R 999:999 "$SONAR_QUBE_ROOT/sonarqube_extensions"
sudo chown -R 999:999 "$SONAR_QUBE_ROOT/sonarqube_logs"

#PD: Tambien instala SonarScanner asi como dicen ls guias