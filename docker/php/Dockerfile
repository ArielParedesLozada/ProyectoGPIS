FROM php:8.3-fpm

# Dependencias de PHP y extensiones
RUN apt-get update && apt-get install -y \
    git zip unzip libpq-dev libzip-dev \
    $PHPIZE_DEPS \
 && docker-php-ext-install pdo pdo_pgsql zip \
 && docker-php-ext-configure pcntl --enable-pcntl \
 && docker-php-ext-install pcntl

# Xdebug (si lo necesitas para desarrollo)
RUN pecl install xdebug \
 && docker-php-ext-enable xdebug \
 && apt-get purge -y $PHPIZE_DEPS \
 && apt-get autoremove -y

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

# Crear archivo .env si no existe
RUN if [ ! -f .env ]; then \
    echo "APP_NAME=Laravel" > .env && \
    echo "APP_ENV=production" >> .env && \
    echo "APP_KEY=" >> .env && \
    echo "APP_DEBUG=false" >> .env && \
    echo "APP_URL=http://localhost" >> .env && \
    echo "" >> .env && \
    echo "LOG_CHANNEL=stack" >> .env && \
    echo "LOG_DEPRECATIONS_CHANNEL=null" >> .env && \
    echo "LOG_LEVEL=debug" >> .env && \
    echo "" >> .env && \
    echo "DB_CONNECTION=pgsql" >> .env && \
    echo "DB_HOST=postgis" >> .env && \
    echo "DB_PORT=5432" >> .env && \
    echo "DB_DATABASE=postgres" >> .env && \
    echo "DB_USERNAME=postgres" >> .env && \
    echo "DB_PASSWORD=clave_piola" >> .env && \
    echo "" >> .env && \
    echo "BROADCAST_DRIVER=log" >> .env && \
    echo "CACHE_DRIVER=file" >> .env && \
    echo "FILESYSTEM_DISK=local" >> .env && \
    echo "QUEUE_CONNECTION=sync" >> .env && \
    echo "SESSION_DRIVER=file" >> .env && \
    echo "SESSION_LIFETIME=120" >> .env; \
    fi

# Configurar permisos para storage y bootstrap/cache ANTES de generar la clave
RUN mkdir -p /var/www/html/storage/framework/{sessions,views,cache} && \
    mkdir -p /var/www/html/storage/logs && \
    mkdir -p /var/www/html/bootstrap/cache && \
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Generar APP_KEY si no existe o está vacío
RUN if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then \
    php artisan key:generate --force --no-interaction || echo "APP_KEY generation skipped"; \
    fi
