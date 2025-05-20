
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { initializeWorker,getRouter } from "./someConfig/worker";
import { createWebRtcTransport} from "./someConfig/mediasoupManager";// , createConsumer 
import { types } from 'mediasoup';
import { RtpCapabilities } from "./types/RtpCaps";
//import { WebRtcTransport } from "mediasoup";///node/lib/types
import type { RtpParameters, WebRtcTransport,Producer, Consumer } from './types/mediasoup';
//import * as mediasoupTypes from "mediasoup";///node/lib/types, RtpCapabilities


let isMediasoupReady = false;

// Keep this outside of socket handlers, globally scoped in the file:
const mediasoupProducers = new Map<string, Producer>();

//Initializing mediasoup worker 
initializeWorker()
  .then(() => {
    console.log("🎯 Mediasoup Worker and Router ready!");
    isMediasoupReady = true; // ✅ Now router is safe to use
  })
  .catch((err) => {
    console.error("❌ Failed to initialize Mediasoup:", err);
});


// Custom types
interface Player {
  id: string;
  color: "white" | "black";
}

interface Room {
  players: Player[];
}

type ConsumerData = {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
};

interface ConsumeRequest {
  rtpCapabilities: RtpCapabilities;
  roomId: string;
  consumerId: string;
}

interface ServerToClientEvents {
  colorAssigned: (color: "white" | "black") => void;
  opponentJoined: () => void;
  moveMade: (moveData: any) => void;
  roomFull: () => void;
  "sent-rtp": (data: RtpCapabilities) => void; // 👈 Add this
  "transport-created": (data: any) => void;
  "error":(data: any) => void;
  "opponent-video-stream":(data: any) => void;
  "transport-connected": (data: { message: string }) => void; // Add this line
  "recv-transport-created":(transportParams: any) => void;
  "recv-transport-connect-error":(data: any) => void;
  "recv-transport-connected":(data: any) => void;
  "new-consumer": (params:any
  //   producerId,
  //   id: consumer.id,
  //   kind: consumer.kind,
  // rtpParameters: consumer.rtpParameters,
  )=>void;
  "both-players-ready":(data: any) => void;
  "new-producer": {
    producerId: string;
    kind: "audio" | "video";
  };
}

interface ClientToServerEvents { 
  joinRoom: (roomId: string) => void;
  moveMade: (moveData: any) => void;
  // connectTransport: (transportParams: any) => void; // ✅ ADD THIS LINE
  "send-rtp-capabilities":(transportParams: any) => void;
  "create-transport":(transportParams: any) => void;
  "new-producers": (params: { roomId: string; socketId: string; producers: any[] }) => void; 
  "connect-transport": (transportParams: any,callback:any ) => void; // ✅ This matches the exact event name
  "connect-recv-transport":(transportParams: any,callback:any )  => void;
  'create-recv-transport': (data: any, callback: (options: TransportOptions) => void) => void;
  produce: (
    data: {
      kind: "audio" | "video";
      rtpParameters: any;
      senderId:string,
      roomId:string
    },
    callback: (response: { id: string, kind:"audio"|"video" }) => void
  ) => void;
  "ready-to-consume":(params: { roomId: string;}) => void;
  "consume":(params: { rtpCapabilities:RtpCapabilities, roomId:string, consumerId:string}, //kind:"audio"|"video",
    callback:(consumers:ConsumerData[]) => void)=>void; 
  "resume-consumer":(params:{consumerId: string, kind:"audio"|"video"})=>void;
}

// Define the expected types for the consume handler parameters
interface ConsumeParams {
  producerId: string;
  kind: "audio" | "video";
  roomId: string;
  rtpCapss:RtpCapabilities;
}

// Define the expected type for the callback to be called after consuming
type ConsumeCallback = (params: {
  id: string;
    producerId: string;
    kind:"audio" | "video";
    rtpParameters:RtpParameters;
}) => void;

type TransportOptions = {
  id: string;
  iceParameters: any;
  iceCandidates: any;
  dtlsParameters: any;
};


const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: "*" },
});

