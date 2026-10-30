<?php

namespace App\Modifiers;

use Illuminate\Support\Facades\Storage;
use Statamic\Contracts\Assets\Asset as AssetContract;
use Statamic\Facades\Asset;
use Statamic\Modifiers\Modifier;

/**
 * Builds a WordPress-style srcset from the resized copies ("name-WxH.ext")
 * stored alongside an image, so pages pick the same files the old site did.
 *
 * Usage inside an assets loop: {{ id | wp_srcset }}, or {{ id | wp_srcset:webp }}
 * to list each size's smaller WebP copy where one exists.
 */
class WpSrcset extends Modifier
{
    public function index($value, $params = [])
    {
        $asset = $value instanceof AssetContract ? $value : Asset::find((string) $value);

        if (! $asset || ! $asset->isImage()) {
            return '';
        }

        $disk = Storage::disk($asset->container()->diskHandle());
        $dir = dirname($asset->path());
        $ext = $asset->extension();
        $base = preg_replace('/-\d+x\d+$/', '', pathinfo($asset->path(), PATHINFO_FILENAME));
        $pattern = '/^'.preg_quote($base, '/').'(?:-(\d+)x(\d+))?\.'.preg_quote($ext, '/').'$/';
        $ratio = $asset->width() / $asset->height();

        // The asset itself comes first so it wins when two files share a width.
        $files = collect($disk->files($dir === '.' ? '' : $dir))
            ->sortBy(fn ($file) => $file === $asset->path() ? 0 : 1);

        $candidates = [];

        foreach ($files as $file) {
            if (! preg_match($pattern, basename($file), $m)) {
                continue;
            }

            [$width, $height] = isset($m[1]) ? [(int) $m[1], (int) $m[2]] : getimagesize($disk->path($file));

            if (isset($candidates[$width]) || abs($width / $height - $ratio) > 0.01) {
                continue;
            }

            $candidates[$width] = $disk->url(($params[0] ?? null) === 'webp' ? WebpUrl::path($disk, $file) : $file).' '.$width.'w';
        }

        return count($candidates) > 1 ? implode(', ', $candidates) : '';
    }
}
