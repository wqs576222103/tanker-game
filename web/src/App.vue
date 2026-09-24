<script setup>
import { onMounted } from "vue";
import { getSocket } from "@/utils/socket";
import InviteBanner from "@/components/InviteBanner.vue";

onMounted(() => {
  getSocket();
});
</script>

<template>
  <router-view :key="$route.path" />
  <InviteBanner />
</template>
