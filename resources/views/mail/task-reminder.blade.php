<x-mail::message>
# Good morning, {{ $user->name }}

Here's what's on today:

@foreach ($tasks as $task)
- **{{ $task->title }}**, @if ($task->start_time) starts at {{ substr($task->start_time, 0, 5) }} @elseif ($task->end_time) due by {{ substr($task->end_time, 0, 5) }} @else due today @endif ({{ ucfirst($task->priority->value) }} priority)
@endforeach

<x-mail::button :url="route('tasks.index', ['status' => 'pending'])">
View tasks
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
