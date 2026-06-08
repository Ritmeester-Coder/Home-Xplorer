import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AddProperty() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [status, setStatus] = useState("Vacant");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !address) {
      alert("Property name and address are required");
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "properties"), {
        name,
        address,
        tenantName,
        status,
        createdAt: serverTimestamp(),
      });

      setName("");
      setAddress("");
      setTenantName("");
      setStatus("Vacant");

      setIsOpen(false);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save property");
    }

    setSaving(false);
  };

  return (
    <div className="card">
      <div
        className="title-noMargin collapsible-title"
        onClick={() => setIsOpen(!isOpen)}
      >
        <>
          <span>➕ Add Property</span>
          <span className={`arrow ${isOpen ? "rotate" : ""}`}>
            {isOpen ? "▼" : "▶"}{" "}
          </span>
        </>
      </div>

      <div className={`collapsible-content ${isOpen ? "open" : ""}`}>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Property Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Unit 12"
            />
          </div>

          <div className="input-group">
            <label className="label">Address</label>
            <input
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="input-group">
            <label className="label">Tenant Name</label>
            <input
              className="input"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          <div className="input-group">
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Vacant</option>
              <option>Occupied</option>
            </select>
          </div>

          <button className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Property"}
          </button>
        </form>
      </div>
    </div>
  );
}
