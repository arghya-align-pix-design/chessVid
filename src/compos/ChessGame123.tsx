import { useEffect, useRef,useState} from "react";
import ChessManager from "./ChessManager";
import { Chess } from "chess.js";
import { useParams } from "react-router-dom";
import { io,} from "socket.io-client";
import { Device, types } from "mediasoup-client";
import "./ChessGame.css";
import { RtpCapabilities } from 'mediasoup-client/types';

//created socket mechanism
const socket = io("http://localhost:8269",{//"http://localhost:8269",https://chessvid-backend.onrender.com {
  transports: ["websocket"],
  autoConnect: true,
});

// //getting the device from mediasoup
const device = await Device.factory();

//Defining the transport type
type Transport = types.Transport;
let DLtsParameters:types.DtlsParameters;

//Defining types
    //Transport Options
    type TransportOptions = {
        id: string;
        iceParameters: types.IceParameters;
        iceCandidates: types.IceCandidate[];
        dtlsParameters: types.DtlsParameters;
        sctpParameters: types.SctpParameters
    };

    //Consumer Data
    export interface ConsumerData {
        id: string;
        producerId: string;
        kind: "audio" | "video";
        rtpParameters: types.RtpParameters; // use correct import for frontend
    }

    let RoomId: string;
    //let RTPcapabilities :RtpCapabilities;

    //Boolean values to check certain actions already happened or not
    let rtpsSent = false;
    let TransCreated = false;
    let recvTransportCreated=false;
    //let vProd = false;
    let aProd = false;
    let sendTransConnected=false;
    let recvTransConnected=false;


