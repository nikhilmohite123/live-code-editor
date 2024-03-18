import React, { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import EditorBox from "../components/EditorBox";
import { initSocket } from "../socket";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import ACTIONS from "../Action";
import toast from "react-hot-toast";

function Editor() {
  const codeRef=useRef(null);
  const socketRef = useRef(null);
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} join the room`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE,{code:codeRef.current,socketId})
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => {
          return prev.filter((client) => {
            return client.socketId !== socketId;
          });
        });
      });
    };

    init();
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []);

  if (!location.state) {
    <Navigate to="/" />;
  }

  const copyRoomId = async() => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('copied')
    } catch (error) {
      toast.error(error)
    }
  };

  const leaveRoom = () => {
    reactNavigator('/')
  };

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <EditorBox socketRef={socketRef} roomId={roomId} onCodeChange={(code)=>{
          codeRef.current=code;
        }}/>
      </div>
    </div>
  );
}

export default Editor;
