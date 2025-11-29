FROM php:8.3-fpm

# Dependencias de PHP y extensiones + Node.js para compilar assets
RUN apt-get update && apt-get install -y \
    git zip unzip libpq-dev libzip-dev curl \
    $PHPIZE_DEPS \
 && docker-php-ext-install pdo pdo_pgsql zip \
 && docker-php-ext-configure pcntl --enable-pcntl \
 && docker-php-ext-install pcntl

# Instalar Node.js para compilar assets de Vite
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y nodejs

# Xdebug (si lo necesitas para desarrollo)
RUN pecl install xdebug \
 && docker-php-ext-enable xdebug \
 && apt-get purge -y $PHPIZE_DEPS \
 && apt-get autoremove -y \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Composer dentro de la imagen
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Carpeta de trabajo
WORKDIR /var/www/html

# 👇 ESTO ES LO QUE FALTABA 👇
# Copiar TODO el proyecto dentro de la imagen
COPY . /var/www/html

# (Opcional pero recomendable) instalar dependencias de PHP
# En Jenkins es importante porque ahí NO existe la carpeta vendor/
RUN composer install --no-interaction --no-dev --prefer-dist --optimize-autoloader

# Crear archivo .env solo si no existe (el .env del proyecto se copia con COPY .)
# Si no existe, crear uno con valores por defecto para Jenkins/CI
RUN if [ ! -f .env ]; then \
    echo "APP_NAME=Laravel" > .env && \
    echo "APP_ENV=production" >> .env && \
    echo "APP_KEY=" >> .env && \
    echo "APP_DEBUG=false" >> .env && \
    echo "APP_URL=http://localhost:8080" >> .env && \
    echo "" >> .env && \
    echo "LOG_CHANNEL=stack" >> .env && \
    echo "LOG_DEPRECATIONS_CHANNEL=null" >> .env && \
    echo "LOG_LEVEL=debug" >> .env && \
    echo "" >> .env && \
    echo "DB_CONNECTION=pgsql" >> .env && \
    echo "DB_HOST=postgis" >> .env && \
    echo "DB_PORT=5432" >> .env && \
    echo "DB_DATABASE=proyecto_gpis" >> .env && \
    echo "DB_USERNAME=postgres" >> .env && \
    echo "DB_PASSWORD=clave_piola" >> .env && \
    echo "" >> .env && \
    echo "BROADCAST_DRIVER=log" >> .env && \
    echo "CACHE_DRIVER=file" >> .env && \
    echo "FILESYSTEM_DISK=local" >> .env && \
    echo "QUEUE_CONNECTION=sync" >> .env && \
    echo "SESSION_DRIVER=file" >> .env && \
    echo "SESSION_LIFETIME=120" >> .env && \
    echo "" >> .env && \
    echo "MAIL_MAILER=smtp" >> .env && \
    echo "MAIL_HOST=smtp.sendgrid.net" >> .env && \
    echo "MAIL_PORT=2525" >> .env && \
    echo "MAIL_USERNAME=apikey" >> .env && \
    echo "MAIL_PASSWORD=\${MAIL_PASSWORD}" >> .env && \
    echo "MAIL_ENCRYPTION=tls" >> .env && \
    echo "MAIL_FROM_ADDRESS=elkinjoao2005@gmail.com" >> .env && \
    echo "MAIL_FROM_NAME=\"Proyecto GPIS\"" >> .env; \
    fi


# Configurar permisos para storage y bootstrap/cache ANTES de generar la clave
RUN mkdir -p /var/www/html/storage/framework/sessions && \
    mkdir -p /var/www/html/storage/framework/views && \
    mkdir -p /var/www/html/storage/framework/cache && \
    mkdir -p /var/www/html/storage/logs && \
    mkdir -p /var/www/html/bootstrap/cache && \
    mkdir -p /var/www/html/public/build && \
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/public/build && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Generar APP_KEY si no existe o está vacío
RUN if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then \
    php artisan key:generate --force --no-interaction || echo "APP_KEY generation skipped"; \
    fi

# Compilar assets de Vite (si existe package.json)
RUN if [ -f package.json ]; then \
    npm install && \
    npm run build; \
    else \
    mkdir -p /var/www/html/public/build && \
    echo '{}' > /var/www/html/public/build/manifest.json; \
    fi

# Guardar una copia de los assets compilados antes de que el volumen los sobrescriba
RUN if [ -d /var/www/html/public/build ]; then \
    cp -r /var/www/html/public/build /var/www/html/public/build.bak || true; \
    fi

# Crear script de inicio para copiar assets al volumen compartido
RUN echo '#!/bin/sh' > /usr/local/bin/init-assets.sh && \
    echo 'if [ -d /var/www/html/public/build.bak ] && [ -z "$(ls -A /var/www/html/public/build 2>/dev/null)" ]; then' >> /usr/local/bin/init-assets.sh && \
    echo '  echo "Copiando assets compilados al volumen compartido..."' >> /usr/local/bin/init-assets.sh && \
    echo '  cp -r /var/www/html/public/build.bak/* /var/www/html/public/build/ 2>/dev/null || true' >> /usr/local/bin/init-assets.sh && \
    echo '  chown -R www-data:www-data /var/www/html/public/build || true' >> /usr/local/bin/init-assets.sh && \
    echo 'fi' >> /usr/local/bin/init-assets.sh && \
    chmod +x /usr/local/bin/init-assets.sh
