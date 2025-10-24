<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Exceptions\ProfanityDetectedException;
use Illuminate\Support\Facades\Log;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e): Response
    {
        // Handle ProfanityDetectedException
        if ($e instanceof ProfanityDetectedException) {
            return $this->handleProfanityException($request, $e);
        }

        return parent::render($request, $e);
    }

    /**
     * Handle ProfanityDetectedException
     */
    protected function handleProfanityException(Request $request, ProfanityDetectedException $e): Response
    {
        // Log the profanity detection
        Log::warning('Profanity detected in request', [
            'url' => $request->url(),
            'method' => $request->method(),
            'user_id' => auth()->id(),
            'detected_words' => $e->getDetectedWords(),
            'message' => $e->getMessage(),
        ]);

        // Return appropriate response based on request type
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $e->getMessage(),
                'detected_words' => $e->getDetectedWords(),
                'error' => 'profanity_detected',
            ], $e->getCode());
        }

        // For web requests, redirect back with error
        return redirect()->back()->withErrors([
            'content' => $e->getMessage()
        ])->withInput();
    }
}
