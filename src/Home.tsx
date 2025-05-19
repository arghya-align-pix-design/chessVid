import { useState } from "react";
import { useNavigate } from "react-router-dom";


export const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState<string | null>(null);

  const createRoom = () => {
      const newRoomId = Math.random().toString(36).substring(2, 8); // Random ID
      setRoomId(newRoomId);
      navigate(`/room/${newRoomId}`);
  };

  return (
      <div>
          <h1>Chess Multiplayer</h1>
          <button onClick={createRoom}>Create Game Room</button>
          {roomId && (
        <div>
          <p>Share this link with your friend:</p>
          <input
            value={`${window.location.origin}/room/${roomId}`}
            readOnly
            style={{ width: "300px" }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() =>
              navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
            }
          >
            Copy
          </button>
        </div>
      )}

      </div>
  );
};