import { NormalizedLandmarkListList } from '@mediapipe/hands';
import { angleBetween3Points } from './coord';
import * as MIDI from 'midi.js';

interface ActiveCell {
  width: number;
  height: number;
  x: number;
  y: number;
}

const inRange = (a: number, min: number, max: number) => a >= min && a <= max;

const isPointInsideCell = (x: number, y: number, cell: ActiveCell) =>
  inRange(x, cell.x, cell.x + cell.width) &&
  inRange(y, cell.y, cell.y + cell.height);

const hasFingerInCell = (
  fingers: ({ x: number; y: number } | null)[],
  cell: ActiveCell
) => {
  for (const finger of fingers) {
    if (finger && isPointInsideCell(finger.x, finger.y, cell)) {
      return true;
    }
  }
  return false;
};

function getWhiteKeyNote(key: number) {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return notes[key % notes.length];
}

function getBlackKeyNote(key: number) {
  const notes = ['C#', 'D#', 'F#', 'G#', 'A#'];
  return notes[key % notes.length];
}

function getLandmarkCoord(landmarks: any, index: number) {
  if (index > landmarks.length) {
    return null;
  }
  return {
    x: landmarks[index].x * window.innerWidth,
    y: landmarks[index].y * window.innerHeight,
  };
}

function getOpeningFingerPos(landmarks: any, indexes: number[]) {
  const angle = angleBetween3Points(
    landmarks[indexes[1]],
    landmarks[indexes[2]],
    landmarks[indexes[3]]
  );
  if (!angle || angle < 170) {
    return null;
  }
  return getLandmarkCoord(landmarks, indexes[0]);
}

export class PianoGame {
  constructor() {
    // https://github.com/gleitz/midi-js-soundfonts
    MIDI.loadPlugin({
      soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/',
      instrument: 'acoustic_grand_piano',
      onsuccess: function () {
        console.log('Tabla loaded as instrument acoustic_grand_piano');
      },
    });
  }

  isHandInsideCell(landmarks: any[], cell: ActiveCell) {
    const insideLandmarks = landmarks.reduce(
      (acc, val) => (acc + isPointInsideCell(val.x, val.y, cell) ? 1 : 0),
      0
    );
    // console.log(landmarks, cell, insideLandmarks);
    return landmarks.length === insideLandmarks;
  }

  drawGame(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    multiHandLandmarks: NormalizedLandmarkListList
  ) {
    // console.log(multiHandLandmarks);
    const fingers = multiHandLandmarks
      .map((landmarks) => {
        return [
          getOpeningFingerPos(landmarks, [8, 7, 6, 5]),
          getOpeningFingerPos(landmarks, [12, 11, 10, 9]),
          getOpeningFingerPos(landmarks, [16, 15, 14, 13]),
        ].filter((i) => !!i);
      })
      .filter((i) => i.length)
      .flat();
    if (fingers.length) {
      // console.log(fingers);
    }

    const scalesNum = 4;
    const keysNum = scalesNum * 7;

    const whiteKeyWidth = canvas.width / keysNum;
    const whiteKeyHeight = 200;
    const blackKeyWidth = whiteKeyWidth * 0.7;
    const blackKeyHeight = whiteKeyHeight * 0.6;

    // Draw white keys
    for (let i = 0; i < keysNum; i++) {
      const wx = i * whiteKeyWidth;
      const wy = canvas.height - whiteKeyHeight;
      const noteName = getWhiteKeyNote(i) + (Math.ceil((i + 1) / 7) + 1);
      const isPressed = hasFingerInCell(fingers, {
        x: wx,
        y: wy,
        width: whiteKeyWidth,
        height: whiteKeyHeight,
      });
      ctx.fillStyle = isPressed
        ? 'rgba(0, 255, 255, 0.5)'
        : 'rgba(255, 255, 255, 0.5)';
      if (isPressed) {
        try {
          const noteId = MIDI.keyToNote[noteName];
          console.log(noteName, MIDI.keyToNote, noteId);
          MIDI.noteOn(0, noteId, 127); // On channel 0 (default), play note C4 (id 60) with max velocity (127)
        } catch (e) {
          console.error(e);
        }
      }
      ctx.fillRect(wx, wy, whiteKeyWidth, whiteKeyHeight);
      // ctx.strokeRect(
      //   i * whiteKeyWidth,
      //   canvas.height - whiteKeyHeight,
      //   whiteKeyWidth,
      //   whiteKeyHeight
      // );

      // Write key notes
      ctx.fillStyle = 'black';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        noteName,
        i * whiteKeyWidth + whiteKeyWidth / 2,
        canvas.height - 5
      );
    }

    // Draw black keys
    const blackKeyPositions = [1, 2, 4, 5, 6];
    for (let i = 0; i < scalesNum; i++) {
      for (let j = 0; j < blackKeyPositions.length; j++) {
        ctx.fillStyle = 'black';
        const x =
          (i * 7 + blackKeyPositions[j]) * whiteKeyWidth - blackKeyWidth / 2;
        ctx.fillRect(
          x,
          canvas.height - whiteKeyHeight,
          blackKeyWidth,
          blackKeyHeight
        );

        // Write key notes
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          getBlackKeyNote(j),
          x + blackKeyWidth / 2,
          canvas.height - blackKeyHeight
        );
      }
    }
  }
}
