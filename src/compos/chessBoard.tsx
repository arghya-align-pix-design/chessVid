
import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";

type ChessBoardProps = {
    position: string; // FEN string to represent the board state
    onMove: (move: { from: Square; to: Square }) => boolean; // Function handling piece movement
    playerColor: "white" | "black"; // Player's color
};

const ChessBoard = ({ position, onMove, playerColor }:ChessBoardProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* <h2>You are playing as {playerColor}</h2> */}
            <Chessboard
                position={position}
                onPieceDrop={(sourceSquare, targetSquare) => onMove({ from: sourceSquare, to: targetSquare })}
                boardOrientation={playerColor} // Ensures correct perspective
                // Disallow piece dragging unless it's your color's turn
                boardWidth={500} // 👈 Adjust this to your desired size (e.g., 600 for large screens)
                isDraggablePiece={({ piece }) => {
                    const pieceColor = piece.charAt(0) === "w" ? "white" : "black";
                    return pieceColor === playerColor;
                }}
                />
        </div>
    );
};

export default ChessBoard;


