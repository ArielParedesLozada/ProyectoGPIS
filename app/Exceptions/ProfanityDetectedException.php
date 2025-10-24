<?php

namespace App\Exceptions;

use Exception;

class ProfanityDetectedException extends Exception
{
    protected $message = 'El contenido contiene palabras inapropiadas y no puede ser publicado.';
    
    protected $code = 422;
    
    protected $detectedWords = [];
    
    public function __construct($detectedWords = [], $message = null, $code = 422, Exception $previous = null)
    {
        $this->detectedWords = $detectedWords;
        
        if ($message === null) {
            $message = $this->message;
        }
        
        parent::__construct($message, $code, $previous);
    }
    
    /**
     * Get the detected profane words
     */
    public function getDetectedWords(): array
    {
        return $this->detectedWords;
    }
    
    /**
     * Get the exception as an array
     */
    public function toArray(): array
    {
        return [
            'message' => $this->getMessage(),
            'detected_words' => $this->detectedWords,
            'code' => $this->getCode(),
        ];
    }
}
