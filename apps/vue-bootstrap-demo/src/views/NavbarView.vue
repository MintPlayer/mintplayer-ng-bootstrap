<script setup lang="ts">
import {
  BsNavbar,
  BsNavbarDropdown,
  BsNavbarItem,
  BsNavbarNav,
} from '@mintplayer/vue-bootstrap/navbar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Main">
  <template #brand><a href="#">Acme Inc.</a></template>

  <BsNavbarNav>
    <BsNavbarItem active><a href="#">Home</a></BsNavbarItem>
    <BsNavbarItem><a href="#">Pricing</a></BsNavbarItem>

    <BsNavbarDropdown label="Products">
      <BsNavbarItem><a href="#">Web components</a></BsNavbarItem>
      <BsNavbarItem><a href="#">Angular bootstrap</a></BsNavbarItem>
      <BsNavbarItem><a href="#">Vue bootstrap</a></BsNavbarItem>
    </BsNavbarDropdown>
  </BsNavbarNav>

  <BsNavbarNav align="end">
    <BsNavbarItem><a href="#">Sign in</a></BsNavbarItem>
  </BsNavbarNav>
</BsNavbar>`;
</script>

<template>
  <div class="demo-page">
    <h1>Navbar</h1>
    <p class="text-body-secondary">
      <code>BsNavbar</code> renders Bootstrap's navbar markup from the headless
      <code>@mintplayer/ui-core/navbar</code> core, server-side included. Below its
      <code>breakpoint</code> the entries collapse behind a checkbox toggle and every
      dropdown is a native <code>&lt;details&gt;</code>, so the bar works with JavaScript
      off. The brand goes in the <code>#brand</code> slot, entries are grouped in a
      <code>BsNavbarNav</code> (<code>align="end"</code> pushes a group to the far edge),
      and <code>BsNavbarItem</code> is every entry — a nav-link in a group, a menu item
      inside a <code>BsNavbarDropdown</code>.
    </p>

    <section>
      <h2>Navbar</h2>
      <p class="text-body-secondary">
        One item is <code>active</code>, a dropdown labelled <code>Products</code> holds
        three links, and a right-aligned <code>Sign in</code> group sits at the end. Resize
        below <code>lg</code> to see it collapse.
      </p>

      <BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Main">
        <template #brand><a href="#">Acme Inc.</a></template>

        <BsNavbarNav>
          <BsNavbarItem active><a href="#">Home</a></BsNavbarItem>
          <BsNavbarItem><a href="#">Pricing</a></BsNavbarItem>

          <BsNavbarDropdown label="Products">
            <BsNavbarItem><a href="#">Web components</a></BsNavbarItem>
            <BsNavbarItem><a href="#">Angular bootstrap</a></BsNavbarItem>
            <BsNavbarItem><a href="#">Vue bootstrap</a></BsNavbarItem>
          </BsNavbarDropdown>
        </BsNavbarNav>

        <BsNavbarNav align="end">
          <BsNavbarItem><a href="#">Sign in</a></BsNavbarItem>
        </BsNavbarNav>
      </BsNavbar>

      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
