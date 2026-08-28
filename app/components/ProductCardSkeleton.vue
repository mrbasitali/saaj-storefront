<template>
  <article class="min-w-0" aria-hidden="true">
    <div class="relative aspect-[4/5] w-full overflow-hidden bg-mist-100">
      <StorefrontSkeleton class="absolute inset-0 h-full w-full" />
      <StorefrontSkeleton class="absolute left-3 top-3 h-6 w-14 rounded-full opacity-60" />
    </div>

    <div class="pt-3.5 sm:pt-4">
      <StorefrontSkeleton class="h-2 w-[22%]" />
      <div class="mt-2 flex items-center justify-between gap-3">
        <StorefrontSkeleton class="h-3.5 w-[68%]" />
        <StorefrontSkeleton class="hidden h-3.5 w-3.5 shrink-0 lg:block" />
      </div>
      <StorefrontSkeleton class="mt-2.5 h-3 w-[32%]" />
    </div>
  </article>
</template>
