import { useEffect, useRef, useState } from "react";
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
const opponentProducers: Map<string, { producerId: string; kind: string; socketId: string }> = new Map();


const ChessGame = () => {
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
  const consumerRef = useRef<{
    video?: types.Consumer;
    audio?: types.Consumer;
  }>({});

  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(
    null
  );
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
      //setOpponentJoined(true);
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
      console.log(rtpCaps);
      Rtpss.current = rtpCaps; //stored Rtp Capabilities
      //device needs to be loaded
      await device.load({ routerRtpCapabilities: rtpCaps });
      console.log("✅ Device loaded");
      rtpsSent = true;

      if (device.canProduce("video"))
      {
        // Do getUserMedia() and produce video.
        console.log("VIDEO  CAN BE PRODUCED");
      }

      if (device.canProduce("audio"))
      {
        // Do getUserMedia() and produce video.
        console.log("AUDIO  CAN BE PRODUCED");
      }
    });

    socket.on("both-players-ready", async () => {

      setTimeout(() => {

      //create Transport
      socket.emit("create-transport");

      }, 2000);
    });



    //transport created and received
    let TransCreated = false;
    let vProd = false;
    let aProd = false;

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
        TransCreated = true;
        socket.emit("create-recv-transport");
      }
    });


    let Recv_Transport_isCreated=false;

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
      
       // Handle connect and produce events
      if(sendTransportRef.current){
        sendTransportRef.current.on("connect", async ({ dtlsParameters }, callback) => {
        //, errback
        socket.emit("connect-transport", { dtlsParameters }, callback);
        console.log("send Transport has been connected");
      });

       sendTransportRef.current.on("produce", async ({ kind, rtpParameters }, callback) => {
        socket.emit(
          "produce",
          {
            kind,
            rtpParameters,
            socketId: mySocketRef.current, // Pass the socketId
            roomId: RoomId, // Pass the roomId
          },
          ({ id }: { id: string, kind:"audio"|"video" }) => {  //,kind
            callback({ id });
          }
        );

        console.log("send Transport started production");
      });
      }

      //connecting receiving transport
      if(recvTransRef.current){
        recvTransRef.current.on("connect", async ({ dtlsParameters }, callback) => {
          console.log("receive transport connect event ll be emitted now...");
          socket.emit("connect-recv-transport", { dtlsParameters }, callback);
          console.log("Receiving transport has being connected");
        });
      }

      // 🔥🔥🔥 MUST DO THIS TO TRIGGER THE "produce" EVENT 🔥🔥🔥
       const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      // This triggers the `transport.on("produce")` above ⬆️
      if (!producersRef.current.video && videoTrack && !vProd && sendTransportRef.current) {
        const videoProducer = await sendTransportRef.current.produce({
          track: videoTrack,
          encodings   :
          [
            { maxBitrate: 100000 },
            { maxBitrate: 300000 },
            { maxBitrate: 900000 }
          ],
          codecOptions :
          {
            videoGoogleStartBitrate : 1000
          }
        });

        producerIdsRef.current.video = videoProducer.id;
        producersRef.current.video = videoProducer;
        vProd = true;
        await videoProducer.resume();
        console.log("🎥 Video Producer ID:", videoProducer.id);
      }

       if (!producersRef.current.audio && audioTrack && !aProd && sendTransportRef.current) {
        const audioProducer = await sendTransportRef.current.produce({ 
          track: audioTrack,
        });
        
        producerIdsRef.current.audio = audioProducer.id;
        producersRef.current.audio = audioProducer;
        aProd = true;
        console.log("🎤 Audio Producer ID:", audioProducer.id);
      }

      console.log("Video Producer ID:", producerIdsRef.current.video);
      console.log("Audio Producer ID:", producerIdsRef.current.audio);

      // (Optional) You can show your video:
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // ✅ Mark that the transport has been created and setup
      isTransportCreatedRef.current = true;
    });


    });
    //catching opponent producers
    socket.on("new-producer", ({ producerId, kind, socketId }) => {
      console.log("New producer received:", producerId, kind, "from", socketId);

      // Store in the map
      opponentProducers.set(producerId, { producerId, kind, socketId });

      // Or, if using object
      // opponentProducersBySocket[socketId] = { producerId, kind };

      // Optionally auto-consume here
      // consumeProducer(producerId);

      let vPlayer=false;
      //let aPlayer=false;
      let vidSet=false;

      socket.emit(
          "consume",
          {
            producerId,
            kind,
            rtpCapabilities: Rtpss.current,
            roomId: RoomId,
            //consumerId: mySocketRef.current, // who wants to consume
          },async (consumers: ConsumerData[]) => {
            try {
              for (const consumerData of consumers) {
                const { id, producerId, kind, rtpParameters } = consumerData;

                const recvTransport = recvTransRef.current;
                //const recvTransport=recvTransRef.current;
              
                if (recvTransport) {
                  const consumer = await recvTransport.consume({
                    id,
                    producerId,
                    kind,
                    rtpParameters,
                    //paused: true  // Start paused!
                  });

                   //await consumer.pause();

                  // Save or attach consumer to your refs
                  if (kind === "video") {
                    if(vPlayer){console.log("videoStream added already");
                      return;
                    }
                    consumerRef.current.video = consumer;

                    const stream = new MediaStream();

                     stream.addTrack(consumer.track);
                   if(!vidSet){
                   if (kind === "video" && opponentVideoRef.current) {
                    // console.log("🏷️ stream tracks: ", stream.getTracks());
                    // opponentVideoRef.current.srcObject =new MediaStream([consumer.track]); //stream;
                    // console.log("Creating video from consumer   --:", consumer.track);

                    // await consumer.resume();
                    // //opponentVideoRef.current.play().catch(console.error); // force play
                    // setTimeout(() => {
                    //   opponentVideoRef.current?.play().catch((err) => {
                    //   console.error("❌ Error playing video:", err);
                    //   });
                    // }, 3000);
                    // opponentVideoRef.current.playsInline = true;
                    // //opponentVideoRef.current.style.width = "200px"; // customize as needed
                    // opponentVideoRef.current.autoplay = true;
                    // opponentVideoRef.current.style.border = "2px solid limegreen";
                    // opponentVideoRef.current.muted = false;

                    // const video = document.createElement('video');
                    // video.srcObject = stream;
                    // video.autoplay = true;
                    // video.playsInline = true;
                    // video.muted = true; // Set to true if it's your own video
                    // video.style.width = '300px';
                    // video.style.height = '200px';
                    // video.style.background = 'black';
                    // video.style.border = '2px solid lime';
                    // document.body.appendChild(video); // 🚨 Temporarily inject into body to debug
                     vidSet=true;

                    // setTimeout(() => {
                    //   video.play().catch((err) => {
                    //   console.error("❌ Error playing video:", err);
                    //   });
                    // }, 3000);
                    
                    // await consumer.resume();

                    // console.log("✅ Video element added to DOM", video);

                    //const videoTrack = consumer.track;

                    // const imageCapture = new ImageCapture(videoTrack);

                    // imageCapture.grabFrame()
                    //   .then(imageBitmap => {
                    //     console.log("Frame grabbed from track:", imageBitmap);
                    //   })
                    //   .catch(err => {
                    //     console.error("Failed to grab frame:", err);
                    //   });
                    console.log("Track enabled:", consumer.track.enabled);
                    console.log("Track muted:", consumer.track.muted);
                    console.log("Track readyState:", consumer.track.readyState);
                    vPlayer=true;

                    

                    console.log("we ll add track now: VIDEO");

                    // Resume when frontend is ready
                    socket.emit("resume-consumer", {
                      consumerId: consumer.id,
                      kind,
                    });
                    }
                    }
                  
                  
                  
                  
                  
                  } else if (kind === "audio") {
                    consumerRef.current.audio = consumer;
                    //return;
                  }
                  console.log("consumer is created");

                  // Resume when frontend is ready
                  //await socket.emit("resume-consumer", { consumerId: consumer.id, kind });
                  //await consumer.resume();
                  // Attach to video/audio tag
                  // const stream = new MediaStream();
                  // stream.addTrack(consumer.track);

                  // console.log("we ll add track now");

                  // if (kind === "video" && opponentVideoRef.current) {
                  //   console.log("🏷️ stream tracks: ", stream.getTracks());
                  //   opponentVideoRef.current.srcObject = stream;
                  //   opponentVideoRef.current.play().catch(console.error); // force play
                  //   setTimeout(() => {
                  //     opponentVideoRef.current?.play().catch((err) => {
                  //     console.error("❌ Error playing video:", err);
                  //     });
                  //   }, 3000);
                    // opponentVideoRef.current.playsInline = true;
                    // //opponentVideoRef.current.style.width = "200px"; // customize as needed
                    // opponentVideoRef.current.autoplay = true;
                    // opponentVideoRef.current.style.border = "2px solid limegreen";
                    // opponentVideoRef.current.muted = false;
                    

                    // console.log("we ll add track now: VIDEO");

                    // // Resume when frontend is ready
                    // socket.emit("resume-consumer", {
                    //   consumerId: consumer.id,
                    //   kind,
                    // });
                  // } else if (kind === "audio" && opponentAudioRef.current) {
                  //   //const audio = new Audio();
                  //   console.log("🏷️ stream tracks: ", stream.getTracks());
                  //   opponentAudioRef.current!.srcObject = stream;
                  //   opponentAudioRef.current.autoplay = true;
                  //   opponentAudioRef.current.controls = false;
                  //   console.log("we ll add track now:AUDIO");
                  //  // audio.srcObject = stream;
                    //audio.play();
                    //console.log

                    // Resume when frontend is ready
                  //   socket.emit("resume-consumer", {
                  //     consumerId: consumer.id,
                  //     kind,
                  //   });
                  //   console.log("resume is called");
                  // }

                  //socket.emit("resume-consumer-flow",{consumerId})

                  //console.log("✅ Consumer created for", kind);
                }
              }
            } catch (error) {
              console.error("❌ Error creating consumer:", error);
            }
          }
        );
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
  }, [roomId]); //[roomId]

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
        <video id="my-video" ref={myVideoRef} autoPlay muted></video>{" "}
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
