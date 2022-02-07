import { SchedulerScale } from "../interfaces/scheduler-schale";

export const availableScales: SchedulerScale[] = [
    { time: 60,     pixels: 60, markerSize: 900 },        // 60s / 60px     = 1 s/px    = 1  min / 60 px
    { time: 120,    pixels: 60, markerSize: 900 },        // 120s / 60px    = 2 s/px    = 2  min / 60 px
    { time: 300,    pixels: 60, markerSize: 900 },        // 180s / 60px    = 3 s/px    = 5  min / 60 px
    { time: 900,    pixels: 60, markerSize: 900 },        // 360s / 60px    = 6 s/px    = 15 min / 60 px

    { time: 3600,   pixels: 60, markerSize: 21600 },       // 600s / 60px    = 10 s/px   = 1    u / 60 px
    { time: 7200,   pixels: 60, markerSize: 21600 },       // 1200s / 60px   = 20 s/px
    { time: 10800,  pixels: 60, markerSize: 21600 },       // 1800s / 60px   = 30 s/px
    { time: 21600,  pixels: 60, markerSize: 21600 },       // 3600s / 60px   = 60 s/px

    { time: 86400,  pixels: 60, markerSize: 604800 },      // 6000s / 60px   = 100 s/px
]