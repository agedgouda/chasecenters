<?php

namespace App\Fieldtypes;

use Statamic\Fieldtypes\Integer;

/**
 * A tenant's number in the site plan directory. New tenants start at one
 * more than the highest number on the page (see resources/js/cp/TenantNumber.vue).
 */
class TenantNumber extends Integer
{
    protected $selectable = false;
}
