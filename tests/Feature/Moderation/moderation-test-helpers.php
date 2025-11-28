<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\User;

// Incluir helper de incidencias para reutilizar funciones comunes
require_once __DIR__.'/../Incidencias/incident-test-helpers.php';

/**
 * Inicializa los datos de prueba para moderación
 * Retorna un objeto con todas las propiedades necesarias
 */
function setupModerationTestData(): object
{
    $category = Category::factory()->create();

    $vendor = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $moderator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $anotherModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'role' => RoleType::ADMIN->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $superAdmin = User::factory()->create([
        'role' => RoleType::SUPER_ADMIN->value ?? 'super_admin',
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    return (object) [
        'category' => $category,
        'vendor' => $vendor,
        'moderator' => $moderator,
        'anotherModerator' => $anotherModerator,
        'admin' => $admin,
        'superAdmin' => $superAdmin,
    ];
}

function createModerationAction(ModerationCase $case, ?User $moderator, string $actionType, array $metadata = []): ModerationAction
{
    return ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => $moderator?->id,
        'action_type' => $actionType,
        'action_description' => "Acción: {$actionType}",
        'metadata' => $metadata,
    ]);
}

function createModerationAppeal(ModerationCase $case, User $appealer, array $attributes = []): ModerationAppeal
{
    return ModerationAppeal::create(array_merge([
        'moderation_case_id' => $case->id,
        'appealer_id' => $appealer->id,
        'appeal_reason' => 'Solicito revisión de la decisión',
        'review_notes' => null,
        'reviewing_moderator_id' => null,
        'reviewed_at' => null,
    ], $attributes));
}

/**
 * Invoca un método del ModerationController usando reflection
 * Útil para métodos que no tienen rutas definidas
 * 
 * @param string $methodName Nombre del método a invocar
 * @param array $parameters Parámetros para el método (en orden)
 * @param \Illuminate\Http\Request|null $request Request opcional (se crea automáticamente si es null)
 * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
 */
function callModerationMethod(string $methodName, array $parameters = [], ?\Illuminate\Http\Request $request = null)
{
    // Asegurar que Auth::user() esté disponible
    if (!\Illuminate\Support\Facades\Auth::check()) {
        throw new \Exception('Usuario no autenticado. Usa actingAs() antes de llamar a callModerationMethod()');
    }
    
    $controller = new \App\Http\Controllers\ModerationController();
    $reflection = new \ReflectionClass($controller);
    $method = $reflection->getMethod($methodName);
    $method->setAccessible(true);
    
    // Crear request si no se proporciona
    if ($request === null) {
        $request = \Illuminate\Http\Request::create('/', 'GET');
        $request->setUserResolver(fn() => \Illuminate\Support\Facades\Auth::user());
    } else {
        // Asegurar que el request tenga el user resolver
        // Siempre establecer el user resolver para asegurar que Auth::user() funcione
        $request->setUserResolver(fn() => \Illuminate\Support\Facades\Auth::user());
        
        // Asegurar que los datos del request estén disponibles para validación
        // Cuando se crea un Request con Request::create(), los datos del tercer parámetro
        // se asignan automáticamente, pero podemos asegurarnos de que estén disponibles
        if ($request->method() === 'POST' || $request->method() === 'PUT' || $request->method() === 'PATCH') {
            // Asegurar que el Content-Type esté configurado
            if (!$request->headers->has('Content-Type')) {
                $request->headers->set('Content-Type', 'application/json');
            }
            
            // Asegurar que los datos estén disponibles tanto en all() como en input()
            // Esto es necesario para que las validaciones funcionen correctamente
            $requestData = $request->all();
            if (!empty($requestData)) {
                // Los datos ya están en el request, pero asegurémonos de que estén disponibles
                foreach ($requestData as $key => $value) {
                    $request->merge([$key => $value]);
                }
            }
        }
    }
    
    // Obtener parámetros del método
    $methodParams = $method->getParameters();
    $args = [];
    $paramIndex = 0;
    
    foreach ($methodParams as $param) {
        $paramType = $param->getType();
        $paramName = $param->getName();
        
        // Si es Request, usar el request proporcionado o creado
        if ($paramType && (
            $paramType->getName() === 'Illuminate\Http\Request' || 
            (class_exists($paramType->getName()) && is_subclass_of($paramType->getName(), 'Illuminate\Http\Request'))
        )) {
            $args[] = $request;
            // No incrementar paramIndex porque Request no viene de $parameters
        } 
        // Si es un ID o parámetro de ruta, usar los parámetros proporcionados
        elseif (in_array($paramName, ['id', 'caseId', 'moderatorId']) || $paramIndex < count($parameters)) {
            if ($paramIndex < count($parameters)) {
                $args[] = $parameters[$paramIndex];
            } else {
                // Si no hay más parámetros pero el nombre sugiere que es un ID, usar null
                $args[] = null;
            }
            $paramIndex++;
        } 
        // Valor por defecto si existe
        elseif ($param->isDefaultValueAvailable()) {
            $args[] = $param->getDefaultValue();
        } 
        else {
            $args[] = null;
        }
    }
    
    try {
        $result = $method->invokeArgs($controller, $args);
        
        // Si el resultado es una respuesta JSON, asegurarse de que esté correctamente formateada
        if ($result instanceof \Illuminate\Http\JsonResponse) {
            return $result;
        }
        
        // Si es una respuesta HTTP normal, devolverla tal cual
        if ($result instanceof \Illuminate\Http\Response) {
            return $result;
        }
        
        // Si es cualquier otra cosa, intentar convertirla a JSON
        return response()->json($result);
    } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
        // Si es una excepción de acceso denegado (abort(403)), crear una respuesta JSON
        $message = $e->getMessage();
        if (empty($message)) {
            $message = 'No tienes permisos para acceder a esta sección';
        }
        return \Illuminate\Support\Facades\Response::json([
            'success' => false,
            'message' => $message
        ], 403);
    } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
        // Si es una excepción HTTP (como abort(404, 500, etc)), crear una respuesta JSON
        // Nota: AccessDeniedHttpException extiende de HttpException, pero ya la capturamos arriba
        return \Illuminate\Support\Facades\Response::json([
            'success' => false,
            'message' => $e->getMessage() ?: 'Error HTTP'
        ], $e->getStatusCode());
    } catch (\Illuminate\Validation\ValidationException $e) {
        // Si es una excepción de validación, devolver los errores
        $errors = $e->errors();
        $firstError = !empty($errors) ? reset($errors)[0] : 'Error de validación';
        return \Illuminate\Support\Facades\Response::json([
            'success' => false,
            'message' => $firstError,
            'errors' => $errors
        ], 422);
    } catch (\Exception $e) {
        // Capturar cualquier otra excepción y convertirla en respuesta JSON
        return \Illuminate\Support\Facades\Response::json([
            'success' => false,
            'message' => $e->getMessage() ?: 'Error interno del servidor'
        ], 500);
    }
}

