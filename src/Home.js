import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
export const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState(null);
    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substring(2, 8); // Random ID
        setRoomId(newRoomId);
        navigate(`/room/${newRoomId}`);
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Chess Multiplayer" }), _jsx("button", { onClick: createRoom, children: "Create Game Room" }), roomId && (_jsxs("div", { children: [_jsx("p", { children: "Share this link with your friend:" }), _jsx("input", { value: `${window.location.origin}/room/${roomId}`, readOnly: true, style: { width: "300px" }, onClick: (e) => e.target.select() }), _jsx("button", { onClick: () => navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`), children: "Copy" })] }))] }));
};
