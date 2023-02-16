import { BsWebbrowser } from "../types/webbrowser.type";
import { BsOperatingSystem } from "../types/operating-system.type";

export interface BsUserAgent {
  os?: BsOperatingSystem;
  webbrowser?: BsWebbrowser;
}