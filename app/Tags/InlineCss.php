<?php

namespace App\Tags;

use Statamic\Tags\Tags;

/**
 * Inlines a stylesheet from public/ so it doesn't block rendering:
 * {{ inline_css src="/theme/chase/theme.css" id="chase-theme-css" }}
 *
 * Relative url(...) references are rewritten to absolute paths (including
 * the APP_URL path, e.g. /chasecenters on a GitHub project page), since
 * they no longer resolve against the stylesheet's own folder.
 */
class InlineCss extends Tags
{
    public function index(): string
    {
        $src = '/'.ltrim((string) $this->params->get('src'), '/');
        $file = public_path(ltrim($src, '/'));

        if (! is_file($file)) {
            return '';
        }

        $base = rtrim((string) parse_url((string) config('app.url'), PHP_URL_PATH), '/');
        $dir = dirname($src);

        $css = preg_replace_callback('/url\(\s*([\'"]?)([^\'")]+)\1\s*\)/', function ($m) use ($base, $dir) {
            $url = $m[2];

            if (preg_match('#^(data:|https?:|//|/|\#)#i', $url)) {
                return $m[0];
            }

            return 'url('.$m[1].$base.$this->resolve($dir, $url).$m[1].')';
        }, file_get_contents($file));

        $id = $this->params->get('id');

        return '<style'.($id ? ' id="'.e($id).'"' : '').'>'.$css.'</style>';
    }

    /**
     * Resolve a relative path such as ../kose/images/dot.gif against a directory.
     */
    protected function resolve(string $dir, string $relative): string
    {
        $parts = explode('/', trim($dir, '/'));

        foreach (explode('/', $relative) as $segment) {
            if ($segment === '..') {
                array_pop($parts);
            } elseif ($segment !== '.' && $segment !== '') {
                $parts[] = $segment;
            }
        }

        return '/'.implode('/', $parts);
    }
}
