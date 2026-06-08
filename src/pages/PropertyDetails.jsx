import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showInspections, setShowInspections] = useState(false);

  useEffect(() => {
    async function loadProperty() {
      const ref = doc(db, "properties", id);

      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        setProperty({
          id: snapshot.id,
          ...snapshot.data(),
        });
      }
    }

    loadProperty();
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, "inspections"),
      where("propertyId", "==", id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInspections(data);
    });

    return () => unsubscribe();
  }, [id]);

  if (!property) {
    return <p>Loading...</p>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">🏠 {property.name}</div>

        <p>
          <strong>Address:</strong>
          <br />
          {property.address}
        </p>

        <p>
          <strong>Tenant:</strong>
          <br />
          {property.tenantName || "None"}
        </p>

        <p>
          <strong>Status:</strong>
          <br />
          {property.status}
        </p>

        <div className="button-group mt-3">
          <button
            className="button secondary-button"
            onClick={() => navigate("/")}
          >
            ← Back
          </button>

          <button
            className="button"
            onClick={() => navigate(`/property/${id}/inspection/new`)}
          >
            New Inspection
          </button>
        </div>
        <div className="card inspection-history-card">
          <div
            className="collapsible-title"
            onClick={() => setShowInspections(!showInspections)}
          >
            <span>📋 Inspection History</span>

            <span className={`arrow ${showInspections ? "rotate" : ""}`}>
              ▼
            </span>
          </div>

          <div
            className={`collapsible-content ${showInspections ? "open" : ""}`}
          >
            {inspections.length === 0 ? (
              <p>No inspections yet</p>
            ) : (
              inspections.map((inspection) => (
                <div
                  key={inspection.id}
                  className="inspection-card"
                  onClick={() => navigate(`/inspection/${inspection.id}`)}
                >
                  <div className="inspection-info">
                    <strong>{inspection.type}</strong>

                    <div className="inspection-meta">
                      <div
                        className={`inspection-status-badge ${
                          inspection.status === "Completed"
                            ? "completed"
                            : "draft"
                        }`}
                      >
                        {inspection.status}
                      </div>

                      <span className="inspection-date">
                        {inspection.createdAt
                          ?.toDate?.()
                          .toLocaleString("en-ZA", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                  </div>

                  <span className="inspection-arrow">→</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
