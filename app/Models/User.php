<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property int $current_xp
 * @property int $level
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * XP awarded for completing a task or a habit check-in.
     */
    public const XP_PER_COMPLETION = 50;

    /**
     * XP needed per level (mirrored in resources/js/components/level-progress.tsx).
     */
    public const XP_PER_LEVEL = 500;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'current_xp' => 'integer',
            'level' => 'integer',
        ];
    }

    /**
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * @return HasMany<Habit, $this>
     */
    public function habits(): HasMany
    {
        return $this->hasMany(Habit::class);
    }

    /**
     * Add XP (or remove it, when negative, never below zero) and recalculate the level.
     * Works from the stored total under a row lock, so overlapping requests can't overwrite each other.
     */
    public function addXp(int $amount): void
    {
        DB::transaction(function () use ($amount) {
            $storedUser = self::query()->lockForUpdate()->findOrFail($this->id);
            $storedUser->current_xp = max(0, $storedUser->current_xp + $amount);
            $storedUser->level = intdiv($storedUser->current_xp, self::XP_PER_LEVEL) + 1;
            $storedUser->save();

            $this->setRawAttributes($storedUser->getAttributes(), sync: true);
        });
    }
}
