FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    git zip unzip libpq-dev libzip-dev \
    $PHPIZE_DEPS \
 && docker-php-ext-install pdo pdo_pgsql zip \
 && docker-php-ext-configure pcntl --enable-pcntl \
 && docker-php-ext-install pcntl

# Install Xdebug
RUN pecl install xdebug \
 && docker-php-ext-enable xdebug \
 && apt-get purge -y $PHPIZE_DEPS \
 && apt-get autoremove -y

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
