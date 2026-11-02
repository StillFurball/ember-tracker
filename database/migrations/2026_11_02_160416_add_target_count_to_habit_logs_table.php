<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('habit_logs', function (Blueprint $table) {
            $table->unsignedTinyInteger('target_count')->default(1)->after('completed_at');
        });

        DB::table('habit_logs')->update([
            'target_count' => DB::raw('(select habits.target_count from habits where habits.id = habit_logs.habit_id)'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('habit_logs', function (Blueprint $table) {
            $table->dropColumn('target_count');
        });
    }
};
