FROM nginx:alpine

WORKDIR /var/www/html

# Copia de los archivos públicos (CSS, JS, etc.)
COPY public /var/www/html/public

# 🔹 NUEVO: crear el symlink /public/storage -> /storage/app/public
RUN ln -s ../storage/app/public /var/www/html/public/storage

# Configuración de nginx
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
