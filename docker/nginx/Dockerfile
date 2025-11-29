FROM nginx:alpine

# Carpeta de trabajo (no obligatorio, pero ordenado)
WORKDIR /var/www/html

# Copiar solo lo necesario para servir la app
# (Nginx solo necesita ver public/ para que try_files encuentre index.php)
COPY public /var/www/html/public

# Configuración de Nginx
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
