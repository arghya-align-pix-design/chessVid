//import express from "express";
const express=require ("express");
const http= require ("http");
//import http from "http";
// import  {Server} from "socket.io";
// import cors from "cors";
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
}); 

const rooms = {}; // Store players in rooms

io.on("connection", (socket) => {
    
    console.log("🔌 New socket connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
        if (!rooms[roomId]) {
            console.log(`🛠️ Room created: ${roomId}`);
            rooms[roomId] = { players: [] };
        }

        const players = rooms[roomId].players;

         // Prevent duplicate connections
        const alreadyInRoom = players.some(p => p.id === socket.id);
        if (alreadyInRoom) return;

        if (players.length >= 2) {
            socket.emit("roomFull");
            return;
        }

        // Log and update based on number of players
        if (players.length === 0) {
            console.log(`🧍 First player (${socket.id}) joined ${roomId}. Waiting for opponent...`);
        } else {
            console.log(`⚔️ Enemy found! ${socket.id} joined room ${roomId}.`);
        }

        // Assign color
        const assignedColor = players.length === 0
        ? (Math.random() < 0.5 ? "white" : "black")
        : (players[0].color === "white" ? "black" : "white");

        players.push({ id: socket.id, color: assignedColor });
        socket.join(roomId);
        

        // Notify both players if room is full
        if (players.length === 2) {
        players.forEach(player => {
            io.to(player.id).emit("opponentJoined");
            io.to(player.id).emit("colorAssigned", player.color);
        });
    }
    });

    // 👉 LISTEN for moves
    socket.on("moveMade", (moveData) => {
        const rooms = [...socket.rooms].filter(r => r !== socket.id);
        const roomId = rooms[0];
        if (roomId) {
            console.log(`♟️ Move in room ${roomId}:`, moveData);
            socket.to(roomId).emit("moveMade", moveData);
        }
    });

    socket.on("disconnect", () => {
        // Clean up player from rooms
        console.log(`This user disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter((p) => p.id !== socket.id);
    
            if (room.players.length === 0) {
                delete rooms[roomId];
            }
        }
    });


});

server.listen(10000, () => console.log("Server running on port 10000"));
//