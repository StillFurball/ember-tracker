<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('recurrence')->default('none')->after('status');
            $table->foreignId('previous_task_id')->nullable()->unique()->after('recurrence')->constrained('tasks')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['previous_task_id']);
            $table->dropUnique(['previous_task_id']);
            $table->dropColumn(['previous_task_id', 'recurrence']);
        });
    }
};
