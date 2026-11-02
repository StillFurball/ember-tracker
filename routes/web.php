<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HabitCheckInController;
use App\Http\Controllers\HabitController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::patch('tasks/{task}', [TaskController::class, 'update'])->can('update', 'task')->name('tasks.update');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->can('delete', 'task')->name('tasks.destroy');

    Route::get('habits', [HabitController::class, 'index'])->name('habits.index');
    Route::post('habits', [HabitController::class, 'store'])->name('habits.store');
    Route::patch('habits/{habit}', [HabitController::class, 'update'])->can('update', 'habit')->name('habits.update');
    Route::delete('habits/{habit}', [HabitController::class, 'destroy'])->can('delete', 'habit')->name('habits.destroy');
    Route::post('habits/{habit}/check-ins', [HabitCheckInController::class, 'store'])->can('update', 'habit')->name('habits.check-ins.store');
});

require __DIR__.'/settings.php';
