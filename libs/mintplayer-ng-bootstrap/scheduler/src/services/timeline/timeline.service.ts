import { Injectable } from '@angular/core';
import { PreviewEvent } from '../../interfaces/preview-event';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';
import { SchedulerEventWithParts } from '../../interfaces/scheduler-event-with-parts';
import { TimelineTrack } from '../../interfaces/timeline-track';

@Injectable({
  providedIn: 'root'
})
export class BsTimelineService {

  public splitInParts(event: SchedulerEvent | PreviewEvent) {
    let startTime = event.start;
    const result: SchedulerEventPart[] = [];
    const eventOrNull = 'color' in event ? event : null;
    while (!this.dateEquals(startTime, event.end)) {
      const end = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1, 0, 0, 0);
      result.push({ start: startTime, end: end, event: eventOrNull });
      startTime = end;
    }
    if (startTime != event.end) {
      result.push({ start: startTime, end: event.end, event: eventOrNull });
    }

    return <SchedulerEventWithParts>{ event: event, parts: result };
  }
  
  private dateEquals(date1: Date, date2: Date) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  public getTimeline(events: SchedulerEvent[]) {
    const timestamps = this.getTimestamps(events);
    const tracks: TimelineTrack[] = [];

    timestamps.forEach((timestamp, tIndex) => {
      const starting = events.filter((e) => e.start === timestamp);
      // const ending = events.filter((e) => e.end === timestamp);

      starting.forEach((startedEvent, eIndex) => {
        const freeTracks = tracks.filter(t => this.trackIsFreeAt(t, startedEvent));
        if (freeTracks.length === 0) {
          tracks.push({ index: tracks.length, events: [startedEvent] });
        } else {
          freeTracks[0].events.push(startedEvent);
        }
      });
    });

    return tracks;
  }

  private getTimestamps(events: SchedulerEvent[]) {
    const allTimestamps = events.map(e => [e.start, e.end])
      .reduce((flat, toFlatten) => flat.concat(toFlatten), []);
    
    return allTimestamps
      .filter((t, i) => allTimestamps.indexOf(t) === i)
      .sort((t1, t2) => <any>t1 - <any>t2);
  }

  private trackIsFreeAt(track: TimelineTrack, event: SchedulerEvent) {
    if (track.events.every((ev) => (ev.end <= event.start) || (event.end <= ev.start))) {
      return true;
    } else {
      return false;
    }
  }

}
