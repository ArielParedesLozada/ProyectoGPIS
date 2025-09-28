<?php

test('example', function () {
    $response = $this->get('/home');
    $response->assertStatus(200)
    ->assertJson([
        'data' => 'ok'
    ]);
});
