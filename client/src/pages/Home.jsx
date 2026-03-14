import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const startCall = () => {
    const roomId = Math.random().toString(36).substring(2, 11);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="centered">
      <h1 className="home-title">Video Call</h1>
      <p className="home-sub">Start a call and share the link with anyone.</p>
      <button className="btn primary-btn" onClick={startCall}>
        Start a Call
      </button>
    </div>
  );
}
