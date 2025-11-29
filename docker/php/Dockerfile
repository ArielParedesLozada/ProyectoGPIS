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
