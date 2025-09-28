#!/bin/bash
#Estas cosas solo las ejecutas una vez
docker pull zaproxy/zap-stable:latest #Solo lo ejecutas UNA VEZ
VOLUME_INFORMATION="./owasp-zap/reports" #Donde queires montar los reportes
sudo chown -R 1000:1000 "$VOLUME_INFORMATION"