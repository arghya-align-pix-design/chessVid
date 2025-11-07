import { useEffect, useRef,useState } from "react";
import ChessManager from "./ChessManager";
import { Chess } from "chess.js";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Device, types } from "mediasoup-client";
import type { RtpCapabilities } from 'mediasoup-client/types';
import "./ChessGame.css";

const socket = io("http://localhost:8269",{//"http://localhost:8269",https://chessvid-backend.onrender.com {
  transports: ["websocket"],
  autoConnect: true,
});

const device = new Device();


type Transport = types.Transport;

type TransportOptions = {
  id: string;
  iceParameters: types.IceParameters;
  iceCandidates: types.IceCandidate[];
  dtlsParameters: types.DtlsParameters;
  sctpParameters: types.SctpParameters
};

export interface ConsumerData {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: types.RtpParameters; // use correct import for frontend
}

let RoomId: string;
// Global or module-level
//const opponentProducers: Map<string, { producerId: string; kind: string; socketId: string }> = new Map();


const ChessGame = () =>{

  const localStreamRef = useRef<MediaStream | null>(null);
  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const opponentVideoRef = useRef<HTMLVideoElement | null>(null);
  const opponentAudioRef = useRef<HTMLAudioElement>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransRef = useRef<Transport | null>(null);
  const Rtpss = useRef<RtpCapabilities | null>(null);
  const mySocketRef = useRef<string | null | undefined>(null);
  const producerIdsRef = useRef<{ video?: string; audio?: string }>({});
  const isTransportCreatedRef = useRef(false);


  // Define a ref or state to hold producers
  const producersRef = useRef<{
    video?: types.Producer;
    audio?: types.Producer;
  }>({});

  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  const { roomId } = useParams(); // Get room ID from URL
  const [game, setGame] = useState(new Chess());
  
  useEffect(() => {
    if (!roomId) return;
    console.log("Joining room: from frontend emitted", roomId); // <-- log

    // Join the room //this triggers mediasoup to make a transport as well
    socket.emit("joinRoom", roomId);
    RoomId = roomId;

    mySocketRef.current = socket.id;

    // Receive assigned color
    socket.on("colorAssigned", (color: "white" | "black") => {
      console.log("Assigned color:", color); // <-- log
      setPlayerColor(color);
    });

    // Detect when the opponent joins
    socket.on("opponentJoined", () => {
      console.log("Opponent has joined!"); // <-- log
    });

    console.log("rtcCaps emission went off NOW");
    let rtpsSent = false;
    //request for rtpCapabilities
    socket.emit("send-rtp-capabilities", socket.id);

    //receivED rtp-capabilities
    socket.on("sent-rtp", async (rtpCaps) => {
      if (rtpsSent) {
        return;
      }

      console.log("backend sent RTPCapabilities");
      console.log("rtpCaps are these:",rtpCaps);
      Rtpss.current = rtpCaps; //stored Rtp Capabilities
      //device needs to be loaded
      await device.load({ routerRtpCapabilities: rtpCaps });
      console.log("✅ Device loaded");
      rtpsSent = true;
      if (device.canProduce("video"))
      {// Do getUserMedia() and produce video.
        console.log("VIDEO  CAN BE PRODUCED");
      }
      if (device.canProduce("audio"))
      {// Do getUserMedia() and produce video.
        console.log("AUDIO  CAN BE PRODUCED");
      }
    });

    socket.on("both-players-ready", async () => {

      setTimeout(() => {

      //create Transport
      socket.emit("create-send-transport");

      }, 2000);
    });



    //transport created and received
    let TransCreated = false;
    //Send Transport emission mechanism
    socket.on("transport-created", async (transportOptions) => {
      //Avoid multiple creations from multiple emissions
      if (!TransCreated) {
        if (isTransportCreatedRef.current) {
          console.warn("Transport already created, skipping duplicate setup.");
          return;
        }
        console.log("🟢 Transport options received:", transportOptions);
        if (TransCreated) {
          console.log("Transport aalreaady created");
          return;
        }

        const transport = device.createSendTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
          sctpParameters:  transportOptions.sctpParameters
        });

        //log created sendtransport
        console.log("sending Transport received is:",transport); //transport
        // Optional: Store or use the sendtransport
        sendTransportRef.current = transport;

        // Handle connect and produce events
        if(sendTransportRef.current){
          sendTransportRef.current.on("connect", async ({ dtlsParameters },
          callback) => {
            socket.emit("connect-transport", { dtlsParameters }, callback);
            console.log("send Transport has been connected");
          });

          sendTransportRef.current.on("produce", async ({ kind, rtpParameters },
          callback,errback) => 
          {
            const { id } = sendTransportRef.current!;
            try{
              socket.emit("create-producer",
              {
                transportId: id ,
                kind,
                rtpParameters,
                socketId: mySocketRef.current, // Pass the socketId
                roomId: RoomId, // Pass the roomId
              },
              ({ id }: { id: string, kind:"audio"|"video" }) => {
            callback({ id });
          });
          console.log("send Transport started production");
        }
        catch (error:any)
        {
          // Tell the transport that something was wrong.
          errback(error);
        }
      });
      }
        TransCreated = true;
        socket.emit("create-recv-transport");
      }
    });


    let Recv_Transport_isCreated=false;
    //let vProd = false;
    let aProd = false;

    socket.on("create-recv-transport-response", async (options: TransportOptions) => { 
      //avoid multiple emission lead to multiple creations
      if(!Recv_Transport_isCreated){
        
        console.log("🟢 Receive transport options received:", options);
        if (!options || !options.id) {
          console.error("❌ Invalid transport options");
          return;
        }

        const recvTransport = device.createRecvTransport({
          id: options.id,
          iceParameters: options.iceParameters,
          iceCandidates: options.iceCandidates,
          dtlsParameters: options.dtlsParameters,
          sctpParameters: options.sctpParameters,
        });

        console.log("✅ RecvTransport created:", recvTransport.id);
        recvTransRef.current = recvTransport;
        Recv_Transport_isCreated=true;
      }

      //connecting receiving transport
      if(recvTransRef.current){
        recvTransRef.current.on("connect", async ({ dtlsParameters }, callback) => {
          console.log("receive transport connect event ll be emitted now...");
          socket.emit("connect-recv-transport", { dtlsParameters }, callback);
          console.log("Receiving transport has being connected");
        });

        // recvTransRef.current.on( "consume", async(data) =>{
        //   const consumer = await transport?.consume(
        //   {
        //     id            : data.id,
        //     producerId    : data.producerId,
        //     kind          : data.kind,
        //     rtpParameters : data.rtpParameters
        //   });
        // })
      }

      // 🔥🔥🔥 MUST DO THIS TO TRIGGER THE "produce" EVENT 🔥🔥🔥
      //This is produce method, not PRODUCER
      if (!localStreamRef.current) {
       const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
        localStreamRef.current = stream;
      }
    const stream=localStreamRef.current;
    //const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    //This triggers the `transport.on("produce")` above ⬆️
    // if (sendTransportRef.current) {
    //   const clonedVideoTrack = videoTrack.clone();
    //   const transport=sendTransportRef.current;

    // console.log("Transport fully connected, safe to produce now");

    //       const videoProducer = await transport.produce({
    //         track: videoTrack,
    //       });
        //await videoProducer.resume();
        //console.log("🎥 Video Producer ID:", videoProducer.id);
      //}
      //console.log("maybe vid prod is kipped")

      if (!producersRef.current.audio && audioTrack && !aProd && sendTransportRef.current) {
      const clonedAudioTrack = audioTrack.clone();
      const transport=sendTransportRef.current;
      const audioProducer = await transport.produce({
          track: clonedAudioTrack,
        });
        
        producerIdsRef.current.audio = audioProducer.id;
        producersRef.current.audio = audioProducer;
        aProd = true;
        console.log("🎤 Audio Producer ID:", audioProducer.id);
        console.log("Audio Ref",producersRef.current);
      }

      //console.log("Video Producer ID:", producerIdsRef.current.video);
      console.log("Audio Producer ID:", producerIdsRef.current.audio);

      const VidId=producerIdsRef.current.video;
      const AudId=producerIdsRef.current.audio;
      const rtpCapabilities=Rtpss.current;
      //const transport=sendTransportRef.current;
      console.log(rtpCapabilities);

      //checking if producer is consumable or not
      socket.emit("producer-check",{
        VidId,AudId, rtpCapabilities,
        //transportId:sendTransportRef.current?.id
      });

      // (Optional) You can show your video:
      // if (myVideoRef.current  && stream) {
      //   //setTimeout(() => {
      //     myVideoRef.current!.srcObject = stream;
      //     myVideoRef.current!.autoplay=true;
      //     myVideoRef.current!.muted = true;
      //     myVideoRef.current!.playsInline = true;
      // }
      // ✅ Mark that the transport has been created and setup
      isTransportCreatedRef.current = true;
    });

    const recvTransport=recvTransRef.current;
    

    socket.on("consumer-made", async (serverConsumerData) => {
    console.log("📦 Received consumer info from backend:", serverConsumerData);

    if (!recvTransRef.current) {
      console.error("❌ Recv transport not ready!");
      return;
    }

    // serverConsumerData is the mediasoup server consumer object
    const {
      id,
      producerId,
      kind,
      rtpParameters,
    } = serverConsumerData;
    

    // 4️⃣ Create the corresponding client-side consumer
    try {
      const audioConsumer = await recvTransport!.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      });

      console.log("🎧 Audio consumer created on client:", audioConsumer);

      // 5️⃣ Attach consumer track to an <audio> element
      const stream = new MediaStream();
      stream.addTrack(audioConsumer.track);

      const audioEl = document.createElement("audio");
      audioEl.srcObject = stream;
      audioEl.autoplay = true;
      audioEl.controls = false;
      document.body.appendChild(audioEl);

      console.log("🔊 Audio playback started");

      // 6️⃣ Ask backend to resume consumer (unpause)
      socket.emit("resume-consumer", { consumerId: audioConsumer.id });
      console.log("emitted to resume the audio now")
    } catch (err) {
      console.error("❌ Error consuming from recv transport:", err);
    }
    });
    return () => {
      socket.off("joinRoom"); //valid
      socket.off("colorAssigned");
      socket.off("opponentJoined");
      socket.off("send-rtp-capabilities");
      socket.off("create-transport");
      socket.off("transport-created");
      socket.off("connect-transport");
      //socket.off("produce");
      //socket.off("consume");
      socket.off("create-recv-transport");
      socket.off("transport-connected");
      socket.off("roomFull");
    };
  },[RoomId]);//, //[roomId]); //[roomId]

  return (
    <div>
      <h2>Room ID: {roomId}</h2>
      <h3>
        {playerColor
          ? `You are playing as ${playerColor}`
          : "Waiting for opponent..."}
      </h3>

      {/* Video Elements */}
      <div className="video-container">
        <video id="my-video" ref={myVideoRef}
        style={{ width: '300px', height: '200px', backgroundColor: 'black',objectFit: "cover" }}
         playsInline autoPlay muted ></video>{" "}
        {/* Your video */}
        <video
          id="opponent-video"
          ref={opponentVideoRef}
          autoPlay
          playsInline
          muted//</div>={false}
          style={{ width: "300px", height: "200px", backgroundColor: "black" }}
          className="opponent-video"
        />
        {/* Opponent's video */}
        <audio ref={opponentAudioRef} style={{ display: "none" }} autoPlay />
      </div>
       {playerColor && socket &&(
                <ChessManager game={game} 
                    setGame={setGame} 
                    playerColor={playerColor} 
                    socket={socket} />
            )} 
    </div>
  );
};

export default ChessGame;
