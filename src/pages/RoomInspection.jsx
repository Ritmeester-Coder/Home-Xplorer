import { useEffect, useRef, useState } from "react";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { useParams, useNavigate } from "react-router-dom";

import { db } from "../services/firebase";

export default function RoomInspection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadRoom() {
      try {
        const ref = doc(db, "room_inspections", id);

        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setRoom(data);
          setCondition(data.condition || "");
          setNotes(data.notes || "");
        }

        // Load photos for this room
        const photosQuery = query(
          collection(db, "room_photos"),
          where("roomInspectionId", "==", id),
        );

        const photosSnapshot = await getDocs(photosQuery);

        const photoData = photosSnapshot.docs.map((photoDoc) => ({
          id: photoDoc.id,
          ...photoDoc.data(),
        }));

        // Sort newest first
        photoData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setPhotos(photoData);
      } catch (error) {
        console.error(error);
        alert("Failed to load room");
      }
    }

    loadRoom();
  }, [id]);

  async function uploadPhotos(files) {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      const storage = getStorage();

      for (const file of files) {
        // Only allow images
        if (!file.type.startsWith("image/")) {
          continue;
        }

        // Create a unique filename
        const fileName = `${Date.now()}-${file.name}`;

        const storageRef = ref(storage, `room_photos/${id}/${fileName}`);

        // Upload image
        await uploadBytes(storageRef, file);

        // Get public download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Save photo metadata in Firestore
        const photoDoc = await addDoc(collection(db, "room_photos"), {
          roomInspectionId: id,
          inspectionId: room.inspectionId,
          room: room.room,
          url: downloadURL,
          fileName,
          originalName: file.name,
          contentType: file.type,
          createdAt: serverTimestamp(),
        });

        // Add to UI immediately
        setPhotos((current) => [
          {
            id: photoDoc.id,
            roomInspectionId: id,
            inspectionId: room.inspectionId,
            room: room.room,
            url: downloadURL,
            fileName,
            originalName: file.name,
            contentType: file.type,
          },
          ...current,
        ]);
      }
    } catch (error) {
      console.error("Photo upload failed:", error);

      alert(
        "Failed to upload photo. Please check your internet connection and try again.",
      );
    } finally {
      setUploading(false);

      // Reset inputs so the same photo can be selected again
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleCameraChange(event) {
    uploadPhotos(Array.from(event.target.files || []));
  }

  function handleFileChange(event) {
    uploadPhotos(Array.from(event.target.files || []));
  }

  async function deletePhoto(photo) {
    const confirmed = window.confirm(
      "Delete this photo?\n\nThis cannot be undone.",
    );

    if (!confirmed) return;

    try {
      const storage = getStorage();

      // Delete from Firebase Storage
      const storageRef = ref(storage, `room_photos/${id}/${photo.fileName}`);

      await deleteObject(storageRef);

      // Delete Firestore record
      await deleteDoc(doc(db, "room_photos", photo.id));

      // Remove from screen
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (error) {
      console.error("Failed to delete photo:", error);

      alert("Failed to delete photo");
    }
  }

  async function saveRoom() {
    try {
      const ref = doc(db, "room_inspections", id);

      await updateDoc(ref, {
        condition,
        notes,
        updatedAt: serverTimestamp(),
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

        {/* CONDITION */}
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

        {/* NOTES */}
        <div className="input-group">
          <label className="label">Notes</label>

          <textarea
            className="input"
            rows="5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* PHOTOS */}
        <div className="photo-section">
          <div className="photo-section-title">📷 Photos</div>

          <p className="photo-help">
            Take photos of the room and any defects or issues found.
          </p>

          <div className="photo-buttons">
            {/* CAMERA */}
            <button
              type="button"
              className="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              📷 Take Photo
            </button>

            {/* UPLOAD EXISTING */}
            <button
              type="button"
              className="button secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              🖼️ Upload Photos
            </button>
          </div>

          {/* Hidden camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleCameraChange}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {uploading && (
            <div className="photo-uploading">Uploading photo...</div>
          )}

          {/* PHOTO GRID */}
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="photo-card">
                  <img
                    src={photo.url}
                    alt={photo.originalName || "Inspection photo"}
                    className="inspection-photo"
                  />

                  <button
                    type="button"
                    className="photo-delete"
                    onClick={() => deletePhoto(photo)}
                    title="Delete photo"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && !uploading && (
            <div className="no-photos">No photos captured yet</div>
          )}
        </div>

        {/* BUTTONS */}
        <div className="button-group">
          <button
            type="button"
            className="button secondary-button"
            onClick={() => navigate(-1)}
            disabled={uploading}
          >
            ← Back
          </button>

          <button
            type="button"
            className="button"
            onClick={saveRoom}
            disabled={uploading}
          >
            Save Room
          </button>
        </div>
      </div>
    </div>
  );
}
