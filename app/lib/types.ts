export type CursorType =
  | "arrow"
  | "iBeam"
  | "resizeUpDown"
  | "resizeLeftRight"
  | "pointingHand";
//| undefined;

export interface MouseEvent {
  time: number;
  x: number;
  y: number;
  cursorType: CursorType;
  easingType: string;
}

export interface Segment {
  points: MouseEvent[];
  easingTypeBefore: string;
  easingTypeAfter: string;
}
