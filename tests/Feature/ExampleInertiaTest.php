<?php

test('example inertia test', function () {
    $response = $this->get('/test');
    $response->assertStatus(200)
        ->assertInertia(
            fn($page) =>
            $page->component('Test')
                ->has('homeData')
                ->has('additionalData')
                ->where('homeData.data', 'ok')
                ->where('additionalData', 'Información adicional')
        );
});
