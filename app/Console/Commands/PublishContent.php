<?php

namespace App\Console\Commands;

use App\ContentPublishing\Publisher;
use Illuminate\Console\Command;

class PublishContent extends Command
{
    protected $signature = 'content:publish';

    protected $description = 'Commit and push content edits made on this server';

    public function handle(Publisher $publisher): int
    {
        if (! $publisher->publish()) {
            $this->error('Could not merge remote changes; see the log.');

            return self::FAILURE;
        }

        $this->info('Content is published.');

        return self::SUCCESS;
    }
}
