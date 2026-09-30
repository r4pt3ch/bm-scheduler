<template>
  <div class="min-h-screen bg-sand-50 flex flex-col">
    <slot />
  </div>
</template>

<script setup>
// Load jsQR dynamically for camera-based QR/barcode scanning.
// Only loaded when the kiosk layout is active, not on other pages.
// CDN version avoids adding it to the main bundle.
useHead({
  script: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
      async: true
    }
  ]
})
</script>
