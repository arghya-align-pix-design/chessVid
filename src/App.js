import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
//import { useState } from 'react'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
import './App.css';
import { BrowserRouter as Router, Routes, Route, } from "react-router-dom";
import ChessGame from "./compos/ChessGame";
import { Home } from "./Home";
const App = () => {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/room/:roomId", element: _jsx(ChessGame, {}) })] }) }));
};
export default App;
