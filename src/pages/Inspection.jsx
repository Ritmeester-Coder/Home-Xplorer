import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useParams, useNavigate } from "react-router-dom";

const defaultRooms = [
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Lounge",
  "Garage",
  "Outside",
];

function formatDate(timestamp) {
  if (!timestamp) return "";

  return timestamp.toDate().toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Inspection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    async function loadInspection() {
      const inspectionRef = doc(db, "inspections", id);
      const snapshot = await getDoc(inspectionRef);

      if (snapshot.exists()) {
        setInspection({
          id: snapshot.id,
          ...snapshot.data(),
        });
      }
    }

    loadInspection();
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, "room_inspections"),
      where("inspectionId", "==", id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRooms(data);
    });

    return () => unsubscribe();
  }, [id]);

  async function createDefaultRooms() {
    if (rooms.length > 0) return;

    for (const room of defaultRooms) {
      await addDoc(collection(db, "room_inspections"), {
        inspectionId: id,
        room,
        condition: "",
        notes: "",
        createdAt: serverTimestamp(),
      });
    }
  }

  useEffect(() => {
    if (inspection && rooms.length === 0) {
      createDefaultRooms();
    }
  }, [inspection]);

  if (!inspection) {
    return <p>Loading...</p>;
  }

  const completedRooms = rooms.filter(
    (room) => room.condition && room.condition !== "",
  ).length;

  const canComplete = rooms.length > 0 && completedRooms === rooms.length;

  async function completeInspection() {
    try {
      const inspectionRef = doc(db, "inspections", id);

      await updateDoc(inspectionRef, {
        status: "Completed",
        completedAt: serverTimestamp(),
      });

      setInspection((prev) => ({
        ...prev,
        status: "Completed",
      }));
    } catch (error) {
      console.error(error);
      alert("Failed to complete inspection");
    }
  }

  async function deleteInspection() {
    const confirmed = window.confirm(
      "Delete this inspection and all room data?",
    );

    if (!confirmed) return;

    try {
      // Delete room inspections first
      const roomsQuery = query(
        collection(db, "room_inspections"),
        where("inspectionId", "==", id),
      );

      const roomSnapshot = await getDocs(roomsQuery);

      const deletions = roomSnapshot.docs.map((roomDoc) =>
        deleteDoc(doc(db, "room_inspections", roomDoc.id)),
      );

      await Promise.all(deletions);

      // Delete inspection
      await deleteDoc(doc(db, "inspections", id));

      navigate(`/property/${inspection.propertyId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to delete inspection");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div>
          <strong>{inspection.type}</strong>

          <div className="inspection-date">
            {inspection.status === "Completed"
              ? `Completed: ${formatDate(inspection.completedAt)}`
              : `Created: ${formatDate(inspection.createdAt)}`}
          </div>

          <div
            className={`inspection-status-badge ${
              inspection.status === "Completed" ? "completed" : "draft"
            }`}
          >
            {inspection.status}
          </div>
        </div>
      </div>
      <div className="button-group">
        <button
          className="button secondary-button back-to-property-button"
          onClick={() => navigate(`/property/${inspection.propertyId}`)}
        >
          ← Back to Property
        </button>

        {inspection.status === "Draft" && (
          <button className="button danger-button" onClick={deleteInspection}>
            🗑 Delete Inspection
          </button>
        )}
      </div>
      <div className="card header-card">
        <div className="title">Rooms</div>

        {rooms.map((room) => {
          const completed = room.condition && room.condition !== "";

          return (
            <div
              key={room.id}
              className="room-card"
              onClick={() => navigate(`/room/${room.id}`)}
            >
              <span>
                {completed ? "✅" : "⚪"} {room.room}
              </span>

              <span>→</span>
            </div>
          );
        })}
      </div>
      {inspection.status !== "Completed" && (
        <div className="card complete-inspection-button">
          <button
            className="button"
            disabled={!canComplete}
            onClick={completeInspection}
          >
            Complete Inspection
          </button>

          {!canComplete && (
            <p
              style={{
                marginTop: "10px",
                color: "#666",
                fontSize: "14px",
              }}
            >
              Complete all rooms before finalizing inspection.
            </p>
          )}
        </div>
      )}
      {inspection.status === "Completed" && (
        <button
          className="button summary-button"
          onClick={() => navigate(`/inspection/${id}/summary`)}
        >
          View Summary
        </button>
      )}
    </div>
  );
}
