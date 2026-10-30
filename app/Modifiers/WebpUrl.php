<?php

namespace App\Modifiers;

use Illuminate\Support\Facades\Storage;
use Statamic\Contracts\Assets\Asset as AssetContract;
use Statamic\Facades\Asset;
use Statamic\Modifiers\Modifier;

/**
 * Returns the URL of an image's ".webp" sibling when one exists and is
 * smaller, otherwise the image's own URL.
 *
 * Usage inside an assets loop: {{ id | webp_url }}
 */
class WebpUrl extends Modifier
{
    public function index($value)
    {
        $asset = $value instanceof AssetContract ? $value : Asset::find((string) $value);

        if (! $asset) {
            return '';
        }

        $disk = Storage::disk($asset->container()->diskHandle());

        return $disk->url(static::path($disk, $asset->path()));
    }

    /**
     * The path to serve for an image: its WebP sibling if that is smaller.
     */
    public static function path($disk, string $path): string
    {
        $webp = preg_replace('/\.(jpe?g|png)$/i', '.webp', $path);

        if ($webp !== $path && $disk->exists($webp) && $disk->size($webp) < $disk->size($path)) {
            return $webp;
        }

        return $path;
    }
}