const rooms: Record<string, Room> = {}; // Store players in rooms
const sendTransports: Record<string, any> = {}; // key = socket.id
const  recvTransports: Record<string, any> = {};
const producers: Record<string, { audio?: Producer, video?: Producer }> = {};
const roomToSockets = new Map<string, Set<string>>(); // you probably have something like this
const socketToRoom = new Map<string, string>();
const socketIdToRecvTransport = new Map<string, WebRtcTransport>();
const socketIdToRtpCapabilities = new Map<string, RtpCapabilities>();
const pendingProducers: Record<string, any[]> = {}; // socketId => producers[]
const readyToConsumeSockets = new Set<string>();
//const consumers: { [socketId: string]: mediasoupTypes.Consumer[] } = {};
const consumers: Record<string, { audio?: Consumer; video?:Consumer }> = {};
let videoProducer:Producer;
let audioProducer:Producer;

//const [rtpCaps,setRtpCaps]=useState<RtpCapabilities>();
let RTPSS:RtpCapabilities;
//const RTPSS= useRef<RtpCapabilities>(null);

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log("🔌 New socket connected:", socket.id);

  socket.data.rtpSent = false;
  socket.data.audP=false;
  socket.data.vidP=false;
  socket.data.audC=false;
  socket.data.vidC=false;

  //Router initiated
  const router = getRouter();
  const { codecs = [] } = router.rtpCapabilities;
  
  socket.on("joinRoom", async (roomId: string) => {

    if (!rooms[roomId]) {
      console.log(`🛠️ Room created: ${roomId}`);
      rooms[roomId] = { players: [] };
    }
    socketToRoom.set(socket.id, roomId);

    //player set with respective roomid c
    const players = rooms[roomId].players;

    // Prevent duplicate connections
    const alreadyInRoom = players.some(p => p.id === socket.id);
    if (alreadyInRoom) return;

    //Checking the length of players in room and not let others join if room full
    if (players.length >= 2) {
      socket.emit("roomFull");
      return;
    }
    
    if (players.length === 0) {
      console.log(`🧍 First player (${socket.id}) joined ${roomId}. Waiting for opponent...`);
    
    } else {
      console.log(`⚔️ Enemy found! ${socket.id} joined room ${roomId}.`);  
    }

    const assignedColor: "white" | "black" = players.length === 0
      ? (Math.random() < 0.5 ? "white" : "black")
      : (players[0].color === "white" ? "black" : "white");

    
    players.push({ id: socket.id, color: assignedColor });
    
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);

    if (!roomToSockets.has(roomId)) {
      roomToSockets.set(roomId, new Set());
    }
    roomToSockets.get(roomId)!.add(socket.id);

    
    //Telling players that opponents joined.
    if (players.length === 2) {
      players.forEach(player => {
        io.to(player.id).emit("opponentJoined");
        io.to(player.id).emit("colorAssigned", player.color);
        // When second player joins
        io.to(roomId).emit("both-players-ready",null);
        console.log("both players ready is emitted");
      });
    }
  });



  socket.on("send-rtp-capabilities", (id) => {

    if (socket.data.rtpSent) return;
      
    if (!isMediasoupReady) {
      socket.emit("error", { message: "Mediasoup not ready yet" });
      return;
    }

    console.log("rtp request JUST RECEIVED");
    socket.emit("sent-rtp", router.rtpCapabilities as any);
    socket.data.rtpSent = true; 
    const rtpCaps = router.rtpCapabilities;
    RTPSS=rtpCaps as RtpCapabilities;
    socketIdToRtpCapabilities.set(id,RTPSS);
    console.log("rtp caps sent alreadyyy");
  });

  socket.on("create-transport", async()=>{
    try{
    const transport = await createWebRtcTransport();
    sendTransports[socket.id] = transport;

    console.log("New Transport created: ");//,transport

    // Send transport parameters to frontend
    if(transport)
    socket.emit("transport-created",{
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    });
    } catch (err) {
    console.error("Transport creation failed", err);
    //callback({ error: err.message });
    }

  });

  // Backend - Handle creating the receive transport
  socket.on("create-recv-transport",async(data: any, // or just `null`, but you must accept it because the emit sends two arguments
    callback: (transportOptions: TransportOptions) => void) =>{
    try {
      const transport=await createWebRtcTransport();

      console.log("✅ Receive transport created for", socket.id);
      recvTransports[socket.id]=transport;
      console.log("stored recvTransport on BE: ", recvTransports[socket.id]);

      // Send transport details back to the client
      if(transport)
      callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
      });
      else{
        console.log ("recv transport failed");
        return;
      }

      // Store the transport for future use (e.g., consuming)
      recvTransports[socket.id]=transport;
      //to retrieve let fetch= recvTransport[socket.id]

  } catch (error) {
      console.error("❌ Error creating receive transport", error);
      socket.emit("error", { message: "Failed to create receive transport" });
    }
});

  socket.on("resume-consumer",async ({consumerId,kind}:{consumerId:string, kind: "audio"|"video"})=>{
      const consumerContainer= consumers[socket.id];

      if (!consumerContainer) {
        console.warn(`⚠️ No consumers found for socket ${socket.id}`);
        return;
      }

      const consumer = kind === "video" ? consumerContainer.video : consumerContainer.audio;

      if (!consumer) {
        console.warn(`⚠️ No ${kind} consumer found for socket ${socket.id}`);
        return;
      }

      if (consumer.id !== consumerId) {
        console.warn(`❗Consumer ID mismatch for ${kind}: expected ${consumer.id}, got ${consumerId}`);
        return;
      }

      try {
        //await consumer.resume();
        console.log(`✅ ${kind.toUpperCase()} consumer resumed for socket ${socket.id}`);
      } catch (err) {
        console.error(`❌ Failed to resume ${kind} consumer for socket ${socket.id}`, err);
      }
  })

  
  socket.on("connect-transport", async ({ dtlsParameters }, callback) => {
  
    //SEND TRANSPORT WAS CREATED AND TRIED TO CONNECT
    const transport = sendTransports[socket.id]; // Or recvTransports if it's a receive transport
    if (transport.__connected) {
      console.log("🔁 Transport already connected, skipping...");
      return callback(); // Still call it to unblock frontend
    }
  
    try {
      if (!transport) {
        console.error("Transport not found for socket:", socket.id);
        return;
      }

      await transport.connect({ dtlsParameters });

      transport.__connected = true; // Mark as connected

      console.log("✅ Transport connected for", socket.id);
      callback(); // Tell client we're done
    
    } catch (error) {
        console.error("❌ Error connecting transport:", error);
        // errback can be passed instead if needed
      }
  });


  socket.on("connect-recv-transport", async ({ dtlsParameters }, callback) => {

    const recvTransport = recvTransports[socket.id];

    if (!recvTransport) {
      console.error("❌ Receive transport not found for socket: in connect recv", socket.id);
      return;
    }

    if (recvTransport.__connected) {
      console.log("🔁 RecvTransport already connected, skipping...");
      return callback(); // Still unblock frontend
    }

    try {
      await recvTransport.connect({ dtlsParameters });
      recvTransport.__connected = true;

      console.log("✅ RecvTransport connected for", socket.id);
      callback(); // Let frontend proceed

    } catch (error) {

      console.error("❌ Error connecting recvTransport:", error);
      // You can also call `errback(error)` if the frontend uses it
    
    }
  });

  socket.on("produce", async ({ kind, rtpParameters,senderId, roomId }, callback) => {
    const transport = sendTransports[socket.id];

    //IF TRANSPORT ALREADY EXISTS
    if (!transport) {
      console.error(`No transport found for ${socket.id}`);
      socket.emit("error", { message: "Transport not found" });
      return;
    }

    //producers[socket.id] = producer; // Optional: Store for later
    if (!producers[socket.id]) producers[socket.id] = {};

    if (producers[socket.id]?.[kind]) {
      console.log(`Producer for ${kind} already exists for ${socket.id}`);
      return;// callback({ id: producers[socket.id]![kind]!.id }); // Non-null assertion since we just checked
    }

    try {
      
      if(socket.data.vidP && socket.data.audP)
      {
        console.log("both producers made, go back control");
        return;
      }

      const producer = await transport.produce({ kind, rtpParameters });
      
      //producers are stored in object via socketid of user
      producers[socket.id][kind]=  producer;

      if(kind==="audio"){
        audioProducer = producer;
        console.log(`AUDIO Producer created: ${producer.id} for ${socket.id}  ${kind}`);
        socket.data.audP=true;
      }else{
        videoProducer=producer;
        console.log(`🎥 VIDEO Producer created: ${producer.id} for ${socket.id}  ${kind}`);
        socket.data.vidP=true;
      }
      
      console.log(`producer for socket ${socket.id}: id is ${producer.id}`);  //${producer} 
      mediasoupProducers.set(producer.id, producer);
        
      // ✅ Step 1: Emit this to other players in the room
      (socket as any).to(roomId).emit("new-producer", { 
        producerId: producer.id,
        kind: producer.kind,
        socketId: socket.id 
      });

      callback({ id:producer.id,kind:producer.kind }); // Send producer ID back to client

    }
    catch (err) {

      console.error(`❌ Producer creation failed for ${socket.id}`, err);
      
      socket.emit("error", { message: "Failed to create producer" });
    } 
  });


  //this request comes from inside transport created
  //this evennt is triggered by the  transport
  socket.on(
    "consume",
    async (
    { rtpCapabilities, roomId, consumerId }: ConsumeRequest,
      callback: (consumers: ConsumerData[]) => void
    ) => {
    try {

      if(socket.data.vidC  && socket.data.audC){
        console.log("return, both consumers are created");
        return;
      }

      //const { rtpCapabilities, roomId, consumerId } = args;
      const senderId= socket.id;
      console.log(`sender id is ${senderId}`);

      const room = rooms[roomId];
      if (!room) {
        console.error("❌ Room not found");
        return;
      }

      const opponentSocket = room.players.find(player => player.id!== senderId );
      if(opponentSocket)
      console.log(`Opponent Found : ${opponentSocket.id}`);
      
      
      if (!opponentSocket) {
      
        console.error("❌ Opponent not found in room");
        return;
      
      }

      const recvTransport =recvTransports[senderId];//recvTransports[opponentSocket.id];
      console.log(`Sender ${senderId} recvTransport found`);

      if (!recvTransport) {
        console.error("❌ Receive transport not found for in consume", socket.id);
        return;
      }

      const opponentProducers = producers[opponentSocket.id];
      console.log(`Producers of opponent ${opponentSocket} is ${opponentProducers}`);

      if (!opponentProducers) {
        console.error("❌ No producers found for opponent", opponentSocket.id);
        return;
      
      }

      const consumersData :ConsumerData[] = [];;

      for (const kind of ["audio", "video"] as const) {
          const producer = opponentProducers[kind as "audio" | "video"];
          if (!producer) continue;

          const consumer = await recvTransport.consume({
            producerId: producer.id,
            rtpCapabilities, 
            paused: false  //await createConsumer(
          //   recvTransport,
          //   producer.id,
          //   rtpCapabilities
          // );
          });

          await consumer.resume();

          if (!consumers[senderId]) consumers[senderId] = {};
          
          if(kind==="video")
          {
            if(socket.data.vidC){console.log("Vid Consumer made");
              return;
            }
            socket.data.vidC=true;
            consumers[senderId][kind] = consumer;
            console.log(`${kind} this type consumer ${consumer.id} using producer ${producer.id} `);
          }else{

            if(socket.data.audC){console.log("Aud Consumer made");
              return;
            }

            socket.data.audC=true;
            consumers[senderId][kind] = consumer;
            console.log(`${kind} this type consumer ${consumer.id} using producer ${producer.id} `)
          }

          consumersData.push({
            id: consumer.id,
            producerId: producer.id,
            kind,
            rtpParameters: consumer.rtpParameters
          });
        await consumer.resume();
      }

      // Send all consumers at once
      callback(consumersData);

      console.log("✅ Consumers created and sent to", senderId);

    } catch (err) {
    
      console.error("❌ Error in consume:", err);
    }
  });

  
  socket.on("moveMade", (moveData: any) => {
    const roomIds = [...socket.rooms].filter(r => r !== socket.id);
    const roomId = roomIds[0];
    if (roomId) {
      console.log(`♟️ Move in room ${roomId}:`, moveData);
      socket.to(roomId).emit("moveMade", moveData);
    }
  });


  socket.on("disconnect", () => {

    console.log(`This user disconnected: ${socket.id}`);
    delete producers[socket.id];

    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      roomToSockets.get(roomId)?.delete(socket.id);
      socketToRoom.delete(socket.id);
    }

    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        delete rooms[roomId];
      }
    }

    // delete producers[socket.id];
    // delete consumers[socket.id];
    // delete sendTransports[socket.id];
    // delete recvTransports[socket.id];

    if (sendTransports[socket.id]) {
      sendTransports[socket.id].close(); // 🚀 This properly frees resources
      delete sendTransports[socket.id];
    }
    
    if(recvTransports[socket.id]){
      recvTransports[socket.id].close();
      delete recvTransports[socket.id];
    }

    if (producers[socket.id]) {
      delete producers[socket.id];
    }
    const userConsumers = consumers[socket.id] || [];
  // userConsumers.forEach((consumer) => {
  //   try {
  //     consumer.close();
  //   } catch (err) {
  //     console.error("Error closing consumer:", err);
  //   }
  // });
  delete consumers[socket.id];

  });
});

server.listen(8269, () => console.log("Server running on port 8269"));

