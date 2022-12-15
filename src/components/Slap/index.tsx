import { useEffect, useRef, useState } from 'react';
import {
  Results,
  Hands,
  HAND_CONNECTIONS,
  VERSION,
  NormalizedLandmarkListList,
} from '@mediapipe/hands';
import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from '@mediapipe/drawing_utils';
import './index.scss';

const SlapContainer = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const gameState = useRef({
    status: true,
    points: 0,
    lastRendered: null,
  });

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log('rendering');
      contextRef.current = canvasRef.current.getContext('2d');
      const constraints = {
        video: { width: { min: 1280 }, height: { min: 720 } },
      };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (inputVideoRef.current) {
          inputVideoRef.current.srcObject = stream;
        }
        sendToMediaPipe();
      });

      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${VERSION}/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);

      const sendToMediaPipe = async () => {
        if (inputVideoRef.current) {
          if (!inputVideoRef.current.videoWidth) {
            console.log(inputVideoRef.current.videoWidth);
            requestAnimationFrame(sendToMediaPipe);
          } else {
            await hands.send({ image: inputVideoRef.current });
            requestAnimationFrame(sendToMediaPipe);
          }
        }
      };
    }
  }, [inputVideoReady]);

  const drawGame = (multiHandLandmarks: NormalizedLandmarkListList) => {
    if (canvasRef.current && contextRef.current) {
      const ctx = contextRef.current;
      const grid = {
        width: 4,
        height: 4,
        cell: 100,
        lineColor: '#00FF00',
      };

      const startX = (canvasRef.current.width - grid.width * grid.cell) / 2;
      const startY = 100;
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = grid.lineColor;
      for (let i = 0; i <= grid.width; i++) {
        const x = startX + i * grid.cell;
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + grid.cell * grid.height);
      }
      for (let i = 0; i <= grid.height; i++) {
        const y = startY + i * grid.cell;
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + grid.cell * grid.width, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#0ff';
      ctx.fillRect(startX, startY / 2, 40, 20);

      ctx.fillStyle = '#000';
      ctx.fillText(
        gameState.current.status ? 'Stop' : 'Start',
        startX + 5,
        startY / 2 + 15
      );
    }
  };

  const onResults = (results: Results) => {
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      contextRef.current.save();
      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      contextRef.current.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      drawGame(results.multiHandLandmarks);

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
          const classification = results.multiHandedness[index];
          const isRightHand = classification.label === 'Right';
          const landmarks = results.multiHandLandmarks[index];
          drawConnectors(contextRef.current, landmarks, HAND_CONNECTIONS, {
            color: isRightHand ? '#00FF00' : '#FF0000',
          });
          drawLandmarks(contextRef.current, landmarks, {
            color: isRightHand ? '#00FF00' : '#FF0000',
            fillColor: isRightHand ? '#FF0000' : '#00FF00',
            radius: (data: Data) => {
              return lerp(data.from!.z!, -0.15, 0.1, 10, 1);
            },
          });
        }
      }
      contextRef.current.restore();
    }
  };

  return (
    <div className="slap-container">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
      />
      <canvas ref={canvasRef} width={1280} height={720} />
      {!loaded && (
        <div className="loading">
          <div className="spinner"></div>
          <div className="message">Loading</div>
        </div>
      )}
    </div>
  );
};

export default SlapContainer;
