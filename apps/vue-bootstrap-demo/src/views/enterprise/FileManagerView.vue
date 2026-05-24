<script setup lang="ts">
import { BsFileManager } from '@mintplayer/vue-bootstrap/file-manager';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { FileSystemNode } from '@mintplayer/web-components/file-manager';

const NODES: FileSystemNode[] = [
  { id: 'root',    parentId: null,    name: 'Documents', type: 'folder' },
  { id: 'docs',    parentId: 'root',  name: 'Letters',   type: 'folder' },
  { id: 'photos',  parentId: 'root',  name: 'Photos',    type: 'folder' },
  { id: 'readme',  parentId: 'root',  name: 'README.md', type: 'file', size: 1024 },
  { id: 'letter1', parentId: 'docs',  name: 'invite.docx', type: 'file', size: 18432 },
  { id: 'pic1',    parentId: 'photos', name: 'beach.jpg', type: 'file', size: 245760, mimeType: 'image/jpeg' },
];

const SOURCE = `<BsFileManager :nodes="NODES" root-folder-id="root" />`;
</script>

<template>
  <div class="demo-page">
    <h1>File manager</h1>
    <p class="text-body-secondary">
      Splitter + treeview + datatable composed into a Syncfusion-style
      file browser. Tree on the left, list on the right, breadcrumb on top.
    </p>

    <section style="height: 500px">
      <h2>Static seed</h2>
      <BsFileManager :nodes="NODES" root-folder-id="root" style="height: 100%" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
