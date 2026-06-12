import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useNavigate, useParams } from "react-router-dom";

import { db } from "../services/firebase";

export default function UploadDocument() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadDocument(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      formData.append(
        "upload_preset",
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        }/auto/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      console.log("Cloudinary Response:", data);

      if (!response.ok) {
        throw new Error(data?.error?.message || "Upload failed");
      }

      await addDoc(collection(db, "property_documents"), {
        propertyId: id,
        name: name || file.name,
        url: data.secure_url,
        uploadedAt: serverTimestamp(),
      });

      alert("Document uploaded");

      navigate(`/property/${id}`);
    } catch (error) {
      console.error(error);

      alert("Upload failed");
    }

    setUploading(false);
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">📄 Upload Document</div>

        <input
          className="input"
          placeholder="Document Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input type="file" onChange={uploadDocument} disabled={uploading} />

        {uploading && <p>Uploading...</p>}
      </div>
    </div>
  );
}
