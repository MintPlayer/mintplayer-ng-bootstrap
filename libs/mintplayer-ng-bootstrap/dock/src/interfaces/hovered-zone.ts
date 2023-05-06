import { BsDockPaneRendererComponent } from "../dock-pane-renderer/dock-pane-renderer.component";
import { DockRegionZone } from "../types/dock-region-zone";

export interface BsHoveredZone {
  panel: BsDockPaneRendererComponent;
  zone: DockRegionZone;
}