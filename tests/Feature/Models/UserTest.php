<?php

use App\Models\User;

test('adding XP builds on the stored total, not on a stale copy of the user', function () {
    $user = User::factory()->create();
    $staleCopy = User::find($user->id);

    $user->addXp(User::XP_PER_LEVEL - User::XP_PER_COMPLETION);
    $staleCopy->addXp(User::XP_PER_COMPLETION);

    expect($user->refresh()->current_xp)->toBe(User::XP_PER_LEVEL)
        ->and($user->level)->toBe(2)
        ->and($staleCopy->current_xp)->toBe(User::XP_PER_LEVEL);
});

test('adding XP is saved even when the new total and level match a stale copy of the user', function () {
    $user = User::factory()->create(['current_xp' => User::XP_PER_LEVEL, 'level' => 2]);
    $staleCopy = User::find($user->id);

    $user->addXp(-User::XP_PER_COMPLETION);
    $staleCopy->addXp(User::XP_PER_COMPLETION);

    expect($user->refresh()->current_xp)->toBe(User::XP_PER_LEVEL)
        ->and($user->level)->toBe(2);
});
