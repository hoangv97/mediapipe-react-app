import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import HandsContainer from './components/Hands';
import SlapContainer from './components/Slap';
import PianoContainer from './components/Piano';
import vbContainer from './components/vb';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: 'vb',
    element: <vbContainer />,
  },
  {
    path: 'hands',
    element: <HandsContainer />,
  },
  {
    path: 'slap-me',
    element: <SlapContainer />,
  },
  {
    path: 'piano',
    element: <PianoContainer />,
  },
  {
    path: 'about',
    element: <div>About</div>,
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <>
    <RouterProvider router={router} />
  </>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
