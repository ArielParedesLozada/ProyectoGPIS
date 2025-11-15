<?php

use App\Models\Category;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

function fakePng(string $name = 'image.png', int $sizeInKilobytes = 10): UploadedFile
{
    $baseImage = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mP8/5+hHgAHggJ/PxCF+QAAAABJRU5ErkJggg==');
    $sizeInBytes = max($sizeInKilobytes * 1024, strlen($baseImage));
    $data = $baseImage . str_repeat("\0", $sizeInBytes - strlen($baseImage));

    $path = tempnam(sys_get_temp_dir(), 'png');
    file_put_contents($path, $data);

    return new UploadedFile($path, $name, 'image/png', null, true);
}

function makeUser(): User
{
    return User::factory()->create();
}

function makeCategory(): Category
{
    return Category::factory()->create();
}

function basePublicationPayload(Category $category, array $overrides = []): array
{
    $defaults = [
        'title' => 'Publicación de prueba',
        'description' => 'Descripción de prueba',
        'price' => 99.99,
        'category_id' => $category->id,
        'type' => 'producto',
        'lat' => -1.25,
        'lng' => -78.62,
        '_token' => csrf_token(),
    ];

    return array_merge($defaults, $overrides);
}

function fakeGeocoding(?array $address = null, int $status = 200): void
{
    $response = $address === null ? [] : ['address' => $address];

    Http::fake([
        'https://nominatim.openstreetmap.org/reverse*' => Http::response($response, $status),
    ]);
}

function createPublicationFor(User $owner, Category $category, array $attributes = []): Publication
{
    $payload = array_merge([
        'created_by' => $owner->id,
        'category_id' => $category->id,
    ], $attributes);

    unset($payload['schedule']);

    return Publication::factory()->create($payload);
}

function ensureViteEntries(array $components): void
{
    File::ensureDirectoryExists(public_path('build'));

    $manifest = [
        'resources/js/app.tsx' => [
            'file' => 'app.js',
            'src' => 'resources/js/app.tsx',
            'isEntry' => true,
        ],
    ];

    foreach ($components as $component) {
        $entry = "resources/js/pages/{$component}.tsx";
        $manifest[$entry] = [
            'file' => str_replace(['/', '.'], '_', $component).'.js',
            'src' => $entry,
            'isEntry' => true,
        ];
    }

    File::put(public_path('build/manifest.json'), json_encode($manifest));
}
