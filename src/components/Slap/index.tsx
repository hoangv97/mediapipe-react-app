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
import { SlapGame } from '../../helper/slap';
import meImg from '../../assets/images/me.png';
import { useSearchParams } from 'react-router-dom';

const SlapContainer = () => {
  const [searchParams] = useSearchParams();
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const gameState = useRef(new SlapGame());
  const [status, setStatus] = useState(false);
  const [faceNum, setFaceNum] = useState(gameState.current.maxActiveCells);
  const [cellImgSrc, setCellImgSrc] = useState(
    'https://www.nicepng.com/png/full/183-1834697_donald-duck-png-donald-duck-small-face.png'
  );

  useEffect(() => {
    console.log(searchParams);
    const t = searchParams.get('t');
    if (t === 'm') {
      setCellImgSrc(meImg);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log('rendering');
      contextRef.current = canvasRef.current.getContext('2d');
      const constraints = {
        video: {
          width: { min: window.innerWidth },
          height: { min: window.innerHeight },
        },
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
      gameState.current.drawGame(contextRef.current, multiHandLandmarks);
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

  useEffect(() => {
    gameState.current.maxActiveCells = faceNum;
  }, [faceNum]);

  return (
    <div className="slap-container">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
      />
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      {gameState.current && (
        <>
          <div className="game-controller">
            <button
              className="custom-btn btn-1"
              onClick={() => {
                setStatus(!status);
                gameState.current.startGame(!status);
              }}
            >
              <span>{status ? 'Stop' : 'Start'}</span>
            </button>
            <img src={cellImgSrc} alt="" id="cell-img-src" />
            <div>
              Faces:{' '}
              <input
                value={faceNum}
                type="number"
                onChange={(e) => {
                  setFaceNum(parseInt(e.target.value) || 1);
                }}
              />
            </div>
          </div>
        </>
      )}
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
