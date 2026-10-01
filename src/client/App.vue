<script lang="ts" setup>
import AppFooter from '@components/AppFooter.vue'
import NavBar from '@components/NavBar.vue'
import Notifications from '@components/Notifications.vue'
import AnnouncementBanner from '@components/AnnouncementBanner.vue'
</script>

<template>
  <body class="flex flex-col items-center min-h-screen bg-dark text-light">
    <main class="flex flex-col justify-center w-full align-middle">
      <Notifications />

      <AnnouncementBanner />

      <NavBar />

      <router-view />
    </main>

    <AppFooter />
  </body>
</template>
