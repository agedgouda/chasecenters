import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import statamic from '@statamic/cms/vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/site.css', 'resources/js/site.js', 'resources/js/cp.js'],
            refresh: true,
        }),
        tailwindcss(),
        statamic(),
    ],
    server: {
        watch: {
            ignored: [
                '**/storage/framework/views/**',
                '**/storage/statamic/**',
            ],
        },
    },
});
