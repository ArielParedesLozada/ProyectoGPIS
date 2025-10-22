<?php

namespace App\Http\Controllers\Concerns;

trait HandlesMiddleware
{
    /**
     * Register middleware for the controller.
     */
    public function middleware($middleware, $options = [])
    {
        if (is_string($middleware)) {
            $middleware = [$middleware];
        }

        foreach ($middleware as $m) {
            $this->middleware[] = $m;
        }

        return $this;
    }
}
