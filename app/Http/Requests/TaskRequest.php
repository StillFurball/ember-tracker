<?php

namespace App\Http\Requests;

use App\Enums\TaskPriority;
use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     * Creating requires title, type, priority and date; updating accepts any subset (e.g. only status).
     * An activity also needs a start and end time; an assignment's date is its deadline,
     * optionally with a time of day stored in end_time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isCreating = $this->isMethod('post');
        $isAssignment = $this->input('type') === TaskType::Assignment->value;

        return [
            'title' => [$isCreating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => [$isCreating ? 'required' : 'sometimes', Rule::enum(TaskType::class)],
            'priority' => [$isCreating ? 'required' : 'sometimes', Rule::enum(TaskPriority::class)],
            'status' => [$isCreating ? 'prohibited' : 'sometimes', Rule::enum(TaskStatus::class)],
            'recurrence' => ['sometimes', Rule::enum(TaskRecurrence::class)],
            'due_date' => [$isCreating ? 'required' : 'sometimes', 'date'],
            'start_time' => ['nullable', 'date_format:H:i', 'required_if:type,activity', Rule::requiredIf(! $isAssignment && $this->filled('end_time'))],
            'end_time' => ['nullable', 'date_format:H:i', 'required_if:type,activity', 'required_with:start_time', 'after:start_time'],
        ];
    }

    /**
     * An assignment has no start, so any start time sent with it is cleared.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('type') === TaskType::Assignment->value) {
            $this->merge(['start_time' => null]);
        }
    }
}
