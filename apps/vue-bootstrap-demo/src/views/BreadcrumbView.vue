<script setup lang="ts">
import { BsBreadcrumb, BsBreadcrumbItem } from '@mintplayer/vue-bootstrap/breadcrumb';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<script setup lang="ts">
import { BsBreadcrumb, BsBreadcrumbItem } from '@mintplayer/vue-bootstrap/breadcrumb';
<\/script>

<template>
  <BsBreadcrumb>
    <BsBreadcrumbItem><RouterLink to="/">Home</RouterLink></BsBreadcrumbItem>
    <BsBreadcrumbItem><RouterLink to="/basic/badge">Basic</RouterLink></BsBreadcrumbItem>
    <BsBreadcrumbItem active>Breadcrumb</BsBreadcrumbItem>
  </BsBreadcrumb>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Breadcrumb</h1>
    <p class="text-body-secondary">
      A <code>&lt;nav&gt;</code> landmark (named by <code>label</code>) around an ordered list. The
      <code>active</code> item is the current page (<code>aria-current="page"</code>).
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsBreadcrumb>
        <BsBreadcrumbItem><RouterLink to="/">Home</RouterLink></BsBreadcrumbItem>
        <BsBreadcrumbItem><RouterLink to="/basic/badge">Basic</RouterLink></BsBreadcrumbItem>
        <BsBreadcrumbItem active>Breadcrumb</BsBreadcrumbItem>
      </BsBreadcrumb>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
