<?php

test('example', function () {
    $response = $this->get('/testing');
    $response->assertStatus(200)
    ->assertJson([
        'data' => 'ok'
    ]);
});
