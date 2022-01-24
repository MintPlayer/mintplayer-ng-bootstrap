import { Injectable } from '@angular/core';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { TimelineTrack } from '../../interfaces/timeline-track';

@Injectable({
  providedIn: 'root'
})
export class BsTimelineService {

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

    // console.log('tracks', tracks);
    return tracks;
  }

  private getTimestamps(events: SchedulerEvent[]) {
    const allTimestamps = events.map(e => [e.start, e.end])
      .reduce((flat, toFlatten) => flat.concat(toFlatten), []);
    
    return allTimestamps.filter((t, i) => allTimestamps.indexOf(t) === i);
  }

  private trackIsFreeAt(track: TimelineTrack, event: SchedulerEvent) {
    if (track.events.every((ev) => (ev.end <= event.start) || (event.end < ev.start))) {
      return true;
    } else {
      return false;
    }
  }

}
