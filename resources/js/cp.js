import TenantNumber from './cp/TenantNumber.vue';

Statamic.booting(() => {
    Statamic.$components.register('tenant_number-fieldtype', TenantNumber);
});
