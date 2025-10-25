<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SimpleProfanityService;
use App\Exceptions\ProfanityDetectedException;
use Symfony\Component\HttpFoundation\Response;

class ProfanityMiddleware
{
    protected $profanityService;

    public function __construct(SimpleProfanityService $profanityService)
    {
        $this->profanityService = $profanityService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only validate POST and PUT requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            try {
                // Get all text fields from the request
                $textFields = $this->extractTextFields($request);
                
                // Validate all text fields
                $this->profanityService->validateFields($textFields);
                
            } catch (ProfanityDetectedException $e) {
                // Return error response
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'detected_words' => $e->getDetectedWords(),
                        'error' => 'profanity_detected',
                    ], 422);
                }

                // For web requests, redirect back with error
                return redirect()->back()->withErrors([
                    'content' => $e->getMessage()
                ])->withInput();
            }
        }

        return $next($request);
    }

    /**
     * Extract text fields from the request
     */
    protected function extractTextFields(Request $request): array
    {
        $textFields = [];
        
        // Common text fields to check
        $commonFields = [
            'title', 'description', 'content', 'message', 'comment',
            'name', 'horario', 'address', 'notes', 'reason'
        ];
        
        foreach ($commonFields as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $textFields[$field] = $request->input($field);
            }
        }
        
        return $textFields;
    }
}
