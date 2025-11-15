# Code Coverage con Xdebug

Este proyecto está configurado para generar reportes de cobertura de código usando Xdebug.

## Requisitos

- Docker y Docker Compose instalados
- Contenedor `app` reconstruido con Xdebug

## Configuración

Xdebug ya está instalado y configurado en el contenedor. La configuración se encuentra en:
- `docker/php/xdebug.ini` - Configuración de Xdebug para cobertura

## Uso

### Reconstruir el contenedor (primera vez o después de cambios en Dockerfile)

```bash
docker compose build app
docker compose up -d app
```

### Ejecutar tests con cobertura

#### Para un archivo específico:
```bash
docker compose exec app vendor/bin/pest --filter=PublicationCrudTest --coverage --coverage-html=coverage/html
```

#### Para todos los tests:
```bash
docker compose exec app vendor/bin/pest --coverage --coverage-html=coverage/html
```

#### Para un directorio específico:
```bash
docker compose exec app vendor/bin/pest tests/Feature/Publicaciones --coverage --coverage-html=coverage/html
```

### Ver el reporte

El reporte HTML se genera en `coverage/html/index.html`. Puedes abrirlo en tu navegador:

```bash
# En Windows
start coverage/html/index.html

# En Linux/Mac
open coverage/html/index.html
# o
xdg-open coverage/html/index.html
```

### Verificar que Xdebug está instalado

```bash
docker compose exec app php -m | grep xdebug
```

Deberías ver `xdebug` en la lista.

### Verificar configuración de Xdebug

```bash
docker compose exec app php -i | grep xdebug.mode
```

Deberías ver `xdebug.mode => coverage => coverage`

## Notas

- El directorio `coverage/` está en `.gitignore` y no se subirá al repositorio
- La cobertura puede hacer que los tests sean más lentos
- Para desarrollo normal sin cobertura, simplemente ejecuta los tests sin la opción `--coverage`

