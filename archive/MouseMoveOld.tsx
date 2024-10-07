"use client";
import React, { useEffect, useRef, useState } from "react";

// Az általad megadott formátumhoz megfelelő típusdefiníció
type CursorType =
  | "arrow"
  | "iBeam"
  | "resizeUpDown"
  | "resizeLeftRight"
  | "pointingHand"
  | undefined;

type EasingType =
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInSine"
  | "easeInOut"
  | "linear"; // Unió a lehetséges easing típusokhoz

interface MouseEvent {
  time: number;
  x: number;
  y: number;
  cursorType: CursorType;
}

const T = 100;

interface Segment {
  points: MouseEvent[];
  easingBefore: number;
  easingAfter: number;
  easingTypeBefore: EasingType; // Használjuk az EasingType uniót
  easingTypeAfter: EasingType; // Használjuk az EasingType uniót
}

// Kurzor sprite sheet beállításai
const spriteColumns = 6;
const spriteRows = 3;
const heightGap = 68;
const widthGap = 10;
const spriteWidth = 1400; // A teljes SVG szélessége
const spriteHeight = 980; // A teljes SVG magassága
const cursorWidth = spriteWidth / spriteColumns;
const cursorHeight = spriteHeight / spriteRows - 80;

// Az egyes kurzor típusok pozíciói a sprite-ban
const cursorMap = {
  arrow: { row: 0, col: 1 },
  iBeam: { row: 2, col: 5 },
  resizeUpDown: { row: 1, col: 4 },
  resizeLeftRight: { row: 1, col: 5 },
  pointingHand: { row: 0, col: 2 },
  default: { row: 0, col: 1 }, // Alapértelmezett kurzor
};

