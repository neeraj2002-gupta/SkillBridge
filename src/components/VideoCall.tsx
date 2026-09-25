import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  User,
  AlertCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

type Props = {
  roomName: string;
  displayName?: string;
  userId?: string;
  onClose: () => void;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCall({ roomName, displayName, userId, onClose }: Props) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState<"connecting" | "waiting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    async function initCall() {
      try {
        setStatus("connecting");

        // 1. Capture camera & mic stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Connect to Socket.io WebRTC signaling server
        const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000";
        const socket = io(socketUrl, {
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isSubscribed) return;
          setStatus("waiting");
          socket.emit("join-room", {
            roomId: roomName,
            userId: userId || displayName || "Guest",
          });
        });

        socket.on("connect_error", (err) => {
          console.warn("Signaling connection warning:", err.message);
        });

        // Helper function: Create Peer Connection
        const createPeerConnection = (targetSocketId: string) => {
          if (pcRef.current) {
            pcRef.current.close();
          }

          const pc = new RTCPeerConnection(ICE_SERVERS);
          pcRef.current = pc;

          // Add local media tracks to WebRTC peer connection
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          // Handle incoming remote media tracks
          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              remoteStreamRef.current = event.streams[0];
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
              }
              if (isSubscribed) setStatus("connected");
            }
          };

          // Send ICE candidates via signaling socket
          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
              socketRef.current.emit("ice-candidate", {
                targetSocketId,
                candidate: event.candidate,
              });
            }
          };

          pc.onconnectionstatechange = () => {
            if (!isSubscribed) return;
            if (pc.connectionState === "connected") {
              setStatus("connected");
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
              setStatus("disconnected");
            }
          };

          return pc;
        };

        // 3. Signaling socket listeners for WebRTC peer connection
        socket.on("user-joined", async ({ socketId }: { socketId: string; userId: string }) => {
          if (!isSubscribed) return;
          setStatus("connecting");
          const pc = createPeerConnection(socketId);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("offer", {
            targetSocketId: socketId,
            sdp: offer,
          });
        });

        socket.on("offer", async ({ callerSocketId, sdp }: { callerSocketId: string; sdp: RTCSessionDescriptionInit }) => {
          if (!isSubscribed) return;
          setStatus("connecting");
          const pc = createPeerConnection(callerSocketId);

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process queued ICE candidates
          while (candidateQueueRef.current.length > 0) {
            const cand = candidateQueueRef.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("answer", {
            targetSocketId: callerSocketId,
            sdp: answer,
          });
        });

        socket.on("answer", async ({ sdp }: { responderSocketId: string; sdp: RTCSessionDescriptionInit }) => {
          if (!isSubscribed || !pcRef.current) return;
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process queued ICE candidates
          while (candidateQueueRef.current.length > 0) {
            const cand = candidateQueueRef.current.shift();
            if (cand) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
          }
        });

        socket.on("ice-candidate", async ({ candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            candidateQueueRef.current.push(candidate);
          }
        });

        socket.on("user-disconnected", () => {
          if (!isSubscribed) return;
          setStatus("disconnected");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          toast.info("Partner has left the call");
        });
      } catch (err: unknown) {
        if (!isSubscribed) return;
        const msg = err instanceof Error ? err.message : "Could not access media devices.";
        console.error("Camera/Mic Error:", err);
        setErrorMessage(msg);
        setStatus("error");
        toast.error(`Media access failed: ${msg}`);
      }
    }

    initCall();

    return () => {
      isSubscribed = false;
      cleanupCall();
    };
  }, [roomName, displayName, userId]);

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit("leave-room", { roomId: roomName });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    candidateQueueRef.current = [];
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !cameraOn;
      });
      setCameraOn(!cameraOn);
    }
  };

  const handleEndCall = () => {
    cleanupCall();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 text-white backdrop-blur-xl">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 items-center justify-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "connected"
                  ? "bg-emerald-500 animate-pulse"
                  : status === "connecting" || status === "waiting"
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-500"
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide">
              SkillBright P2P WebRTC Call
            </h2>
            <p className="text-xs text-white/60">
              Room: <span className="font-mono text-primary-foreground">{roomName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 border border-white/10">
            {status === "connected" && "🟢 WebRTC Connected"}
            {status === "waiting" && "⏳ Waiting for partner..."}
            {status === "connecting" && "🔄 Connecting..."}
            {status === "disconnected" && "⚠️ Partner Disconnected"}
            {status === "error" && "❌ Connection Error"}
          </span>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-rose-600 active:scale-95"
          >
            <PhoneOff className="h-4 w-4" /> Leave Call
          </button>
        </div>
      </header>

      {/* Main Video Stage */}
      <main className="relative flex-1 p-4 md:p-6 flex items-center justify-center overflow-hidden">
        {status === "error" ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center max-w-md backdrop-blur-md">
            <AlertCircle className="h-12 w-12 text-rose-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Media Access Denied</h3>
              <p className="mt-1 text-xs text-white/70">
                {errorMessage || "Please allow microphone and camera permissions in your browser to start video calls."}
              </p>
            </div>
            <button
              onClick={handleEndCall}
              className="mt-2 rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold hover:bg-white/20 transition"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div className="relative h-full w-full max-w-5xl rounded-3xl overflow-hidden border border-white/15 bg-black/40 shadow-2xl flex items-center justify-center">
            {/* Remote Video (Full Stage) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover transition-opacity duration-500 ${
                status === "connected" ? "opacity-100" : "opacity-0 absolute inset-0"
              }`}
            />

            {/* Remote Video Placeholder when waiting or disconnected */}
            {status !== "connected" && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="relative grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
                  <User className="h-12 w-12 text-white/60" />
                  {(status === "connecting" || status === "waiting") && (
                    <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {status === "waiting" && "Waiting for partner to join..."}
                    {status === "connecting" && "Establishing encrypted P2P WebRTC connection..."}
                    {status === "disconnected" && "Partner left the room"}
                  </h3>
                  <p className="mt-1 text-xs text-white/60">
                    {status === "waiting"
                      ? "Share this session link or stay in chat to connect instantly."
                      : status === "disconnected"
                      ? "You can wait for them to rejoin or end the call."
                      : "Connecting peer-to-peer..."}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video Overlay (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 z-10 h-36 w-48 md:h-44 md:w-60 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/80 shadow-2xl backdrop-blur-md">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transform -scale-x-100 ${
                  cameraOn ? "block" : "hidden"
                }`}
              />
              {!cameraOn && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/90 text-white/60">
                  <VideoOff className="h-7 w-7" />
                  <span className="text-[11px]">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                You ({displayName || "Me"})
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Control Bar */}
      {status !== "error" && (
        <footer className="flex items-center justify-center pb-6 pt-2">
          <div className="flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-6 py-3 shadow-2xl backdrop-blur-xl">
            {/* Toggle Microphone */}
            <button
              onClick={toggleMic}
              title={micOn ? "Mute Microphone" : "Unmute Microphone"}
              className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
                micOn
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600"
              }`}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {/* Toggle Camera */}
            <button
              onClick={toggleCamera}
              title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
              className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
                cameraOn
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600"
              }`}
            >
              {cameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              title="End Call"
              className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-rose-600/40 transition hover:bg-rose-500 active:scale-95"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}