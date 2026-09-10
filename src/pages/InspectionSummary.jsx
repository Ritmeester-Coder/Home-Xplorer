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

  // Full-size photo viewer
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // ---------------------------------------------------------
        // Load inspection
        // ---------------------------------------------------------

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

        // ---------------------------------------------------------
        // Load property
        // ---------------------------------------------------------

        const propertyRef = doc(db, "properties", inspectionData.propertyId);

        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          setProperty({
            id: propertySnap.id,
            ...propertySnap.data(),
          });
        }

        // ---------------------------------------------------------
        // Load rooms
        // ---------------------------------------------------------

        const roomsQuery = query(
          collection(db, "room_inspections"),
          where("inspectionId", "==", id),
        );

        const roomSnapshot = await getDocs(roomsQuery);

        const roomData = roomSnapshot.docs.map((roomDoc) => ({
          id: roomDoc.id,
          ...roomDoc.data(),
          photos: [],
        }));

        // ---------------------------------------------------------
        // Load all photos for this inspection
        // ---------------------------------------------------------

        const photosQuery = query(
          collection(db, "room_photos"),
          where("inspectionId", "==", id),
        );

        const photosSnapshot = await getDocs(photosQuery);

        const photoData = photosSnapshot.docs.map((photoDoc) => ({
          id: photoDoc.id,
          ...photoDoc.data(),
        }));

        // ---------------------------------------------------------
        // Attach photos to the correct room
        // ---------------------------------------------------------

        const roomsWithPhotos = roomData.map((room) => ({
          ...room,
          photos: photoData.filter(
            (photo) => photo.roomInspectionId === room.id,
          ),
        }));

        setRooms(roomsWithPhotos);
      } catch (error) {
        console.error("Failed to load inspection summary:", error);
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

  // ---------------------------------------------------------
  // Generate PDF
  // ---------------------------------------------------------

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
    });

    pdf.save(`${property?.name || "Inspection"}-Report.pdf`);
  }

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading inspection summary...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* =====================================================
          INSPECTION HEADER
      ===================================================== */}

      <div className="inspection-summary-card">
        <div className="inspection-summary-title">📋 Inspection Summary</div>

        <div className="inspection-summary-columns">
          {/* LEFT COLUMN */}

          <div className="inspection-summary-column">
            <div className="summary-item">
              <div className="summary-label">Property:</div>

              <div className="summary-value">{property?.name || "-"}</div>
            </div>

            <div className="summary-item">
              <div className="summary-label">Address:</div>

              <div className="summary-value">{property?.address || "-"}</div>
            </div>

            <div className="summary-item">
              <div className="summary-label">Inspection Type:</div>

              <div className="summary-value">{inspection?.type || "-"}</div>
            </div>
          </div>

          {/* RIGHT COLUMN */}

          <div className="inspection-summary-column">
            <div className="summary-item">
              <div className="summary-label">Status:</div>

              <div className="summary-value">{inspection?.status || "-"}</div>
            </div>

            <div className="summary-item">
              <div className="summary-label">Created:</div>

              <div className="summary-value">
                {formatDate(inspection?.createdAt)}
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-label">Completed:</div>

              <div className="summary-value">
                {formatDate(inspection?.completedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ROOMS
      ===================================================== */}

      <div className="card inspection-room">
        {/* ACTIONS */}

        <div
          className="button-group"
          style={{
            marginTop: "0px",
            marginBottom: "20px",
          }}
        >
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

        <div className="title">🏠 Room Details</div>

        {rooms.length === 0 ? (
          <p>No rooms found.</p>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-summary-card">
              {/* =================================================
                  ROOM CONTENT
              ================================================= */}

              <div className="room-summary-content">
                <h3>
                  {room.condition ? "✅" : "⚪"} {room.room}
                </h3>

                <p>
                  <strong>Condition:</strong>{" "}
                  {room.condition || "Not Completed"}
                </p>

                <p>
                  <strong>Notes:</strong>
                </p>

                <p>{room.notes || "No notes captured"}</p>
              </div>

              {/* =================================================
                  ROOM PHOTOS
              ================================================= */}

              {room.photos?.length > 0 && (
                <div className="room-summary-photos">
                  {room.photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="room-summary-photo-button"
                      onClick={() => setSelectedPhoto(photo.url)}
                    >
                      <img
                        src={photo.url}
                        alt={
                          photo.originalName || `${room.room} inspection photo`
                        }
                        className="room-summary-photo"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* =====================================================
          FULL SIZE PHOTO VIEWER
      ===================================================== */}

      {selectedPhoto && (
        <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
          <button
            type="button"
            className="photo-modal-close"
            onClick={() => setSelectedPhoto(null)}
          >
            ✕
          </button>

          <img
            src={selectedPhoto}
            alt="Inspection"
            className="photo-modal-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
