<?php

namespace App\Http\Controllers\Utils;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ResponseController extends Controller
{
    public static function envelopResponse($data)
    {
        return response()->json([
            'success' => true,
            'data' => $data
        ], 200);
    }

    public  static function envelopError(\Throwable $error)
    {
        return response()->json([
            'success' => false,
            'error' => $error->getMessage(),
            'message' => $error->getTraceAsString()
        ], $error->getCode());
    }
}
