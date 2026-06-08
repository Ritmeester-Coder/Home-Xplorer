import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { useParams, useNavigate } from "react-router-dom";

import { db } from "../services/firebase";

export default function RoomInspection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadRoom() {
      const ref = doc(db, "room_inspections", id);

      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        const data = snapshot.data();

        setRoom(data);
        setCondition(data.condition || "");
        setNotes(data.notes || "");
      }
    }

    loadRoom();
  }, [id]);

  async function saveRoom() {
    try {
      const ref = doc(db, "room_inspections", id);

      await updateDoc(ref, {
        condition,
        notes,
        updatedAt: new Date(),
      });

      navigate(`/inspection/${room.inspectionId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to save room");
    }
  }

  if (!room) {
    return <p>Loading...</p>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">🏠 {room.room}</div>

        <div className="input-group">
          <label className="label">Condition</label>

          <select
            className="input"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">Select Condition</option>

            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>Poor</option>
          </select>
        </div>

        <div className="input-group">
          <label className="label">Notes</label>

          <textarea
            className="input"
            rows="5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button
            className="button secondary-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <button className="button" onClick={saveRoom}>
            Save Room
          </button>
        </div>
      </div>
    </div>
  );
}
