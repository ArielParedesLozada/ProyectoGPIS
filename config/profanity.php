<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Profanity Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration for the Profanity package.
    | You can customize the profanity detection settings here.
    |
    */

    'enabled' => env('PROFANITY_ENABLED', true), // Habilitado para detectar contenido inapropiado

    /*
    |--------------------------------------------------------------------------
    | Language Support
    |--------------------------------------------------------------------------
    |
    | Configure which languages to support for profanity detection.
    |
    */

    'languages' => [
        'en' => true,  // English
        'es' => true,  // Spanish
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Words
    |--------------------------------------------------------------------------
    |
    | Add custom words to the profanity list for your specific needs.
    |
    */

    'custom_words' => [
        'es' => [
            // Palabras vulgares básicas en español
            'puta', 'puto', 'joder', 'mierda', 'cabron', 'cabrón',
            'hijo de puta', 'hijoputa', 'coño', 'carajo', 'verga',
            'pendejo', 'pendeja', 'culero', 'culera', 'chingar',
            'pinche', 'mamada', 'mamón', 'mamona', 'chingada', 'chingado',
            'estúpido', 'estúpida', 'idiota', 'imbécil', 'imbécila',
            'retrasado', 'retrasada', 'loco', 'loca', 'perra', 'perro',
            'zorra', 'zorro', 'prostituta', 'prostituto', 'maldito', 'maldita',
            'demonio', 'diablo', 'satanás', 'infierno', 'condenado', 'condenada',
            'jodido', 'jodida', 'jodete', 'jódete', 'cagado', 'cagada',
            'cagar', 'cagarse', 'cagón', 'cagona', 'mierdoso', 'mierdosa',
            'mierdón', 'mierdona', 'basura', 'escoria', 'desperdicio', 'inútil',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Whitelist Words
    |--------------------------------------------------------------------------
    |
    | Words that should be ignored even if they might be considered profane.
    |
    */

    'whitelist' => [
        'es' => [
            // Palabras que pueden ser falsos positivos
            'puta', 'puto', // En contextos no vulgares
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Detection Settings
    |--------------------------------------------------------------------------
    |
    | Configure how profanity detection should work.
    |
    */

    'detection' => [
        'strict' => true,        // Strict mode for detection
        'case_sensitive' => false, // Case insensitive detection
        'partial_match' => true,   // Allow partial word matches
    ],

    /*
    |--------------------------------------------------------------------------
    | Response Settings
    |--------------------------------------------------------------------------
    |
    | Configure how the system should respond to profanity detection.
    |
    */

    'response' => [
        'throw_exception' => true,  // Throw exception when profanity is detected
        'exception_class' => \App\Exceptions\ProfanityDetectedException::class,
        'log_detection' => true,    // Log profanity detections
    ],
];
