import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import jsPDF from "jspdf";

export default function InspectionSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load inspection
        const inspectionRef = doc(db, "inspections", id);

        const inspectionSnap = await getDoc(inspectionRef);

        if (!inspectionSnap.exists()) {
          setLoading(false);
          return;
        }

        const inspectionData = inspectionSnap.data();

        setInspection({
          id: inspectionSnap.id,
          ...inspectionData,
        });

        // Load property
        const propertyRef = doc(db, "properties", inspectionData.propertyId);

        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          setProperty({
            id: propertySnap.id,
            ...propertySnap.data(),
          });
        }

        // Load rooms
        const roomsQuery = query(
          collection(db, "room_inspections"),
          where("inspectionId", "==", id),
        );

        const roomSnapshot = await getDocs(roomsQuery);

        const roomData = roomSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRooms(roomData);
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  function formatDate(timestamp) {
    if (!timestamp) return "-";

    return timestamp.toDate().toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading inspection summary...</div>
      </div>
    );
  }

  // Generate PDF
  function generatePdf() {
    const pdf = new jsPDF();

    let y = 20;

    // Header
    pdf.setFontSize(20);
    pdf.text("Home Xplorer Inspection Report", 20, y);

    y += 15;

    pdf.setFontSize(12);

    pdf.text(`Property: ${property?.name || ""}`, 20, y);

    y += 8;

    pdf.text(`Address: ${property?.address || ""}`, 20, y);

    y += 8;

    pdf.text(`Inspection Type: ${inspection?.type || ""}`, 20, y);

    y += 8;

    pdf.text(`Status: ${inspection?.status || ""}`, 20, y);

    y += 15;

    // Rooms
    rooms.forEach((room) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFontSize(14);

      pdf.text(`${room.room}`, 20, y);

      y += 8;

      pdf.setFontSize(11);

      pdf.text(`Condition: ${room.condition || "Not Completed"}`, 25, y);

      y += 8;

      const notes = room.notes || "No notes captured";

      const splitNotes = pdf.splitTextToSize(`Notes: ${notes}`, 160);

      pdf.text(splitNotes, 25, y);

      y += splitNotes.length * 6;

      y += 10;
      pdf.line(20, y, 190, y);
      y += 10;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    });

    pdf.save(`${property?.name || "Inspection"}-Report.pdf`);
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div className="title">📋 Inspection Summary</div>

        <p>
          <strong>Property:</strong>
          <br />
          {property?.name}
        </p>

        <p>
          <strong>Address:</strong>
          <br />
          {property?.address}
        </p>

        <p>
          <strong>Inspection Type:</strong>
          <br />
          {inspection?.type}
        </p>

        <p>
          <strong>Status:</strong>
          <br />
          {inspection?.status}
        </p>

        <p>
          <strong>Created:</strong>
          <br />
          {formatDate(inspection?.createdAt)}
        </p>

        {inspection?.completedAt && (
          <p>
            <strong>Completed:</strong>
            <br />
            {formatDate(inspection.completedAt)}
          </p>
        )}
      </div>

      {/* Rooms */}
      <div className="card inspection-room">
        <div className="title">🏠 Room Details</div>

        {rooms.length === 0 ? (
          <p>No rooms found.</p>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-summary-card">
              <h3>
                {room.condition ? "✅" : "⚪"} {room.room}
              </h3>

              <p>
                <strong>Condition:</strong> {room.condition || "Not Completed"}
              </p>

              <p>
                <strong>Notes:</strong>
              </p>

              <p>{room.notes || "No notes captured"}</p>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="card inspection-action-card">
        <div className="button-group">
          <button
            className="button secondary-button"
            onClick={() => navigate(`/inspection/${id}`)}
          >
            ← Back to Inspection
          </button>

          <button className="button" onClick={generatePdf}>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
