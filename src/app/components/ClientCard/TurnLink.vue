<template>
  <button
    v-if="globalStore.information?.vkTurnProxyEnabled"
    class="icon-button disabled:cursor-wait disabled:opacity-60"
    :title="$t('clients.configuration.copyTurnLink')"
    :aria-label="$t('clients.configuration.copyTurnLink')"
    :disabled="loading"
    @click="copyTurnLink"
  >
    <LoaderCircleIcon v-if="loading" class="size-4 animate-spin" />
    <ClipboardCopyIcon v-else class="size-4" />
  </button>
</template>

<script setup lang="ts">
import { ClipboardCopyIcon, LoaderCircleIcon } from '@lucide/vue';
import { FetchError } from 'ofetch';

import { $fetch } from '#imports';

const props = defineProps<{
  client: LocalClient;
}>();

const globalStore = useGlobalStore();

const toast = useToast();

const { copied, copy, isSupported } = useClipboard({
  // fallback does not work
  legacy: false,
});

const loading = ref(false);

async function copyTurnLink() {
  if (!isSupported.value) {
    toast.showToast({
      type: 'error',
      message: $t('common.clipboard.notSupported'),
    });
    return;
  }

  loading.value = true;

  try {
    const { url } = await $fetch<{ url: string }>(
      `/api/client/${props.client.id}/turn-link`
    );

    await copy(url);

    toast.showToast({
      type: copied.value ? 'success' : 'error',
      message: $t(
        copied.value ? 'common.clipboard.copied' : 'common.clipboard.failed'
      ),
    });
  } catch (e) {
    toast.showToast({
      type: 'error',
      message:
        e instanceof FetchError
          ? (e.data?.message ?? e.message)
          : e instanceof Error
            ? e.message
            : String(e),
    });
  } finally {
    loading.value = false;
  }
}
</script>
