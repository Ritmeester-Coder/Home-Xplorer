import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

import { db } from "../services/firebase";

export default function NewInspection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [type, setType] = useState("Move In");
  const [saving, setSaving] = useState(false);

  async function handleCreateInspection(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const docRef = await addDoc(collection(db, "inspections"), {
        propertyId: id,
        type,
        status: "Draft",
        createdAt: serverTimestamp(),
      });

      navigate(`/inspection/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to create inspection");
    }

    setSaving(false);
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">📋 New Inspection</div>

        <form onSubmit={handleCreateInspection}>
          <div className="input-group">
            <label className="label">Inspection Type</label>

            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Move In</option>
              <option>Move Out</option>
              <option>Routine Inspection</option>
            </select>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="button secondary-button"
              onClick={() => navigate(`/property/${id}`)}
            >
              ← Cancel
            </button>

            <button type="submit" className="button" disabled={saving}>
              {saving ? "Creating..." : "Create Inspection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
