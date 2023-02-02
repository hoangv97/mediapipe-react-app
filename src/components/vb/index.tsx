import { useEffect, useRef } from "react";
import './App.css';

function App() {
  const inputVideoRef = useRef();
  const canvasRef = useRef();
  const contextRef = useRef();

  useEffect(() => {
    const constraints = {
      video: { width: { min: 1280 }, height: { min: 720 } },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      console.log(stream);
    });

  }, []);

  return (
    <div className="App">
    
    </div>

  );
}

export default App;