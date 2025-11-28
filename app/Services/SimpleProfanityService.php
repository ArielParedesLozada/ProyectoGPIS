<?php

namespace App\Services;

use App\Exceptions\ProfanityDetectedException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class SimpleProfanityService
{
    protected $basicWords = [
        'puta', 'puto', 'mierda', 'joder', 'cabrón', 'cabron',
        'pendejo', 'pendeja', 'culero', 'culera', 'chingar',
        'pinche', 'mamada', 'mamón', 'mamona', 'chingada', 'chingado',
        'estúpido', 'estúpida', 'idiota', 'imbécil', 'imbécila',
        'retrasado', 'retrasada', 'loco', 'loca', 'perra', 'perro',
        'zorra', 'zorro', 'prostituta', 'prostituto', 'maldito', 'maldita',
        'demonio', 'diablo', 'satanás', 'infierno', 'condenado', 'condenada',
        'jodido', 'jodida', 'jodete', 'jódete', 'cagado', 'cagada',
        'cagar', 'cagarse', 'cagón', 'cagona', 'mierdoso', 'mierdosa',
        'mierdón', 'mierdona', 'basura', 'escoria', 'desperdicio', 'inútil',
        'hijo de puta', 'hijoputa', 'coño', 'carajo', 'verga',
        // Drogas
        'drogas', 'droga', 'marihuana', 'cannabis', 'cocaína', 'cocaina', 'heroína', 'heroina',
        'anfetamina', 'anfetaminas', 'metanfetamina', 'lsd', 'éxtasis', 'extasis',
        'morfina', 'opio', 'crack', 'cristal', 'speed', 'pasta', 'base',
        'fumando', 'inyectar', 'inyección', 'inyeccion', 'dosis', 'adicto', 'adicta',
        'narcotráfico', 'narcotrafico', 'traficante', 'dealer', 'tráfico', 'trafico',
        // Alcohol
        'alcohol', 'borracho', 'borracha', 'embriagado', 'embriagada', 'ebrio', 'ebria',
        'cerveza', 'whisky', 'whiskey', 'vodka', 'ron', 'tequila', 'licor',
        'emborrachar', 'borrachera', 'resaca', 'cruda', 'alcohólico', 'alcoholico',
        // Armas
        'pistola', 'pistolas', 'arma', 'armas', 'revólver', 'revolver', 'rifle',
        'escopeta', 'fusil', 'metralleta', 'ametralladora', 'cuchillo', 'cuchillos',
        'navaja', 'navajas', 'machete', 'machetes', 'bomba', 'bombas', 'explosivo',
        'explosivos', 'granada', 'granadas', 'disparar', 'disparo', 'tiro', 'tiros',
        'asesinar', 'asesinato', 'matar', 'muerte', 'homicidio'
    ];
    
    /**
     * Check if text contains profanity
     */
    public function checkText(string $text): bool
    {
        if (!config('profanity.enabled', true) || empty(trim($text))) {
            return false;
        }
        
        $textLower = strtolower($text);
        
        foreach ($this->basicWords as $word) {
            if (strpos($textLower, $word) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get detected profane words
     */
    public function getDetectedWords(string $text): array
    {
        if (!config('profanity.enabled', true) || empty(trim($text))) {
            return [];
        }
        
        $detectedWords = [];
        $textLower = strtolower($text);
        
        foreach ($this->basicWords as $word) {
            if (strpos($textLower, $word) !== false) {
                $detectedWords[] = $word;
            }
        }
        
        return $detectedWords;
    }
    
    /**
     * Validate text and throw exception if profanity is detected
     */
    public function validateText(string $text): void
    {
        if ($this->checkText($text)) {
            $detectedWords = $this->getDetectedWords($text);
            
            // Log the detection if enabled
            if (config('profanity.response.log_detection', true)) {
                Log::warning('Profanity detected', [
                    'text' => $text,
                    'detected_words' => $detectedWords,
                    'user_id' => Auth::id(),
                ]);
            }
            
            // Throw exception if enabled
            if (config('profanity.response.throw_exception', true)) {
                throw new ProfanityDetectedException($detectedWords);
            }
        }
    }
    
    /**
     * Validate multiple text fields
     */
    public function validateFields(array $fields): void
    {
        foreach ($fields as $field => $text) {
            if (is_string($text) && !empty($text)) {
                try {
                    $this->validateText($text);
                } catch (ProfanityDetectedException $e) {
                    // Re-throw with field context
                    throw new ProfanityDetectedException(
                        $e->getDetectedWords(),
                        "El campo '{$field}' contiene palabras inapropiadas: " . implode(', ', $e->getDetectedWords())
                    );
                }
            }
        }
    }

    /**
     * Check if text contains profanity without throwing exception
     * Returns array with detection info for auto-moderation
     */
    public function checkForAutoModeration(string $text): array
    {
        if (!$this->checkText($text)) {
            return [
                'has_profanity' => false,
                'detected_words' => [],
                'reason' => null
            ];
        }

        $detectedWords = $this->getDetectedWords($text);
        
        // Log the detection for auto-moderation
        Log::info('Profanity detected for auto-moderation', [
            'text' => $text,
            'detected_words' => $detectedWords,
            'user_id' => Auth::id(),
        ]);

        return [
            'has_profanity' => true,
            'detected_words' => $detectedWords,
            'reason' => 'Contenido inadecuado detectado automáticamente: ' . implode(', ', $detectedWords)
        ];
    }
    
    /**
     * Get profanity statistics
     */
    public function getStats(): array
    {
        return [
            'enabled' => config('profanity.enabled', true),
            'basic_words_count' => count($this->basicWords),
            'languages' => ['es'],
        ];
    }
}
