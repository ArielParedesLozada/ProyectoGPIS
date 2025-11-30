FROM nginx:alpine

# Carpeta de trabajo (no obligatorio, pero ordenado)
WORKDIR /var/www/html

# (Nginx solo necesita ver public/ para que try_files encuentre index.php)
COPY public /var/www/html/public


COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
