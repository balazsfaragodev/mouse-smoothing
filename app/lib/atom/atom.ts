import { atom } from "jotai";
import { MouseEvent, Segment } from "../types";
import { useRef } from "react";

export const mouseEventsAtom = atom<MouseEvent[]>([]);
export const adjustedSegmentsAtom = atom<Segment[]>([]);
