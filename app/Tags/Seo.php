<?php

namespace App\Tags;

use Statamic\Facades\Entry;
use Statamic\Facades\GlobalSet;
use Statamic\Facades\URL;
use Statamic\Tags\Tags;

/**
 * Search and social metadata for the current page.
 *
 * {{ seo:image }}   absolute URL of the page's first slide, for og:image
 * {{ seo:json_ld }} structured data: the company on the home page, and a
 *                   ShoppingCenter on each property page
 */
class Seo extends Tags
{
    public function image(): string
    {
        $entry = $this->entry();
        $slide = $entry?->augmentedValue('slides')->value()?->get()->first();

        return $slide ? URL::makeAbsolute($slide->url()) : '';
    }

    public function jsonLd(): string
    {
        $entry = $this->entry();

        if (! $entry) {
            return '';
        }

        if ($entry->uri() === '/') {
            $data = $this->organization() + ['url' => $entry->absoluteUrl()];
        } elseif ($place = $entry->get('map_query')) {
            $data = array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'ShoppingCenter',
                'name' => $entry->get('title'),
                'url' => $entry->absoluteUrl(),
                'address' => html_entity_decode($place, ENT_QUOTES | ENT_HTML5),
                'image' => $this->image() ?: null,
                'description' => $entry->get('description') ?? $entry->get('intro'),
                'parentOrganization' => ['@type' => 'Organization', 'name' => 'Chase Centers'],
            ]);
        } else {
            return '';
        }

        $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);

        return '<script type="application/ld+json">'.$json.'</script>';
    }

    protected function organization(): array
    {
        $company = GlobalSet::findByHandle('company')?->inDefaultSite();
        $lines = (array) $company?->get('address');

        $address = ['@type' => 'PostalAddress'];

        // The last line reads "City, ST 12345"; the ones above it are the street.
        if (preg_match('/^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/', (string) end($lines), $m)) {
            array_pop($lines);
            $address += ['addressLocality' => $m[1], 'addressRegion' => $m[2], 'postalCode' => $m[3]];
        }

        $address = ['streetAddress' => implode(', ', $lines)] + $address + ['addressCountry' => 'US'];

        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => 'Chase Centers',
            'logo' => URL::makeAbsolute(URL::prependSiteUrl('/assets/2014/06/chasecenterlogowhitefont-1.svg')),
            'telephone' => $company?->get('phone'),
            'email' => $company?->get('email'),
            'address' => ['@type' => 'PostalAddress'] + $address,
        ]);
    }

    protected function entry()
    {
        $id = $this->context->value('id');

        return $id ? Entry::find($id) : null;
    }
}
