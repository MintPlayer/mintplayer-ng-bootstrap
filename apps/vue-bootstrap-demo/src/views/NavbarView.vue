<script setup lang="ts">
import {
  BsNavbar,
  BsNavbarItem,
  BsNavbarBrand,
  BsNavbarDropdown,
} from '@mintplayer/vue-bootstrap/navbar';
import { BsDropdownMenu, BsDropdownItem } from '@mintplayer/vue-bootstrap/dropdown-menu';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Main">
  <BsNavbarBrand slot="brand">
    <a href="#">Acme Inc.</a>
  </BsNavbarBrand>

  <BsNavbarItem active><a href="#">Home</a></BsNavbarItem>
  <BsNavbarItem><a href="#">Pricing</a></BsNavbarItem>

  <BsNavbarDropdown>
    <template #label>Products</template>
    <BsDropdownMenu>
      <BsDropdownItem><a href="#">Web components</a></BsDropdownItem>
      <BsDropdownItem><a href="#">Angular wrappers</a></BsDropdownItem>
      <BsDropdownItem><a href="#">Vue wrappers</a></BsDropdownItem>
    </BsDropdownMenu>
  </BsNavbarDropdown>

  <BsNavbarItem slot="end"><a href="#">Sign in</a></BsNavbarItem>
</BsNavbar>`;
</script>

<template>
  <div class="demo-page">
    <h1>Navbar</h1>
    <p class="text-body-secondary">
      A responsive navigation bar. Below its <code>breakpoint</code> the items
      collapse behind a toggle; at/above it they lay out horizontally. The
      brand goes in <code>slot="brand"</code>, right-aligned items in
      <code>slot="end"</code>, everything else is left-aligned.
    </p>

    <section>
      <h2>Navbar</h2>
      <p class="text-body-secondary">
        One item is <code>active</code>, a dropdown labelled <code>Products</code>
        holds a <code>BsDropdownMenu</code>, and a right-aligned <code>Sign in</code>
        item sits at the end. Resize below <code>lg</code> to see it collapse.
      </p>

      <BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Main">
        <BsNavbarBrand slot="brand">
          <a href="#">Acme Inc.</a>
        </BsNavbarBrand>

        <BsNavbarItem active><a href="#">Home</a></BsNavbarItem>
        <BsNavbarItem><a href="#">Pricing</a></BsNavbarItem>

        <BsNavbarDropdown>
          <template #label>Products</template>
          <BsDropdownMenu>
            <BsDropdownItem><a href="#">Web components</a></BsDropdownItem>
            <BsDropdownItem><a href="#">Angular wrappers</a></BsDropdownItem>
            <BsDropdownItem><a href="#">Vue wrappers</a></BsDropdownItem>
          </BsDropdownMenu>
        </BsNavbarDropdown>

        <BsNavbarItem slot="end"><a href="#">Sign in</a></BsNavbarItem>
      </BsNavbar>

      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
