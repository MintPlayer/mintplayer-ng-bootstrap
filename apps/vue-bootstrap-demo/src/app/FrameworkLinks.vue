<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';

type Framework = 'angular' | 'react' | 'vue';

const PROD_HOSTS: Record<Framework, string> = {
  angular: 'https://bootstrap.mintplayer.com',
  react: 'https://react.bootstrap.mintplayer.com',
  vue: 'https://vue.bootstrap.mintplayer.com',
};

const DEV_HOSTS: Record<Framework, string> = {
  angular: 'http://localhost:4200',
  react: 'http://localhost:4201',
  vue: 'http://localhost:4202',
};

function originFor(framework: Framework): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return DEV_HOSTS[framework];
  }
  return PROD_HOSTS[framework];
}

const ACTIVE: Framework = 'vue';
const route = useRoute();

const angularHref = computed(() => `${originFor('angular')}${route.fullPath}`);
const reactHref = computed(() => `${originFor('react')}${route.fullPath}`);
const vueHref = computed(() => `${originFor('vue')}${route.fullPath}`);
</script>

<template>
  <nav class="framework-nav" aria-label="Switch demo framework">
    <a :href="angularHref" title="Angular demo" aria-label="Open the same page in the Angular demo" :class="{ active: ACTIVE === 'angular' }">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 2L3 6.5l2 17L16 30l11-6.5 2-17L16 2z" fill="#DD0031" />
        <path d="M16 2v28l11-6.5 2-17L16 2z" fill="#C3002F" />
        <path d="M16 6l-7.5 16.5h2.8L13 19h6l1.7 3.5h2.8L16 6zm-2.2 10.7L16 11.4l2.2 5.3h-4.4z" fill="#FFF" />
      </svg>
    </a>
    <a :href="reactHref" title="React demo" aria-label="Open the same page in the React demo" :class="{ active: (ACTIVE as string) === 'react' }">
      <svg viewBox="-11.5 -10.23174 23 20.46348" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle r="2.05" fill="#61DAFB" />
        <g stroke="#61DAFB" stroke-width="1" fill="none">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    </a>
    <a :href="vueHref" title="Vue demo" aria-label="Open the same page in the Vue demo" :class="{ active: ACTIVE === 'vue' }">
      <svg viewBox="0 0 261.76 226.69" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M161.096.001l-30.225 52.351L100.647.001H-.005L130.871 226.69 261.749.001z" fill="#41B883" />
        <path d="M161.096.001l-30.225 52.351L100.647.001H52.346l78.526 136.01L209.398.001z" fill="#34495E" />
      </svg>
    </a>
  </nav>
</template>
