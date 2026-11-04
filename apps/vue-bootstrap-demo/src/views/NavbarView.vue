<script setup lang="ts">
import {
  BsNavbar,
  BsNavbarItem,
  BsNavbarNav,
} from '@mintplayer/vue-bootstrap/navbar';
import { BsDropdownItem, BsDropdownMenu } from '@mintplayer/vue-bootstrap/dropdown';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Main">
  <template #brand><a href="#">Acme Inc.</a></template>

  <BsNavbarNav>
    <BsNavbarItem active><a href="#">Home</a></BsNavbarItem>
    <BsNavbarItem><a href="#">Pricing</a></BsNavbarItem>

    <BsDropdownMenu label="Products">
      <BsDropdownItem><a href="#">Web components</a></BsDropdownItem>
      <BsDropdownItem><a href="#">Angular bootstrap</a></BsDropdownItem>
      <BsDropdownItem><a href="#">Vue bootstrap</a></BsDropdownItem>
    </BsDropdownMenu>
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
      and <code>BsNavbarItem</code> is an entry in a group. A dropdown is the same
      <code>BsDropdownMenu</code> / <code>BsDropdownItem</code> pair a standalone dropdown uses:
      in a nav group it renders the navbar's disclosure, with <code>label</code> as its trigger text.
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

          <BsDropdownMenu label="Products">
            <BsDropdownItem><a href="#">Web components</a></BsDropdownItem>
            <BsDropdownItem><a href="#">Angular bootstrap</a></BsDropdownItem>
            <BsDropdownItem><a href="#">Vue bootstrap</a></BsDropdownItem>
          </BsDropdownMenu>
        </BsNavbarNav>

        <BsNavbarNav align="end">
          <BsNavbarItem><a href="#">Sign in</a></BsNavbarItem>
        </BsNavbarNav>
      </BsNavbar>

      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
