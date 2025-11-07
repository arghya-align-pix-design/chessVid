//import { useState } from 'react'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route,} from "react-router-dom";
//import ChessGame from "./compos/ChessGame";
import { Home } from "./Home";
import ChessGame from "./compos/ChessGame";


const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>} />
                {/* <Route path="/" element={<ChessGame/>} /> */}
                <Route path="/room/:roomId" element={<ChessGame />} />
            </Routes>
        </Router>
    );
};

export default App;

// function App() {

//   return (
//     <>
//       <ChessGame/>  
//     </>
//   )
// }

// export default App
