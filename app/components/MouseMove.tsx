"use client";
import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { CursorType } from "../lib/types";
import { useAtom } from "jotai";
import { adjustedSegmentsAtom } from "../lib/atom/atom";
import mousePathHook from "../lib/hooks/mousePathHook";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const textureMap: Record<NonNullable<CursorType>, PIXI.Texture> = {
  arrow: PIXI.Texture.from("/arrow.png"),
  iBeam: PIXI.Texture.from("/iBeam.png"),
  resizeUpDown: PIXI.Texture.from("/resizeUpDown.png"),
  resizeLeftRight: PIXI.Texture.from("/resizeLeftRight.png"),
  pointingHand: PIXI.Texture.from("/pointingHand.png"),
};

const MouseSmoothingPage = () => {
  const [adjustedSegments, setAdjustedSegments] = useAtom(adjustedSegmentsAtom);

  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorSpriteRef = useRef<PIXI.Sprite | null>(null);
  const textRef = useRef<PIXI.Text | null>(null);

  mousePathHook();

  useEffect(() => {
    if (canvasRef.current && !pixiAppRef.current) {
      const pixiApp = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xffffff,
      });
      // Append the PixiJS canvas to the DOM
      if (canvasRef.current) {
        canvasRef.current.appendChild(pixiApp.view as unknown as Node);
      }
      pixiAppRef.current = pixiApp;

      // Add the cursor sprite

      const cursorSprite = new PIXI.Sprite(textureMap.arrow);
      cursorSprite.width = 26;
      cursorSprite.height = 26;
      cursorSprite.anchor.set(0.3); // Középre igazítás
      pixiApp.stage.addChild(cursorSprite);

      cursorSpriteRef.current = cursorSprite;

      const infoText = new PIXI.Text("", {
        fontSize: 16,
        fill: 0x000000,
        align: "left",
      });
      infoText.position.set(10, 10); // Bal felső sarokban jelenik meg
      pixiApp.stage.addChild(infoText);
      textRef.current = infoText;
    }

    // Canvas méretének frissítése az ablak méretéhez igazodva
    const resizeCanvas = () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.renderer.resize(
          window.innerWidth,
          window.innerHeight
        );
      }
    };

    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Animáció kezelés
  useEffect(() => {
    if (
      cursorSpriteRef.current &&
      adjustedSegments.length > 0 &&
      pixiAppRef.current
    ) {
      let currentSegmentIndex = 0;
      let currentPointIndex = 0;
      console.log(adjustedSegments);

      const animate = () => {
        const currentSegment = adjustedSegments[currentSegmentIndex];
        const numPoints = currentSegment.points.length;

        if (currentPointIndex < numPoints - 1) {
          const currentEvent = currentSegment.points[currentPointIndex];
          const nextEvent = currentSegment.points[currentPointIndex + 1];

          let timeDiff = (nextEvent.time - currentEvent.time) / 500;

          const currentTexture = textureMap[currentEvent.cursorType];
          cursorSpriteRef.current!.texture = currentTexture;

          // Display the easing types for the current segment
          if (textRef.current) {
            textRef.current.text = `Easing Before Type: ${currentSegment.easingTypeBefore}\nEasing After Type: ${currentSegment.easingTypeAfter}`;
          }

          gsap.to(cursorSpriteRef.current, {
            pixi: { x: currentEvent.x, y: currentEvent.y },
            duration: timeDiff,
            ease: currentEvent.easingType, // Apply the determined easing
            onComplete: () => {
              currentPointIndex++;
              animate();
            },
          });
        } else if (currentSegmentIndex < adjustedSegments.length - 1) {
          currentSegmentIndex++;
          currentPointIndex = 0;

          const pauseDuration = 0.8; // Pause duration in seconds

          gsap.delayedCall(pauseDuration, () => {
            animate();
          });
        }
      };

      animate(); // Start the animation
    }
  }, [adjustedSegments, pixiAppRef, cursorSpriteRef]);

  return <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export default MouseSmoothingPage;
