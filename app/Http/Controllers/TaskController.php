<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\TaskRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    /**
     * Show a page of the user's tasks, optionally searched by title, filtered by status and sorted by priority or due date.
     * A page left empty, such as by deleting its last task, redirects to the new last page.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'sort' => ['nullable', Rule::in(['priority', 'due_date'])],
        ]);

        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $sort = $filters['sort'] ?? null;

        $tasks = $request->user()->tasks()
            ->when($search, fn ($query) => $query->where('title', 'like', '%'.$search.'%'))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($sort === 'priority', fn ($query) => $query->orderByRaw("case priority when 'high' then 0 when 'medium' then 1 else 2 end"))
            ->when($sort === 'due_date', fn ($query) => $query->orderByRaw('due_date is null')->orderBy('due_date'))
            ->latest('id')
            ->paginate()
            ->withQueryString();

        if ($tasks->isEmpty() && ! $tasks->onFirstPage()) {
            return redirect($tasks->url($tasks->lastPage()));
        }

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'filters' => ['search' => $search, 'status' => $status, 'sort' => $sort],
        ]);
    }

    /**
     * Store a new task for the user.
     */
    public function store(TaskRequest $request): RedirectResponse
    {
        $request->user()->tasks()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task created.')]);

        return back();
    }

    /**
     * Update a task; completing it awards XP and schedules its next occurrence if it repeats, and
     * reopening it takes that XP back. The row lock stops a double-click from completing it twice.
     */
    public function update(TaskRequest $request, Task $task): RedirectResponse
    {
        $nextOccurrence = DB::transaction(function () use ($request, $task) {
            $task = Task::query()->lockForUpdate()->findOrFail($task->id);
            $wasCompleted = $task->status === TaskStatus::Completed;

            $task->update($request->validated());

            $isCompleted = $task->status === TaskStatus::Completed;

            if ($wasCompleted === $isCompleted) {
                return null;
            }

            $request->user()->addXp($isCompleted ? User::XP_PER_COMPLETION : -User::XP_PER_COMPLETION);

            return $isCompleted ? $task->scheduleNextOccurrence() : null;
        });

        if ($nextOccurrence !== null) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Next one scheduled for :date.', ['date' => $nextOccurrence->due_date->format('j M')]),
            ]);
        }

        return back();
    }

    /**
     * Delete a task.
     */
    public function destroy(Task $task): RedirectResponse
    {
        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task deleted.')]);

        return back();
    }
}
