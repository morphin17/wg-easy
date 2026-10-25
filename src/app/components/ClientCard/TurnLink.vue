<template>
  <button
    v-if="globalStore.information?.vkTurnProxyEnabled"
    class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white disabled:cursor-wait disabled:opacity-60 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('client.copyTurnLink')"
    :disabled="loading"
    @click="copyTurnLink"
  >
    <IconsLoading v-if="loading" class="w-5 animate-spin" />
    <IconsCopy v-else class="w-5" />
  </button>
</template>

<script setup lang="ts">
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
      message: $t('copy.notSupported'),
    });
    return;
  }

  loading.value = true;

  try {
    const { url } = await $fetch<{ url: string }>(
      `/api/client/${props.client.id}/turn-link`
    );

    await copy(url);

    if (copied.value) {
      toast.showToast({
        type: 'success',
        message: $t('copy.copied'),
      });
    } else {
      toast.showToast({
        type: 'error',
        message: $t('copy.failed'),
      });
    }
  } catch (e) {
    toast.showToast({
      type: 'error',
      message: e instanceof FetchError ? e.data.message : String(e),
    });
  } finally {
    loading.value = false;
  }
}
</script>
