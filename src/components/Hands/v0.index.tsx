import { useEffect, useRef, useState } from 'react';
import {
  Results,
  Hands,
  HAND_CONNECTIONS,
  VERSION,
  LandmarkConnectionArray,
  Options,
} from '@mediapipe/hands';
import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from '@mediapipe/drawing_utils';
import {
  ControlPanel,
  StaticText,
  Toggle,
  SourcePicker,
  InputImage,
  Rectangle,
  Slider,
  FPS,
} from '@mediapipe/control_utils';
import { LandmarkGrid } from '@mediapipe/control_utils_3d';
import './index.scss';

const HandsContainer = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const landmarkGridRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const grid = useRef<LandmarkGrid>();
  const fps = useRef<FPS>(new FPS());

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (
      inputVideoRef.current &&
      canvasRef.current &&
      landmarkGridRef.current &&
      controlsRef.current
    ) {
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

      grid.current = new LandmarkGrid(landmarkGridRef.current, {
        connectionColor: 0xcccccc,
        definedColors: [
          { name: 'Left', value: 0xffa500 },
          { name: 'Right', value: 0x00ffff },
        ],
        range: 0.2,
        fitToGrid: false,
        labelSuffix: 'm',
        landmarkSize: 2,
        numCellsPerAxis: 4,
        showHidden: false,
        centered: false,
      });

      new ControlPanel(controlsRef.current, {
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
        .add([
          new StaticText({ title: 'MediaPipe Hands' }),
          fps.current,
          new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
          new SourcePicker({
            onFrame: async (input: InputImage, size: Rectangle) => {
              const aspect = size.height / size.width;
              let width: number, height: number;
              if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
              } else {
                width = window.innerWidth;
                height = width * aspect;
              }
              if (canvasRef.current) {
                canvasRef.current.width = width;
                canvasRef.current.height = height;
              }
              await hands.send({ image: input });
            },
          }),
          new Slider({
            title: 'Max Number of Hands',
            field: 'maxNumHands',
            range: [1, 4],
            step: 1,
          }),
          new Slider({
            title: 'Model Complexity',
            field: 'modelComplexity',
            discrete: ['Lite', 'Full'],
          }),
          new Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01,
          }),
          new Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01,
          }),
        ])
        .on((x) => {
          const options = x as Options;
          if (inputVideoRef.current) {
            inputVideoRef.current.classList.toggle(
              'selfie',
              options.selfieMode
            );
          }
          hands.setOptions(options);
        });

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

  const onResults = (results: Results) => {
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      fps.current.tick();

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

      if (grid.current) {
        if (results.multiHandWorldLandmarks) {
          // We only get to call updateLandmarks once, so we need to cook the data to
          // fit. The landmarks just merge, but the connections need to be offset.
          const landmarks = results.multiHandWorldLandmarks.reduce(
            (prev, current) => [...prev, ...current],
            []
          );
          const colors = [];
          let connections: LandmarkConnectionArray = [];
          for (
            let loop = 0;
            loop < results.multiHandWorldLandmarks.length;
            ++loop
          ) {
            const offset = loop * HAND_CONNECTIONS.length;
            const offsetConnections = HAND_CONNECTIONS.map((connection) => [
              connection[0] + offset,
              connection[1] + offset,
            ]) as LandmarkConnectionArray;
            connections = connections.concat(offsetConnections);
            const classification = results.multiHandedness[loop];
            colors.push({
              list: offsetConnections.map((unused, i) => i + offset),
              color: classification.label,
            });
          }
          grid.current.updateLandmarks(landmarks, connections, colors);
        } else {
          grid.current.updateLandmarks([]);
        }
      }
    }
  };

  return (
    <div className="hands-container">
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

      <div className="control-panel" ref={controlsRef}></div>
      <div className="square-box">
        <div className="landmark-grid-container" ref={landmarkGridRef}></div>
      </div>
    </div>
  );
};

export default HandsContainer;
