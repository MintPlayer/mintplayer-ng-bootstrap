<script setup lang="ts">
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { DatatableColumnDef } from '@mintplayer/web-components/datatable';

interface Artist {
  id: number;
  name: string;
  genre: string;
  founded: number;
}

const COLUMNS: DatatableColumnDef[] = [
  { name: 'name',    label: 'Name',    sortable: true },
  { name: 'genre',   label: 'Genre',   sortable: true },
  { name: 'founded', label: 'Founded', sortable: true },
];

const ARTISTS: Artist[] = [
  { id: 1, name: 'Radiohead',     genre: 'Alternative', founded: 1985 },
  { id: 2, name: 'Daft Punk',     genre: 'Electronic',  founded: 1993 },
  { id: 3, name: 'Tame Impala',   genre: 'Psychedelic', founded: 2007 },
  { id: 4, name: 'Pink Floyd',    genre: 'Progressive', founded: 1965 },
];

const SOURCE = `<BsDatatable :columns="COLUMNS" :data="ARTISTS" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Datatable</h1>

    <section>
      <h2>Simple in-memory table</h2>
      <BsDatatable :columns="COLUMNS" :data="ARTISTS" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
