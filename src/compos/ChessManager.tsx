import { useEffect,useState } from "react";
import { Chess, Move, Square } from "chess.js";
import ChessBoard from "./chessBoard";
import { Socket } from "socket.io-client";

type MoveData = {
    from: Square;
    to: Square;
    fen: string;
};

type ChessManagerProps = {
    game: Chess;
    setGame: (game: Chess) => void;
    playerColor: "white" | "black";
    socket: Socket;
};

const ChessManager = ({ game, setGame, playerColor, socket }: ChessManagerProps) => {
    const [warning, setWarning] = useState("");
    
    useEffect(()=>{
        
        // Listen for opponent's move
        socket.on("moveMade", handleOpponentMove);
        return () => {
            socket.off("moveMade", handleOpponentMove); // clean up
        };
    
    },[socket, setGame])

    const handleOpponentMove = ({ from, to, fen }: MoveData) => {
        console.log(`Move received: ${from} -> ${to}`);
        const gameCopy = new Chess(fen);
        setGame(gameCopy);
        if (gameCopy.isCheckmate()) {
            const winner = playerColor === "white" ? "Black" : "White";
            alert(`♟️ Checkmate! ${winner} wins!`);
        } else if (gameCopy.isDraw()) {
            alert("🤝 It's a draw!");
        } else if (gameCopy.isStalemate()) {
            alert("😐 Stalemate!");
        }

    };


    const handleMove = (move: { from: Square; to: Square }): boolean => {
        const turn = game.turn(); // 'w' or 'b'
        const isPlayerTurn =
            (playerColor === "white" && turn === "w") ||
            (playerColor === "black" && turn === "b");

        if (!isPlayerTurn) {
            console.log("Not your turn");
            setWarning("⛔ Not your turn!");
            setTimeout(() => setWarning(""), 2000);
            return false;
            //return false;
        }

        const gameCopy = new Chess(game.fen());
        setGame(gameCopy);
        try{
            const result: Move | null = gameCopy.move(move);


        if (result) {
            setGame(gameCopy); // Update board

            // Emit move to the opponent
            socket.emit("moveMade", { from: move.from, to: move.to, fen: gameCopy.fen() });

             // Check for game over conditions
            if (gameCopy.isCheckmate()) {
                const winner = playerColor === "white" ? "White" : "Black";
                alert(`♟️ Checkmate! ${winner} wins!`);
            } else if (gameCopy.isDraw()) {
                alert("🤝 It's a draw!");
            } else if (gameCopy.isStalemate()) {
                alert("😐 Stalemate!");
            }
            return true; // Move is valid
        }
        else {
            setWarning("🚫 Invalid move!");
            setTimeout(() => setWarning(""), 2000);
            return false;
        }
        }catch(err){
            console.warn("Caught invalid move:", err);
            setWarning("🚫 Illegal move!");
            setTimeout(() => setWarning(""), 2000);
            return false;
        }
       
        //return false; // Invalid move
    };
    return(
        <div>
            {warning && <p style={{ color: "red", fontWeight: "bold" }}>{warning}</p>}
            <ChessBoard position={game.fen()} onMove={handleMove} playerColor={playerColor} />;
        </div>
    )
};

export default ChessManager;
