<?php

namespace App\Http\Controllers\Auth;

use App\Enums\GenderType;
use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'cedula' => 'required|string|max:10|min:10|unique:' . User::class,
                'name' => 'required|string|max:255',
                'surname' => 'required|string|max:255',
                'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
                'phone' => 'required|string|max:20|unique:' . User::class,
                'address' => 'required|string|max:500',
                'gender' => 'required|in:' . implode(',', array_column(GenderType::cases(), 'value'),),
                'role' => 'required|in:comprador,vendedor',
            ]);

            $user = User::create([
                'cedula' => $request->cedula,
                'name' => $request->name,
                'surname' => $request->surname,
                'phone' => $request->phone,
                'address' => $request->address,
                'gender' => $request->gender,
                'role' => $request->role,
                'status' => StatusType::HABILITADO->value,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            event(new Registered($user));
            Auth::login($user);
            return redirect()->intended(route('verification.notice', absolute: false));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()
                ->withErrors($e->errors())
                ->withInput();
        } catch (\Throwable $th) {
            return back()
                ->withErrors([
                    'general' => $th->getMessage(),
                    'precise' => $th->getTraceAsString()
                ])
                ->withInput();
        }
    }
}
