<?php

namespace App\ContentPublishing;

use Illuminate\Contracts\Process\ProcessResult;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * Keeps the CMS server's content in sync with GitHub: commits Control Panel
 * edits and pushes them, and pulls in commits made elsewhere.
 */
class Publisher
{
    /**
     * Commit any changed content, merge in remote commits, and push.
     *
     * @param  array{name: string, email: string}|null  $author
     */
    public function publish(?array $author = null): bool
    {
        return $this->locked(function () use ($author) {
            $this->git(['add', '-A', '--', ...config('content_publishing.paths')]);

            $changed = $this->lines($this->git(['diff', '--cached', '--name-only']));

            if ($changed) {
                $this->commit($changed, $author ?? config('content_publishing.fallback_author'));
            } elseif (! $this->hasUnpushedCommits()) {
                return true;
            }

            if (! $this->pull()) {
                return false;
            }

            $this->git(['push', $this->remote(), 'HEAD:'.$this->branch()]);

            return true;
        });
    }

    /**
     * Bring in commits pushed from elsewhere (such as code changes).
     */
    public function update(): bool
    {
        return $this->locked(fn () => $this->pull());
    }

    protected function commit(array $changed, array $author): void
    {
        $identity = $author['name'].' <'.$author['email'].'>';

        $message = "Update content from the control panel\n\n"
            .implode("\n", array_map(fn ($file) => "- {$file}", $changed));

        $this->git([
            '-c', 'user.name='.$author['name'],
            '-c', 'user.email='.$author['email'],
            'commit', '--quiet', '--author='.$identity, '-m', $message,
        ]);
    }

    /**
     * Rebase local commits onto the remote branch. If that conflicts, put
     * everything back as it was and leave the commits for a person to sort out.
     */
    protected function pull(): bool
    {
        $before = $this->head();

        $result = $this->git(
            ['pull', '--rebase', '--autostash', '--quiet', $this->remote(), $this->branch()],
            throw: false,
        );

        if ($result->failed()) {
            $this->git(['rebase', '--abort'], throw: false);

            Log::error('Content publishing: could not merge remote changes. Resolve on the server, then save again or run `php artisan content:publish`.', [
                'output' => trim($result->output()."\n".$result->errorOutput()),
            ]);

            return false;
        }

        if ($this->head() !== $before) {
            Artisan::call('statamic:stache:refresh');
        }

        return true;
    }

    protected function hasUnpushedCommits(): bool
    {
        $range = $this->remote().'/'.$this->branch().'..HEAD';

        return (int) trim($this->git(['rev-list', '--count', $range])->output()) > 0;
    }

    protected function head(): string
    {
        return trim($this->git(['rev-parse', 'HEAD'])->output());
    }

    protected function git(array $args, bool $throw = true): ProcessResult
    {
        $result = Process::path(base_path())->timeout(120)->run(['git', ...$args]);

        if ($throw && $result->failed()) {
            throw new RuntimeException('git '.implode(' ', $args).' failed: '.trim($result->errorOutput()));
        }

        return $result;
    }

    protected function lines(ProcessResult $result): array
    {
        return array_values(array_filter(explode("\n", trim($result->output()))));
    }

    /**
     * Run one git operation at a time, even across simultaneous requests.
     */
    protected function locked(callable $callback): bool
    {
        $handle = fopen(storage_path('framework/cache/content-publishing.lock'), 'c');

        try {
            flock($handle, LOCK_EX);

            return $callback();
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    protected function remote(): string
    {
        return config('content_publishing.remote');
    }

    protected function branch(): string
    {
        return config('content_publishing.branch');
    }
}
