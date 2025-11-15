<?php

namespace App\Http\Requests\Admin;

use App\Enums\GenderType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAdminRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->canManageAdmins();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cedula' => [
                'required',
                'string',
                'max:20',
                'unique:users,cedula',
                'regex:/^[0-9]{10}$/'
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'surname' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email'
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ],
            'phone' => [
                'required',
                'string',
                'max:15',
                'unique:users,phone',
                'regex:/^[0-9]{10}$/'
            ],
            'address' => [
                'required',
                'string',
                'max:500',
                'min:10'
            ],
            'gender' => [
                'required',
                'string',
                Rule::in(array_column(GenderType::cases(), 'value'))
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'cedula.required' => 'La cédula es obligatoria.',
            'cedula.unique' => 'Esta cédula ya está registrada.',
            'cedula.regex' => 'La cédula debe tener exactamente 10 dígitos.',
            'name.required' => 'El nombre es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
            'surname.required' => 'El apellido es obligatorio.',
            'surname.min' => 'El apellido debe tener al menos 2 caracteres.',
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'El correo electrónico debe ser válido.',
            'email.unique' => 'Este correo electrónico ya está registrado.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
            'password.regex' => 'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial.',
            'phone.required' => 'El teléfono es obligatorio.',
            'phone.unique' => 'Este teléfono ya está registrado.',
            'phone.regex' => 'El teléfono debe tener exactamente 10 dígitos.',
            'address.required' => 'La dirección es obligatoria.',
            'address.min' => 'La dirección debe tener al menos 10 caracteres.',
            'gender.required' => 'El género es obligatorio.',
            'gender.in' => 'El género seleccionado no es válido.',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        $errors = $validator->errors();
        
        // Verificar si hay errores de unicidad (cedula, email, phone)
        $duplicateErrors = [];
        
        if ($errors->has('cedula') && str_contains($errors->first('cedula'), 'ya está registrada')) {
            $duplicateErrors[] = 'Esta cédula ya está registrada.';
        }
        
        if ($errors->has('email') && str_contains($errors->first('email'), 'ya está registrado')) {
            $duplicateErrors[] = 'Este correo electrónico ya está registrado.';
        }
        
        if ($errors->has('phone') && str_contains($errors->first('phone'), 'ya está registrado')) {
            $duplicateErrors[] = 'Este teléfono ya está registrado.';
        }
        
        // Si hay errores de duplicados, mostrar como error general
        if (!empty($duplicateErrors)) {
            $errorMessage = implode('<br>', $duplicateErrors);
            throw new \Illuminate\Validation\ValidationException($validator, 
                redirect()->back()->withErrors(['general' => $errorMessage])->withInput()
            );
        }
        
        // Para otros errores, usar el comportamiento por defecto
        parent::failedValidation($validator);
    }
}
