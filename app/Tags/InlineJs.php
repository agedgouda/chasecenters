<?php

namespace App\Tags;

use Statamic\Tags\Tags;

/**
 * Inlines a script from public/ to save a request:
 * {{ inline_js src="/theme/chase/site.js" id="chase-site-js" }}
 */
class InlineJs extends Tags
{
    public function index(): string
    {
        $file = public_path(ltrim((string) $this->params->get('src'), '/'));

        if (! is_file($file)) {
            return '';
        }

        $id = $this->params->get('id');

        return '<script'.($id ? ' id="'.e($id).'"' : '').'>'.file_get_contents($file).'</script>';
    }
}
