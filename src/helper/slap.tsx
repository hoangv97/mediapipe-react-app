import { NormalizedLandmarkListList } from '@mediapipe/hands';

interface ActiveCell {
  width: number;
  height: number;
  x: number;
  y: number;
  createdAt: Date;
  timeout: number;
}

const randomIntFromRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const inRange = (a: number, min: number, max: number) => a >= min && a <= max;

const isPointInsideCell = (x: number, y: number, cell: ActiveCell) =>
  inRange(x, cell.x, cell.x + cell.width) &&
  inRange(y, cell.y, cell.y + cell.height);

export class SlapGame {
  points: number;
  status: boolean;
  activeCells: ActiveCell[];
  maxActiveCells: number;
  clearCellInterval: any;

  constructor() {
    this.status = false;
    this.points = 0;
    this.maxActiveCells = 1;
    this.activeCells = [];
  }

  getNewActiveCell(): ActiveCell {
    const isDuplicated = (x: number, y: number) => {
      // TODO
      return !!this.activeCells.find((c) => c.x === x && c.y === y);
    };
    const width = 100;
    const height = 100;
    let x = 0;
    let y = 0;
    while (true) {
      x = randomIntFromRange(0, window.innerWidth - width);
      y = randomIntFromRange(0, window.innerHeight - height);
      if (!isDuplicated(x, y)) {
        break;
      }
    }
    return {
      x,
      y,
      width,
      height,
      createdAt: new Date(),
      timeout: randomIntFromRange(3000, 6000),
    };
  }

  startGame(status: boolean) {
    this.activeCells = [];
    this.status = status;
    if (status) {
      this.points = 0;
      for (let i = 0; i < this.maxActiveCells; i++) {
        this.activeCells.push(this.getNewActiveCell());
      }
    }
  }

  getLandmarkCoord(landmarks: any, index: number) {
    return {
      x: landmarks[index].x * window.innerWidth,
      y: landmarks[index].y * window.innerHeight,
    };
  }

  isHandInsideCell(landmarks: any[], cell: ActiveCell) {
    const insideLandmarks = landmarks.reduce(
      (acc, val) => (acc + isPointInsideCell(val.x, val.y, cell) ? 1 : 0),
      0
    );
    // console.log(landmarks, cell, insideLandmarks);
    return landmarks.length === insideLandmarks;
  }

  getInactiveCellIndexes(hands: any[]) {
    const results = new Set();
    for (const hand of hands) {
      this.activeCells.forEach((cell, i) => {
        if (this.isHandInsideCell(hand, cell)) {
          results.add(i);
        }
      });
    }
    return Array.from(results);
  }

  drawGame(
    ctx: CanvasRenderingContext2D,
    multiHandLandmarks: NormalizedLandmarkListList
  ) {
    if (!this.status) {
      return;
    }
    const cellImg = document.getElementById(
      'cell-img-src'
    ) as CanvasImageSource;
    if (cellImg) {
      const now = new Date().getTime();
      this.activeCells = this.activeCells.filter((c) => {
        const isTimeout = c.createdAt.getTime() + c.timeout > now;
        return isTimeout;
      });

      if (this.activeCells.length < this.maxActiveCells) {
        for (
          let i = 0;
          i < this.maxActiveCells - this.activeCells.length;
          i++
        ) {
          this.activeCells.push(this.getNewActiveCell());
        }
      }

      for (const { x, y, width, height } of this.activeCells) {
        ctx.drawImage(cellImg, x, y, width, height);
      }
    }

    // console.log(multiHandLandmarks);
    const hands = multiHandLandmarks.map((landmarks) => {
      return [
        this.getLandmarkCoord(landmarks, 5),
        // this.getLandmarkCoord(landmarks, 9),
      ];
    });

    ctx.font = '25px Comic Sans MS';
    ctx.fillStyle = 'red';
    ctx.fillText(`You have slapped me ${this.points} times 🥴`, 10, 90);

    // console.log(
    //   hands
    //     .map((hand) => hand.map((h: any) => `x: ${h.x}, y: ${h.y}`).join('; '))
    //     .join('\n')
    // );
    const inactiveCellIndexes = this.getInactiveCellIndexes(hands);
    // console.log(inactiveCellIndexes);
    this.activeCells = this.activeCells.filter((_, i) => {
      if (!inactiveCellIndexes.includes(i)) {
        return true;
      } else {
        this.points++;
        return false;
      }
    });
  }
}
