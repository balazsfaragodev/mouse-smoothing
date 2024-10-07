import { useEffect } from "react";
import { CursorType, MouseEvent, Segment } from "../types";
import { useAtom } from "jotai";
import { adjustedSegmentsAtom, mouseEventsAtom } from "../atom/atom";

// Define available easing functions for random selection
const availableEasings = [
  "none",
  "power4.inOut",
  "power2.inOut",
  "power3.inOut",
  "sine.inOut",
  "expo.inOut",
];

// Helper function to get random easing
const getRandomEasing = (): string => {
  const randomIndex = Math.floor(Math.random() * availableEasings.length);
  return availableEasings[randomIndex];
};

const mousePathHook = () => {
  const [mouseEvents, setMouseEvents] = useAtom(mouseEventsAtom);
  const [adjustedSegments, setAdjustedSegments] = useAtom(adjustedSegmentsAtom);

  const T = 200; // Time threshold for segmenting in milliseconds
  const minTimeDifferenceMs = 0.05; // Minimum time difference between points (0.05 seconds)

  useEffect(() => {
    fetch("/mouse_path_2.json")
      .then((response) => response.json())
      .then((data) => {
        const loadedMouseEvents = data.map(
          (item: [number, number, number, CursorType]) => ({
            time: item[0],
            x: item[1],
            y: item[2],
            cursorType: item[3],
          })
        );
        console.log("Original mouse events:", loadedMouseEvents);
        setMouseEvents(loadedMouseEvents);

        // Segmenting based on small movements
        const segmentsData: Segment[] = [];
        let currentSegmentPoints: MouseEvent[] = [];
        let lastEvent = loadedMouseEvents[0];
        currentSegmentPoints.push(lastEvent);

        for (let i = 1; i < loadedMouseEvents.length; i++) {
          const timeDiff =
            loadedMouseEvents[i].time - loadedMouseEvents[i - 1].time;

          if (timeDiff > T) {
            // Start a new segment
            segmentsData.push({
              points: currentSegmentPoints,
              easingTypeBefore: "linear",
              easingTypeAfter: "linear",
            });
            currentSegmentPoints = [loadedMouseEvents[i]];
          } else {
            currentSegmentPoints.push(loadedMouseEvents[i]);
          }
          lastEvent = loadedMouseEvents[i];
        }

        // Add the last segment if there are remaining events
        if (currentSegmentPoints.length > 0) {
          segmentsData.push({
            points: currentSegmentPoints,
            easingTypeBefore: "linear",
            easingTypeAfter: "linear",
          });
        }

        // Adjust points within segments with random easing applied
        const adjustedSegmentsData = segmentsData.map((segment) => {
          const { points } = segment;

          const startPoint = points[0];
          const endPoint = points[points.length - 1];

          let totalTime = endPoint.time - startPoint.time; // Total time of the segment in milliseconds

          // Randomly generate percentages for second and third points
          const secondPointPosition = 0.2 * Math.random() + 0.2; // Between 0.2 and 0.4
          const thirdPointPosition = 1 - (0.2 * Math.random() + 0.2); // Between 0.6 and 0.8

          // Ensure we only have 4 points: start, 2nd, 3rd, end
          const parametricPoints = [
            0,
            secondPointPosition,
            thirdPointPosition,
            1,
          ];

          // Select random easing functions for start and end
          const easingTypeBefore = getRandomEasing();
          const easingTypeAfter = getRandomEasing();

          const adjustedPoints: MouseEvent[] = [];

          parametricPoints.forEach((t, index) => {
            const x = startPoint.x + t * (endPoint.x - startPoint.x);
            const y = startPoint.y + t * (endPoint.y - startPoint.y);
            const time = startPoint.time + t * totalTime;

            // Find the original cursorType
            const originalIndex = Math.floor(t * (points.length - 1));
            const originalEvent = points[originalIndex];

            // Apply easing logic based on point position
            let easingType: string;
            if (index === 0 || index === 2) {
              easingType = "none"; // First and third points use "none" (linear)
            } else if (index === 1) {
              easingType = easingTypeBefore; // Second point uses easingTypeBefore
            } else if (index === 3) {
              easingType = easingTypeAfter; // Fourth point uses easingTypeAfter
            }

            adjustedPoints.push({
              ...originalEvent,
              x,
              y,
              time,
              easingType: easingType!, // Assign easing type to each point
            });
          });

          // Ensure the time difference between points is at least minTimeDifferenceMs
          const actualTimeDiff = totalTime / (parametricPoints.length - 1);
          if (actualTimeDiff < minTimeDifferenceMs) {
            totalTime = minTimeDifferenceMs * (parametricPoints.length - 1);
            // Recalculate times with the new totalTime
            for (let i = 0; i < adjustedPoints.length; i++) {
              const t = parametricPoints[i];
              adjustedPoints[i].time = startPoint.time + t * totalTime;
            }
          }

          return {
            ...segment,
            points: adjustedPoints,
            easingTypeBefore, // Random easing at the start
            easingTypeAfter, // Random easing at the end
            totalMovementTime: totalTime,
          };
        });

        setAdjustedSegments(adjustedSegmentsData as Segment[]);
      });
  }, []);
};

export default mousePathHook;
