<script setup lang="ts">
// The address is only assembled in the browser, so simple spam bots
// scraping the HTML don't find it.
import { ref, onMounted } from 'vue';
const props = defineProps<{ user: string; domain: string }>();
const address = ref('');
onMounted(() => { address.value = `${props.user}@${props.domain}`; });
</script>

<template>
  <a v-if="address" :href="`mailto:${address}`">{{ address }}</a>
  <span v-else>{{ user }} [at] {{ domain }}</span>
</template>
