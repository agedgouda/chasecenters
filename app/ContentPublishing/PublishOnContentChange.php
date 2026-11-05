<?php

namespace App\ContentPublishing;

use Illuminate\Support\Facades\Log;
use Statamic\Events\Concerns\ListensForContentEvents;
use Statamic\Events\Subscriber;
use Throwable;

/**
 * Publishes once per request, after the response has gone back to the
 * editor, however many content events a single save fires.
 */
class PublishOnContentChange extends Subscriber
{
    use ListensForContentEvents;

    protected static bool $scheduled = false;

    protected function getListeners()
    {
        return collect($this->events)
            ->mapWithKeys(fn ($event) => [$event => static::class.'@schedule'])
            ->all();
    }

    public function schedule($event): void
    {
        if (! config('content_publishing.enabled') || static::$scheduled) {
            return;
        }

        static::$scheduled = true;

        $user = $event->authenticatedUser ?? null;
        $author = $user ? ['name' => $user->name() ?: $user->email(), 'email' => $user->email()] : null;

        app()->terminating(function () use ($author) {
            static::$scheduled = false;

            try {
                app(Publisher::class)->publish($author);
            } catch (Throwable $e) {
                Log::error('Content publishing failed: '.$e->getMessage());
            }
        });
    }
}
