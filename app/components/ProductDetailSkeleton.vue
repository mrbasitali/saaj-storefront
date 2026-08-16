<template>
  <main class="min-h-screen bg-paper-50 pb-24 lg:pb-0">
    <div class="border-b border-charcoal-950/[0.07] px-5 py-4 sm:px-8 lg:px-12">
      <StorefrontSkeleton class="h-7 w-64" />
    </div>

    <div class="lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.72fr)]">
      <div class="grid grid-cols-1 gap-px bg-charcoal-950/[0.06] sm:grid-cols-2">
        <StorefrontSkeleton
          v-for="n in 4"
          :key="n"
          class="aspect-[4/5] w-full"
        />
      </div>

      <div class="px-5 py-8 sm:px-8 lg:px-10 lg:py-12 xl:px-12">
        <StorefrontSkeleton class="h-3 w-24" />
        <StorefrontSkeleton class="mt-4 h-10 w-4/5" />
        <StorefrontSkeleton class="mt-4 h-5 w-32" />
        <StorefrontSkeleton class="mt-7 h-4 w-full" />
        <StorefrontSkeleton class="mt-2 h-4 w-5/6" />

        <div class="mt-9">
          <StorefrontSkeleton class="h-3 w-20" />
          <div class="mt-3 flex gap-2">
            <StorefrontSkeleton v-for="n in 4" :key="n" class="h-11 w-16" />
          </div>
        </div>

        <div class="mt-8">
          <StorefrontSkeleton class="h-3 w-16" />
          <div class="mt-3 flex gap-2">
            <StorefrontSkeleton v-for="n in 3" :key="n" class="h-11 w-12" />
          </div>
        </div>

        <StorefrontSkeleton class="mt-9 h-[52px] w-full" />
        <StorefrontSkeleton class="mt-3 h-[52px] w-full" />

        <div class="mt-10 space-y-px border-y border-charcoal-950/[0.07]">
          <StorefrontSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
        </div>
      </div>
    </div>
  </main>
</template>
