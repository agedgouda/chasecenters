<?php

use Illuminate\Support\Facades\Route;

// Route::statamic('example', 'example-view', [
//    'title' => 'Example'
// ]);

// The static build requests these under the APP_URL path (e.g. /chasecenters/404).
$base = ltrim(trim((string) parse_url(config('app.url'), PHP_URL_PATH), '/').'/', '/');

// Rendered as a normal page so the static build can emit it as 404.html.
Route::get($base.'404', fn () => (new \Statamic\View\View)
    ->template('errors.404')
    ->layout('layout')
    ->with(['title' => 'Page Not Found']));

Route::get($base.'sitemap.xml', [\App\Http\Controllers\SeoController::class, 'sitemap']);
Route::get($base.'robots.txt', [\App\Http\Controllers\SeoController::class, 'robots']);
