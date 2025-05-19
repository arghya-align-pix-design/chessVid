// import WebSocket from "ws";

// export const WebSocketConnection = (Websock: WebSocket.Server) => {
//   //const wss = new WebSocket.Server({ server, path: "/ws" });

//   Websock.on("connection", (ws:WebSocket) => {
//     console.log("New WebSocket connection established.");

//     ws.on("message", (message) => {
//       console.log("Received:", message.toString());
//       ws.send("Hello World");

//       // Example: Broadcast the message to all connected clients
//       // Websock.clients.forEach((client) => {
//       //   if (client.readyState === WebSocket.OPEN) {
//       //     client.send(message.toString());
//       //   }
//       // });
//     });

//     ws.on("close", () => {
//       console.log("WebSocket client disconnected.");
//     });
//   });

//   console.log("WebSocket server initialized.");
// };
