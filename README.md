# Ember

A task and habit tracker that turns daily follow-through into streaks, XP and levels.

## Features

- **Tasks:** activities with start and end times, or assignments with deadlines. Tasks have priorities and can repeat daily, weekly or monthly, and you can search, filter and sort them.
- **Habits:** daily or weekly targets with check-ins, a 28-day history and a streak flame that changes colour as the streak grows.
- **Dashboard:** a weekly calendar, upcoming deadlines, today's habits and your weekly check-in count.
- **XP and levels:** every completed task or habit check-in earns 50 XP, with a confetti burst to mark it.
- **Reminders:** a daily email at 08:00 lists the tasks due that day.
- **Accounts:** sign-up, login and security settings, with light and dark themes.

## Tech stack

- Laravel 13 with Fortify for authentication
- Inertia 3 and React 19 with TypeScript
- Tailwind CSS 4 and shadcn/ui components
- Wayfinder for typed routes
- Pest for tests

## Getting started

You need PHP 8.3 or newer, Composer and Node.js.

```bash
git clone https://github.com/StillFurball/ember-tracker.git
cd ember-tracker
composer setup
composer dev
```

`composer setup` installs dependencies, creates `.env`, generates the app key, runs the migrations and builds the frontend. `composer dev` starts the development processes. The app runs at <http://localhost:8000>.

By default the app uses SQLite, and emails are written to the log instead of being sent. To change the database or mail settings, edit `.env`. To show the app's name in the browser tab, set `APP_NAME=Ember` there too.

### Daily reminders

The reminder email only goes out if Laravel's scheduler is running, so keep this running alongside the app:

```bash
php artisan schedule:work
```

In production, run `php artisan schedule:run` every minute from cron instead.

## Tests and checks

```bash
php artisan test     # run the test suite
composer ci:check    # frontend checks, type checks and tests
```

Tests use an in-memory SQLite database, so they don't touch your development data.
