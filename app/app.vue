<template>
  <div class="app">
    <NuxtPage />
  </div>
</template>

<style lang="scss">
.app {
  width: 100%;
  max-width: var(--layout-max);
  padding: var(--sp-5) var(--sp-4) var(--sp-7);
  margin-inline: auto;

  @include media-up($bp-md) {
    padding-top: var(--sp-6);
  }
}
</style>