const ChessGame=()=>{
    // Define a ref or state to hold producers
    //PRODUCER.
    const producersRef = useRef<{
        video?: types.Producer;
        audio?: types.Producer;
    }>({});
    const producerIdsRef = useRef<{ video?: string; audio?: string }>({});

    const DtlsParameters = useRef<types.DtlsParameters | null>(null);
    //CONSUMER.
    const consumerRef= useRef<{
        video?: types.Consumer;
        audio?: types.Consumer;
    }>({});
    //const consumerIdsRef = useRef<{ video?: string; audio?: string }>({});

    //VARIABLES TO HOLD STUFF.

    //my socket reference
    const mySocketRef = useRef<string | null | undefined>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    //SETTING MY VIDEO ON MY SCREEN
    const myVideoRef = useRef<HTMLVideoElement | null>(null);

    //FOR SETTING ENEMY VIDEO AND AUDIO ON MY SCREEN
    const opponentVideoRef = useRef<HTMLVideoElement | null>(null);
    const opponentAudioRef = useRef<HTMLAudioElement>(null);

    //TRANSPORT REFS(Send and Receive)
    const sendTransportRef = useRef<Transport | null>(null);
    const recvTransRef = useRef<Transport | null>(null);

    //RTPCapabilities storing
    const Rtpss = useRef<RtpCapabilities | null>(null);

    //Transport and Receive Transport created or not:Boolean
    const isTransportCreatedRef = useRef(false);
    //const isRecvTransportCreatedRef = useRef(false);

    //Players data to be recorded
    const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
    const { roomId } = useParams(); // Get room ID from URL
    const [game, setGame] = useState(new Chess());

    useEffect(()=>{
        //if roomId doesnt exists
        if (!roomId) return;
        console.log("Joining room: from frontend emitted", roomId); // <-- log
        console.log("My socket id is:",socket.id)
        
        //Setting RoomId from the params and storing in a variable
        RoomId=roomId;

        // Join the room //this triggers mediasoup to make a transport as well
        socket.emit("joinRoom", roomId);

        //setting my socket info id
        mySocketRef.current = socket.id;
        console.log("mt socket ref:",mySocketRef.current);

        // Detect when the opponent joins
        socket.on("opponentJoined", () => {
            console.log("Opponent has joined!"); // <-- log
        });

        // Receive assigned color
        socket.on("colorAssigned", (color: "white" | "black") => {
            console.log("Assigned color:", color); // <-- log
            setPlayerColor(color);
        });

        //Emission request for creation of send transport
        socket.emit("send-rtp-capabilities",socket.id);

        //Both player ready emission accepted to start transport creation
        socket.on("both-players-ready", async () => {
            setTimeout(() => {
                //create Transport
                socket.emit("create-send-transport");
                
            }, 3000);
        });

        //To emit if RtcParameters being asked or not
        console.log("rtcCaps emission went off NOW");

        //listening about rtpcapabilities received socket on
        socket.on("sent-rtp", async (rtpCaps:RtpCapabilities) => {
            if (rtpsSent) {
                return;
            }
            console.log("backend sent RTPCapabilities");
            console.log("rtpCaps are these:",rtpCaps);
            Rtpss.current = rtpCaps; //stored Rtp Capabilities
            //RTPcapabilities=rtpCaps;
            //device needs to be loaded
            await device.load({ routerRtpCapabilities: Rtpss.current });
            console.log("✅ Device loaded");
            rtpsSent = true;
            console.log("The client RTPS are",device.rtpCapabilities)

            if (device.canProduce("video"))
            {// Do getUserMedia() and produce video.
                console.log("VIDEO  CAN BE PRODUCED");
            }
            if (device.canProduce("audio"))
            {// Do getUserMedia() and produce video.
            console.log("AUDIO  CAN BE PRODUCED");
            }
        })

        //Send Transport emission mechanism
        socket.on("transport-created", async (transportOptions) => {
            //Avoid multiple creations from multiple emissions
            if (!TransCreated) {
                if (sendTransportRef.current) {
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
                if(sendTransportRef.current && !sendTransConnected)
                {
                    
                    sendTransportRef.current.on("connect", async ({ dtlsParameters },
                    callback) =>
                    {
                        socket.emit("connect-transport", { dtlsParameters }, callback);
                        sendTransConnected=true;
                        console.log("send Transport has been connected");
                    });

                    sendTransportRef.current.on("produce", async ({ kind, rtpParameters },
                    callback,errback) =>
                    {
                        const { id } = sendTransportRef.current!;
                        try{
                            socket.emit("create-producer",{
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
                        }catch (error:any)
                        {
                            // Tell the transport that something was wrong.
                            errback(error);
                        }
                    });
                }
                TransCreated = true;
                socket.emit("create-recv-transport");
                console.log("sent create Receive transport from inside produce");
            }
        });

        //creation on receive Transport
        socket.on("create-recv-transport-response", async (options: TransportOptions) => {
            //avoid multiple emission lead to multiple creations
            if(!recvTransportCreated){
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
            
                //connecting receiving transport
                // if(recvTransRef.current && !recvTransConnected){
                    recvTransport.on("connect", async ({ dtlsParameters }, callback) => {
                        console.log("receive transport connect event ll be emitted now...");
                        socket.emit("connect-recv-transport", { dtlsParameters }, ()=>{
                            console.log("✅ Recv transport DTLS connected");
                            recvTransConnected = true;
                            callback()
                        });
                        //recvTransConnected=true;
                        console.log("Receiving transport has being connected");
                    });

                    // recvTransport.on("newConsumer", async(data)=>{
                    //     const consumer = await recvTransport.consume(
                    //     {
                    //         id            : data.id,
                    //         producerId    : data.producerId,
                    //         kind          : data.kind,
                    //         rtpParameters : data.rtpParameters
                    //     });
                    // //     await recvTransport.connect({DLtsParameters.current});
                    // })

                    
                //}
                recvTransportCreated=true;
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
            //     const clonedVideoTrack = videoTrack.clone();
            //     const transport=sendTransportRef.current;

            //     console.log("Transport fully connected, safe to produce now");

            //     // const videoProducer = await transport.produce({
            //     //     track: clonedVideoTrack,
            //     // });
            //     // await videoProducer.resume();
            //     //console.log("🎥 Video Producer ID:", videoProducer.id);
            // }
            console.log("maybe vid prod is kipped")

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

            //const VidId=producerIdsRef.current.video;
            const AudId=producerIdsRef.current.audio;
            const rtpCapabilities=Rtpss.current;

            //const transport=sendTransportRef.current;
            //console.log(rtpCapabilities);

            //checking if producer is consumable or not
            socket.emit("producer-check",{
                //VidId, 
                AudId,rtpCapabilities,
                //transportId:sendTransportRef.current?.id
            });

            //   // (Optional) You can show your video:
            if (myVideoRef.current  && stream) {
                myVideoRef.current.srcObject = stream;
                myVideoRef.current!.autoplay=true;
                myVideoRef.current!.muted = true;
                myVideoRef.current!.playsInline = true;
            }
            // ✅ Mark that the transport has been created and setup
            isTransportCreatedRef.current = true;
        });

        socket.on("consumer-made",async (data) =>{
            
            const recvTransport = recvTransRef.current;
  if (!recvTransport) return console.error("❌ No recv transport found!");

  // STEP 1 — Connect DTLS first
  recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    console.log("📡 Sending DTLS parameters to backend...");

    socket.emit("connect-recv-transport", { dtlsParameters }, async (response) => {
      if (response.success) {
        console.log("✅ Recv transport DTLS connected successfully");
        callback(); // allow mediasoup to proceed
        try {
          // STEP 2 — Now safe to consume
          const consumer = await recvTransport.consume({
            id: data.id,
            producerId: data.producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters,
          });

          const stream = new MediaStream([consumer.track]);

          if (data.kind === "video" && opponentVideoRef.current) {
            opponentVideoRef.current.srcObject = stream;
          } else if (data.kind === "audio" && opponentAudioRef.current) {
            opponentAudioRef.current.srcObject = stream;
          }

          await consumer.resume();
          console.log(`🎥 ${data.kind} consumer started`);
        } catch (err) {
          console.error("❌ Error during consume:", err);
        }
      } else {
        console.error("❌ Backend rejected DTLS connection:", response.error);
        errback(response.error);
      }
    });
  });
            
            
            //try {
                // const recvTransport = recvTransRef.current;
                // if (!recvTransport) return console.error("No recv transport found!");
                //         const consumer = await recvTransport.consume(
                //         {
                //             id            : data.id,
                //             producerId    : data.producerId,
                //             kind          : data.kind,
                //             rtpParameters : data.rtpParameters
                //         });
                //         console.log("✅ Receive Transport connected successfully");
                //         console.log("consumer is this:",consumer);
                //         recvTransConnected = true;

                    // } else {
                    //     console.error("❌ DTLS connection failed:", response.error);
                    // }
                   
                //});

                

            // }catch(err){
            //     console.log(err);
            // }
        })
        

        return () => {
            socket.off("opponentJoined");
            socket.off("colorAssigned");
            socket.off("sent-rtp");
            socket.off("transport-created");
            socket.off("create-recv-transport-response");
        };
    },[]);//roomId
    


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
                className="opponent-video"/>
        
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
}
export default ChessGame;
