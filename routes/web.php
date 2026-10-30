<?php

use Illuminate\Support\Facades\Route;

// Route::statamic('example', 'example-view', [
//    'title' => 'Example'
// ]);

// Rendered as a normal page so the static build can emit it as 404.html.
// The static build requests it under the APP_URL path (e.g. /chasecenters/404).
Route::get(ltrim(trim((string) parse_url(config('app.url'), PHP_URL_PATH), '/').'/404', '/'), fn () => (new \Statamic\View\View)
    ->template('errors.404')
    ->layout('layout')
    ->with(['title' => 'Page Not Found']));
