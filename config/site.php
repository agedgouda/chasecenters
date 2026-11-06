<?php

// Only the build served at the real domain may be indexed by search engines.
// Other copies (github.io, the CMS server, local) stay out of search results.
// SITE_INDEXABLE=true/false overrides this.

$host = parse_url((string) env('APP_URL'), PHP_URL_HOST);

return [

    'indexable' => (bool) env('SITE_INDEXABLE', in_array($host, ['chasecenters.com', 'www.chasecenters.com'], true)),

];
