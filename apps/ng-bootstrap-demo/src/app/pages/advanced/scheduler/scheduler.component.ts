import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsSchedulerModule, ESchedulerMode, Resource, ResourceGroup, TimelineOptions, WeekOptions } from '@mintplayer/ng-bootstrap/scheduler';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';

@Component({
  selector: 'demo-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
  standalone: true,
  imports: [FormsModule, BsCardModule, BsFormModule, BsInputGroupComponent, BsButtonTypeDirective, BsSelectModule, BsSchedulerModule]
})
export class SchedulerComponent {
  weekOptions: WeekOptions = { unitHeight: 30 };
  timelineOptions: TimelineOptions = { unitWidth: 50 };
  colors = Color;
  modes = ESchedulerMode;
  mode = ESchedulerMode.week;
  resources: (Resource | ResourceGroup)[] = [];

  fillData() {
    this.resources = [
      <ResourceGroup>{
        description: 'Machines',
        children: [
          <ResourceGroup>{
            description: 'Lasercutters',
            children: [
              <Resource>{
                description: 'Lasercutter 1',
                events: [{
                  color: 'red',
                  description: 'Siel',
                  start: new Date(2022, 1, 2, 0, 0, 0),
                  end: new Date(2022, 1, 5, 23, 59, 59)
                }]
              },
              <Resource>{
                description: 'Lasercutter 2',
                events: [{
                  color: 'red',
                  description: 'Siel',
                  start: new Date(2022, 1, 2, 0, 0, 0),
                  end: new Date(2022, 1, 5, 23, 59, 59)
                }]
              },
              <Resource>{
                description: 'Lasercutter 3',
                events: [{
                  color: 'red',
                  description: 'Siel',
                  start: new Date(2022, 1, 2, 0, 0, 0),
                  end: new Date(2022, 1, 5, 23, 59, 59)
                }]
              }
            ]
          },
          <ResourceGroup>{
            description: 'Waterjets',
            children: [
              <Resource>{
                description: 'Waterjet 1',
                events: [{
                  color: 'blue',
                  description: 'Jonas',
                  start: new Date(2022, 1, 3, 0, 0, 0),
                  end: new Date(2022, 1, 3, 23, 59, 59)
                }]
              },
              <Resource>{
                description: 'Waterjet 2',
                events: [{
                  color: 'blue',
                  description: 'Jonas',
                  start: new Date(2022, 1, 3, 0, 0, 0),
                  end: new Date(2022, 1, 3, 23, 59, 59)
                }]
              },
              <Resource>{
                description: 'Waterjet 3',
                events: [{
                  color: 'blue',
                  description: 'Jonas',
                  start: new Date(2022, 1, 3, 0, 0, 0),
                  end: new Date(2022, 1, 3, 23, 59, 59)
                }]
              },
            ]
          },
          <ResourceGroup>{
            description: 'Column drills',
            children: [
              <ResourceGroup>{
                description: 'First floor',
                children: [
                  <Resource>{
                    description: 'Column drill 1',
                    events: [{
                      color: 'yellow',
                      description: 'Pieterjan',
                      start: new Date(2022, 1, 7, 0, 0, 0),
                      end: new Date(2022, 1, 7, 23, 59, 59)
                    }]
                  },
                  <Resource>{
                    description: 'Column drill 2',
                    events: [{
                      color: 'yellow',
                      description: 'Pieterjan',
                      start: new Date(2022, 1, 7, 0, 0, 0),
                      end: new Date(2022, 1, 7, 23, 59, 59)
                    }]
                  },
                ]
              },
              <ResourceGroup>{
                description: 'Second floor',
                children: [
                  <Resource>{
                    description: 'Column drill 3',
                    events: [{
                      color: 'yellow',
                      description: 'Pieterjan',
                      start: new Date(2022, 1, 7, 0, 0, 0),
                      end: new Date(2022, 1, 7, 23, 59, 59)
                    }]
                  },
                  <Resource>{
                    description: 'Column drill 4',
                    events: [{
                      color: 'yellow',
                      description: 'Jim',
                      start: new Date(2022, 1, 7, 0, 0, 0),
                      end: new Date(2022, 1, 7, 23, 59, 59)
                    }]
                  },
                ]
              },
            ]
          }
        ]
      },
      <ResourceGroup>{
        description: 'Employees',
        children: [
          <Resource>{
            description: 'Pieterjan',
            events: [{
              color: 'grey',
              description: 'Present',
              start: new Date(2022, 0, 31, 0, 0, 0),
              end: new Date(2022, 1, 4, 23, 59, 59)
            }]
          }
        ]
    }];
  }
}
