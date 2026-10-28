<script setup lang="ts">
// The date picker's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectDatepicker(). The grid is the
// calendar's markup repeated (a template cannot include another component);
// keep it in step with calendar.view.vue.
import type { DatepickerView } from '@mintplayer/ui-core/datepicker';

defineProps<{ view: DatepickerView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.group">
    <input v-bind="view.input" />
    <input v-if="view.hidden" v-bind="view.hidden" />
    <button v-if="view.trigger" v-bind="view.trigger"></button>
  </div>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  <div v-bind="view.popup">
    <div v-bind="view.calendar.root">
      <div v-bind="view.calendar.nav">
        <button v-bind="view.calendar.previous"></button>
        <span v-bind="view.calendar.monthLabel">{{ view.calendar.monthText }}</span>
        <button v-bind="view.calendar.next"></button>
      </div>
      <table v-bind="view.calendar.grid">
        <tbody>
          <tr v-bind="view.calendar.headRow">
            <th v-bind="view.calendar.weekHeader"><span v-bind="view.calendar.weekHeaderText">{{ view.calendar.weekLabel }}</span></th>
            <th v-for="day in view.calendar.weekdays" :key="day.key" v-bind="day.bag">{{ day.text }}</th>
          </tr>
          <tr v-for="week in view.calendar.weeks" :key="week.key" v-bind="week.row">
            <th v-bind="week.header">{{ week.number }}</th>
            <td v-for="cell in week.cells" :key="cell.key" v-bind="cell.cell"><span v-if="cell.content" v-bind="cell.content">{{ cell.text }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  </div>
</template>
