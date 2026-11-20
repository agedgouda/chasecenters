<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Statamic\Facades\Entry;

/**
 * sitemap.xml and robots.txt, generated so their URLs follow APP_URL.
 * The static build emits both (see config/statamic/ssg.php).
 */
class SeoController extends Controller
{
    public function sitemap(): Response
    {
        $urls = Entry::query()
            ->where('collection', 'pages')
            ->where('published', true)
            ->get()
            ->filter(fn ($entry) => $entry->uri() !== null)
            ->sortBy(fn ($entry) => $entry->uri() === '/' ? '' : $entry->uri())
            ->map(function ($entry) {
                $xml = '  <url>'."\n".'    <loc>'.e($entry->absoluteUrl()).'</loc>'."\n";

                if ($updated = $entry->get('updated_at')) {
                    $xml .= '    <lastmod>'.date('Y-m-d', (int) $updated).'</lastmod>'."\n";
                }

                return $xml.'  </url>';
            })
            ->implode("\n");

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$urls."\n"
            .'</urlset>'."\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function robots(): Response
    {
        // Only the chasecenters.com build may be indexed; see config/site.php.
        $body = config('site.indexable')
            ? "User-agent: *\nDisallow:\n\nSitemap: ".url('sitemap.xml')."\n"
            : "User-agent: *\nDisallow: /\n";

        return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
