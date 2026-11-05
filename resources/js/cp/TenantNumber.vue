<script setup>
import { onMounted } from 'vue';
import { Fieldtype } from '@statamic/cms';
import { Input, injectPublishContext } from '@statamic/cms/ui';

const emit = defineEmits(Fieldtype.emits);
const props = defineProps(Fieldtype.props);
const { expose, update, isReadOnly } = Fieldtype.use(emit, props);
defineExpose(expose);

const { values } = injectPublishContext();

function highestNumber() {
    let highest = 0;

    for (const column of values.value.tenant_columns ?? []) {
        for (const tenant of column.tenants ?? []) {
            highest = Math.max(highest, Number(tenant.number) || 0);
        }
    }

    return highest;
}

// A newly added tenant row arrives empty: number it after the last one.
onMounted(() => {
    if (props.value === null || props.value === undefined || props.value === '') {
        update(highestNumber() + 1);
    }
});

function changed(value) {
    update(value === '' || value === null ? null : Number(value));
}
</script>

<template>
    <Input type="number" min="1" :model-value="value" :read-only="isReadOnly" @update:model-value="changed" />
</template>