function cubicBezier(p0: number, p1: number, p2: number, p3: number) {
  return (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
}

// Easing függvények definiálása
const easingFunctions: Record<EasingType, (t: number) => number> = {
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeInOut: (t: number) => cubicBezier(0, 0.42, 0.58, 1)(t),
  linear: (t: number) => t, // Lineáris interpoláció
};

// Véletlenszerűen kiválasztunk egy easing függvényt
const getRandomEasingFunction = (): EasingType => {
  const easingKeys = Object.keys(easingFunctions) as EasingType[];
  const randomIndex = Math.floor(Math.random() * easingKeys.length);
  return easingKeys[randomIndex]; // Visszaadja az easing típus nevét
};

const MouseSmoothingPage = () => {
  const [mouseEvents, setMouseEvents] = useState<MouseEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<MouseEvent[]>([]);
  const [adjustedSegments, setAdjustedSegments] = useState<Segment[]>([]); // Tároljuk a szegmenseket
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // JSON fájl betöltése
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
        console.log("Eredeti egéresemények:", loadedMouseEvents);
        setMouseEvents(loadedMouseEvents);

        // Szegmentálás kis mozgások alapján
        const segmentsData: Segment[] = [];
        let currentSegmentPoints: MouseEvent[] = [];
        let lastEvent = loadedMouseEvents[0];
        currentSegmentPoints.push(lastEvent);

        for (let i = 1; i < loadedMouseEvents.length; i++) {
          const timeDiff =
            loadedMouseEvents[i].time - loadedMouseEvents[i - 1].time;

          if (timeDiff > T) {
            console.log(timeDiff);
            // Új szegmens indítása
            segmentsData.push({
              points: currentSegmentPoints,
              easingBefore: 0,
              easingAfter: 0,
              easingTypeBefore: "linear", // Alapértelmezett érték
              easingTypeAfter: "linear", // Alapértelmezett érték
            });
            currentSegmentPoints = [loadedMouseEvents[i]];
          } else {
            currentSegmentPoints.push(loadedMouseEvents[i]);
          }
          lastEvent = loadedMouseEvents[i];
        }
        // Az utolsó szegmens hozzáadása, ha vannak benne események
        if (currentSegmentPoints.length > 0) {
          segmentsData.push({
            points: currentSegmentPoints,
            easingBefore: 0,
            easingAfter: 0,
            easingTypeBefore: "linear",
            easingTypeAfter: "linear",
          });
        }

        // Pontok módosítása a szegmenseken belül
        const adjustedSegmentsData = segmentsData.map((segment, index) => {
          const { points } = segment;

          if (points.length < 5) {
            // Ha a szegmensben kevesebb mint 5 pont van, nincs szükség módosításra
            return { ...segment };
          }

          const startPoint = points[0];
          const endPoint = points[points.length - 1];

          const totalPoints = 100; // Több pont generálása a jobb minőség érdekében
          const totalTime = endPoint.time - startPoint.time;

          // Egyedi easingBefore és easingAfter generálása a szegmenshez
          const easingBefore = 0.2 * Math.random() + 0.2; // 0.2 és 0.4 között
          const easingAfter = 0.2 * Math.random() + 0.2; // 0.2 és 0.4 között

          // Véletlenszerűen kiválasztott easing típus
          const easingTypeBefore = getRandomEasingFunction();
          const easingTypeAfter = getRandomEasingFunction();

          const adjustedPoints: MouseEvent[] = [];

          for (let i = 0; i < totalPoints; i++) {
            let t = i / (totalPoints - 1); // Normalizált pozíció 0 és 1 között

            let adjustedT: number;

            if (t < easingBefore) {
              // Kezdő gyorsuló szakasz a véletlenszerűen kiválasztott easing függvénnyel
              const tIn = t / easingBefore; // Normalizálás a kezdő szakaszra
              const easingFuncBefore = easingFunctions[easingTypeBefore];
              adjustedT = easingFuncBefore(tIn) * easingBefore;
            } else if (t > 1 - easingAfter) {
              // Végső lassuló szakasz a véletlenszerűen kiválasztott easing függvénnyel
              const tIn = (t - (1 - easingAfter)) / easingAfter; // Normalizálás a végső szakaszra
              const easingFuncAfter = easingFunctions[easingTypeAfter];
              adjustedT = 1 - easingAfter + easingFuncAfter(tIn) * easingAfter;
            } else {
              // Középső lineáris szakasz
              adjustedT = t;
            }

            const x = startPoint.x + adjustedT * (endPoint.x - startPoint.x);
            const y = startPoint.y + adjustedT * (endPoint.y - startPoint.y);
            const time = startPoint.time + adjustedT * totalTime;

            // Eredeti eseményhez legközelebbi cursorType megtalálása
            const originalIndex = Math.floor(t * (points.length - 1));
            const originalEvent = points[originalIndex];

            adjustedPoints.push({
              ...originalEvent,
              x,
              y,
              time,
            });
          }

          return {
            points: adjustedPoints,
            easingBefore,
            easingAfter,
            easingTypeBefore,
            easingTypeAfter,
          };
        });

        setAdjustedSegments(adjustedSegmentsData); // Állapotban tároljuk a szegmenseket
        const flattenedEvents = adjustedSegmentsData.flatMap(
          (segment) => segment.points
        );
        setFilteredEvents(flattenedEvents);
      });
  }, []);

  // Canvas méretének frissítése az ablak méretéhez igazodva
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    // Canvas méretének inicializálása és frissítése átméretezéskor
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Animáció kezelés
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const spriteImage = new Image();
    spriteImage.src = "/cursor_sprite.svg"; // Helyezd a public mappába az SVG sprite-ot

    spriteImage.onload = () => {
      if (
        canvas &&
        ctx &&
        filteredEvents.length > 0 &&
        adjustedSegments.length > 0
      ) {
        let currentIndex = 0;

        const animate = () => {
          if (currentIndex < filteredEvents.length - 1) {
            const currentEvent = filteredEvents[currentIndex];
            const nextEvent = filteredEvents[currentIndex + 1];

            // Időzítés a két pont között a time alapján
            const timeDiff = nextEvent.time - currentEvent.time;

            // Rajzolás az aktuális pontig
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(filteredEvents[0].x, filteredEvents[0].y);

            for (let i = 1; i <= currentIndex; i++) {
              ctx.lineTo(filteredEvents[i].x, filteredEvents[i].y);
            }
            ctx.stroke();

            // Kurzor pozíciójának rajzolása
            const cursorType = currentEvent.cursorType || "default";
            const cursorPos = cursorMap[cursorType];
            const sx = cursorPos.col * (cursorWidth + widthGap);
            const sy = cursorPos.row * (cursorHeight + heightGap);

            ctx.drawImage(
              spriteImage,
              sx,
              sy, // A sprite sheet pozíciója
              cursorWidth,
              cursorHeight, // A kivágás mérete
              currentEvent.x - cursorWidth / 4 + 48,
              currentEvent.y - cursorWidth / 4 + 50, // Pozíció a canvas-on
              cursorWidth * 0.12,
              cursorWidth * 0.12 // Kisebb méret a canvas-on
            );

            // Továbblépés a következő pontra a timeDiff alapján
            setTimeout(() => {
              currentIndex++;
              animate();
            }, timeDiff);
          }
        };

        animate(); // Indítsd el az animációt, kövesse az útvonalat egyszer
      }
    };

    spriteImage.onerror = () => {
      console.error("Nem sikerült betölteni az SVG sprite-ot.");
    };
  }, [filteredEvents, adjustedSegments]); // Hozzáadjuk a függőséghez

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default MouseSmoothingPage;
