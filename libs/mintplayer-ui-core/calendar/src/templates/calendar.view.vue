<script setup lang="ts">
// The calendar's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectCalendar(). The month toolbar sits
// outside the table: a grid may own only rows of cells.
import type { CalendarView } from '@mintplayer/ui-core/calendar';

defineProps<{ view: CalendarView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.nav">
    <button v-bind="view.previous"></button>
    <span v-bind="view.monthLabel">{{ view.monthText }}</span>
    <button v-bind="view.next"></button>
  </div>
  <table v-bind="view.grid">
    <tbody>
      <tr v-bind="view.headRow">
        <th v-bind="view.weekHeader"><span v-bind="view.weekHeaderText">{{ view.weekLabel }}</span></th>
        <th v-for="day in view.weekdays" :key="day.key" v-bind="day.bag">{{ day.text }}</th>
      </tr>
      <tr v-for="week in view.weeks" :key="week.key" v-bind="week.row">
        <th v-bind="week.header">{{ week.number }}</th>
        <td v-for="cell in week.cells" :key="cell.key" v-bind="cell.cell"><span v-if="cell.content" v-bind="cell.content">{{ cell.text }}</span></td>
      </tr>
    </tbody>
  </table>
  </div>
</template>
