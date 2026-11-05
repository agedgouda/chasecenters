<?php

namespace App\Console\Commands;

use App\ContentPublishing\Publisher;
use Illuminate\Console\Command;

class UpdateContent extends Command
{
    protected $signature = 'content:update';

    protected $description = 'Pull commits from GitHub without disturbing edits in progress';

    public function handle(Publisher $publisher): int
    {
        if (! $publisher->update()) {
            $this->error('Could not merge remote changes; see the log.');

            return self::FAILURE;
        }

        $this->info('Up to date.');

        return self::SUCCESS;
    }
}
