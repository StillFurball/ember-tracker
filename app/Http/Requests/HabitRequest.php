<?php

namespace App\Http\Requests;

use App\Enums\HabitFrequency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HabitRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'frequency' => ['required', Rule::enum(HabitFrequency::class)],
            'target_count' => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }
}
