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

import { useParams, useNavigate } from "react-router-dom";

import { db } from "../services/firebase";
import { supabase } from "../services/supabase";

const MAX_PHOTOS_PER_ROOM = 4;
const roomIcons = {
  Kitchen: "🍳",
  Bedroom: "🛏️",
  Bathroom: "🛁",
  Lounge: "🛋️",
  Garage: "🏠",
  Outside: "🌳",
};
const roomOrder = [
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Lounge",
  "Garage",
  "Outside",
];

export default function RoomInspection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const propertyIdRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Room navigation
  const [allRooms, setAllRooms] = useState([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(-1);
  const [switchingRoom, setSwitchingRoom] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD ROOM
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadRoom() {
      try {
        if (!id) {
          console.error("No room inspection ID supplied.");
          return;
        }

        // Reset current room while loading the new one
        setRoom(null);
        setCondition("");
        setNotes("");
        setPhotos([]);
        setCurrentRoomIndex(-1);

        /*
         * ---------------------------------------------------
         * LOAD CURRENT ROOM
         * ---------------------------------------------------
         */

        const roomRef = doc(db, "room_inspections", id);

        const roomSnapshot = await getDoc(roomRef);

        if (!roomSnapshot.exists()) {
          console.error("Room inspection not found:", id);

          alert("Room inspection could not be found.");

          return;
        }

        const roomData = roomSnapshot.data();

        setRoom(roomData);
        setCondition(roomData.condition || "");
        setNotes(roomData.notes || "");

        if (roomData.inspectionId) {
          const inspectionRef = doc(db, "inspections", roomData.inspectionId);

          const inspectionSnapshot = await getDoc(inspectionRef);

          if (inspectionSnapshot.exists()) {
            const inspectionData = inspectionSnapshot.data();

            propertyIdRef.current = inspectionData.propertyId;
          }
        }

        /*
         * ---------------------------------------------------
         * LOAD ALL ROOMS FOR THIS INSPECTION
         * ---------------------------------------------------
         */

        const roomsQuery = query(
          collection(db, "room_inspections"),
          where("inspectionId", "==", roomData.inspectionId),
        );

        const roomsSnapshot = await getDocs(roomsQuery);

        const roomList = roomsSnapshot.docs.map((roomDoc) => ({
          id: roomDoc.id,
          ...roomDoc.data(),
        }));

        /*
         * Remove duplicate room names.
         *
         * If old duplicate room documents exist in Firestore,
         * only use the first one for navigation.
         */
        const uniqueRooms = [];

        const seenRooms = new Set();

        for (const roomItem of roomList) {
          if (!seenRooms.has(roomItem.room)) {
            seenRooms.add(roomItem.room);
            uniqueRooms.push(roomItem);
          }
        }

        /*
         * Sort rooms into the standard inspection order.
         */
        uniqueRooms.sort((a, b) => {
          const aIndex = roomOrder.indexOf(a.room);
          const bIndex = roomOrder.indexOf(b.room);

          return (
            (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
          );
        });

        setAllRooms(uniqueRooms);

        /*
         * Find the current room in the unique room list.
         */
        const index = uniqueRooms.findIndex((roomItem) => roomItem.id === id);

        setCurrentRoomIndex(index);

        /*
         * ---------------------------------------------------
         * LOAD PHOTOS
         * ---------------------------------------------------
         */

        const photosQuery = query(
          collection(db, "room_photos"),
          where("roomInspectionId", "==", id),
        );

        const photosSnapshot = await getDocs(photosQuery);

        const photoData = photosSnapshot.docs.map((photoDoc) => ({
          id: photoDoc.id,
          ...photoDoc.data(),
        }));

        /*
         * Sort newest first
         */

        photoData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setPhotos(photoData);
      } catch (error) {
        console.error("Failed to load room:", error);

        alert("Failed to load room inspection.");
      }
    }

    loadRoom();
  }, [id]);

  /*
   * ---------------------------------------------------------
   * SAVE CURRENT ROOM
   * ---------------------------------------------------------
   */

  async function saveCurrentRoom() {
    if (!room) {
      return;
    }

    const roomRef = doc(db, "room_inspections", id);

    await updateDoc(roomRef, {
      condition,
      notes,
      updatedAt: serverTimestamp(),
    });
  }

  /*
   * ---------------------------------------------------------
   * ROOM NAVIGATION
   * ---------------------------------------------------------
   */

  async function goToRoom(index) {
    if (switchingRoom || uploading || index < 0 || index >= allRooms.length) {
      return;
    }

    try {
      setSwitchingRoom(true);

      /*
       * Save whatever was entered on the current room
       * before moving away.
       */

      await saveCurrentRoom();

      const nextRoom = allRooms[index];

      navigate(`/room/${nextRoom.id}`);
    } catch (error) {
      console.error("Failed to switch rooms:", error);

      alert("Could not save this room before moving to the next room.");
    } finally {
      setSwitchingRoom(false);
    }
  }

  function goPreviousRoom() {
    goToRoom(currentRoomIndex - 1);
  }

  function goNextRoom() {
    goToRoom(currentRoomIndex + 1);
  }

  /*
   * ---------------------------------------------------------
   * UPLOAD PHOTOS
   * ---------------------------------------------------------
   */

  async function uploadPhotos(files) {
    if (!files || files.length === 0) return;

    if (!room) {
      alert("Room information has not finished loading.");
      return;
    }

    // ---------------------------------------------------------
    // Enforce maximum of 4 photos per room
    // ---------------------------------------------------------

    const remainingSlots = MAX_PHOTOS_PER_ROOM - photos.length;

    if (remainingSlots <= 0) {
      alert(
        `This room already has the maximum of ${MAX_PHOTOS_PER_ROOM} photos.`,
      );
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type?.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      alert("Please select image files only.");
      return;
    }

    const filesToUpload = imageFiles.slice(0, remainingSlots);

    if (imageFiles.length > remainingSlots) {
      alert(
        `You can only have ${MAX_PHOTOS_PER_ROOM} photos per room.\n\n` +
          `You already have ${photos.length} photo(s), ` +
          `so only ${remainingSlots} more photo(s) can be added.`,
      );
    }

    try {
      setUploading(true);

      for (const file of filesToUpload) {
        const uniqueId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        const fileName = `${Date.now()}-${uniqueId}-${safeFileName}`;

        const storagePath = `${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("inspection-photos")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Supabase upload error:", uploadError);

          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("inspection-photos")
          .getPublicUrl(storagePath);

        const downloadURL = publicUrlData?.publicUrl;

        if (!downloadURL) {
          throw new Error("Supabase did not return a public photo URL.");
        }

        const photoDoc = await addDoc(collection(db, "room_photos"), {
          roomInspectionId: id,
          inspectionId: room.inspectionId || null,
          room: room.room || "",
          url: downloadURL,
          storagePath,
          fileName,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
          createdAt: serverTimestamp(),
        });

        setPhotos((current) => [
          {
            id: photoDoc.id,
            roomInspectionId: id,
            inspectionId: room.inspectionId || null,
            room: room.room || "",
            url: downloadURL,
            storagePath,
            fileName,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
            createdAt: null,
          },
          ...current,
        ]);
      }
    } catch (error) {
      console.error("Photo upload failed:", error);

      if (error?.message?.toLowerCase?.().includes("bucket")) {
        alert(
          "The inspection-photos bucket could not be accessed. Please check your Supabase Storage bucket.",
        );
      } else if (
        error?.message?.toLowerCase?.().includes("row-level security")
      ) {
        alert(
          "Supabase Storage permissions are blocking the upload. We need to configure the Storage policies.",
        );
      } else {
        alert(
          "Failed to upload photo.\n\n" +
            "Please check the browser console for more details.",
        );
      }
    } finally {
      setUploading(false);

      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * CAMERA INPUT
   * ---------------------------------------------------------
   */

  function handleCameraChange(event) {
    const files = Array.from(event.target.files || []);

    uploadPhotos(files);
  }

  /*
   * ---------------------------------------------------------
   * FILE INPUT
   * ---------------------------------------------------------
   */

  function handleFileChange(event) {
    const files = Array.from(event.target.files || []);

    uploadPhotos(files);
  }

  /*
   * ---------------------------------------------------------
   * DELETE PHOTO
   * ---------------------------------------------------------
   */

  async function deletePhoto(photo) {
    const confirmed = window.confirm(
      "Delete this photo?\n\nThis cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      /*
       * ---------------------------------------------------
       * DELETE FROM SUPABASE STORAGE
       * ---------------------------------------------------
       */

      if (photo.storagePath) {
        const { error: storageError } = await supabase.storage
          .from("inspection-photos")
          .remove([photo.storagePath]);

        if (storageError) {
          console.error("Supabase storage delete error:", storageError);

          throw storageError;
        }
      } else {
        /*
         * Older photos may not have storagePath.
         */

        if (photo.fileName) {
          const oldPath = `${id}/${photo.fileName}`;

          const { error: oldStorageError } = await supabase.storage
            .from("inspection-photos")
            .remove([oldPath]);

          if (oldStorageError) {
            console.warn("Could not remove legacy photo:", oldStorageError);
          }
        }
      }

      /*
       * ---------------------------------------------------
       * DELETE FIRESTORE RECORD
       * ---------------------------------------------------
       */

      await deleteDoc(doc(db, "room_photos", photo.id));

      /*
       * ---------------------------------------------------
       * REMOVE FROM UI
       * ---------------------------------------------------
       */

      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (error) {
      console.error("Failed to delete photo:", error);

      alert(
        "Failed to delete photo.\n\nPlease check the browser console for details.",
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * SAVE ROOM
   * ---------------------------------------------------------
   */

  async function saveRoom() {
    try {
      if (!room) {
        return;
      }

      await saveCurrentRoom();

      navigate(`/inspection/${room.inspectionId}`);
    } catch (error) {
      console.error("Failed to save room:", error);

      alert("Failed to save room.");
    }
  }

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (!room) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  const previousRoom =
    currentRoomIndex > 0 ? allRooms[currentRoomIndex - 1] : null;

  const nextRoom =
    currentRoomIndex >= 0 && currentRoomIndex < allRooms.length - 1
      ? allRooms[currentRoomIndex + 1]
      : null;

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="container">
      <div className="card">
        {/* =================================================
            ROOM NAVIGATION
            ================================================= */}

        <div className="room-navigation">
          {/* PREVIOUS ROOM */}

          <button
            type="button"
            className={`room-nav-side room-nav-previous ${
              !previousRoom ? "room-nav-hidden" : ""
            }`}
            onClick={goPreviousRoom}
            disabled={!previousRoom || switchingRoom || uploading}
          >
            {previousRoom && (
              <>
                <span className="room-nav-room">
                  <span className="room-nav-icon">
                    {roomIcons[previousRoom.room] || "🏠"}
                  </span>

                  <span className="room-nav-name"></span>
                </span>
              </>
            )}
          </button>

          {/* CURRENT ROOM */}

          <div className="room-nav-current">
            <div className="room-current-icon">
              {roomIcons[room.room] || "🏠"}
            </div>

            <div className="room-current-name">{room.room}</div>

            <div className="room-current-position">
              {currentRoomIndex + 1} of {allRooms.length}
            </div>
          </div>

          {/* NEXT ROOM */}

          <button
            type="button"
            className={`room-nav-side room-nav-next ${
              !nextRoom ? "room-nav-hidden" : ""
            }`}
            onClick={goNextRoom}
            disabled={!nextRoom || switchingRoom || uploading}
          >
            {nextRoom && (
              <>
                <span className="room-nav-room">
                  <span className="room-nav-icon">
                    {roomIcons[nextRoom.room] || "🏠"}
                  </span>

                  <span className="room-nav-name"></span>
                </span>
              </>
            )}
          </button>
        </div>

        {/* =================================================
            SWITCHING INDICATOR
            ================================================= */}

        {switchingRoom && <div className="room-switching">Saving room...</div>}

        {/* =================================================
            CONDITION
            ================================================= */}

        <div className="input-group">
          <label className="label">Condition</label>

          <select
            className="input"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            disabled={uploading || switchingRoom}
          >
            <option value="">Select Condition</option>

            <option value="Excellent">Excellent</option>

            <option value="Good">Good</option>

            <option value="Fair">Fair</option>

            <option value="Poor">Poor</option>
          </select>
        </div>

        {/* =================================================
            NOTES
            ================================================= */}

        <div className="input-group">
          <label className="label">Notes</label>

          <textarea
            className="input"
            rows="5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading || switchingRoom}
            placeholder="Enter any notes, defects or observations..."
          />
        </div>

        {/* =================================================
            PHOTOS
            ================================================= */}

        <div className="photo-section">
          <div className="photo-section-title">
            📷 Photos ({photos.length}/{MAX_PHOTOS_PER_ROOM})
          </div>

          <p className="photo-help">
            Take photos of the room and any defects or issues found.
            {photos.length >= MAX_PHOTOS_PER_ROOM && (
              <div className="photo-limit-message">
                Maximum of 4 photos reached for this room.
              </div>
            )}
          </p>

          <div className="photo-buttons">
            {/* CAMERA */}

            <button
              type="button"
              className="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={
                uploading ||
                switchingRoom ||
                photos.length >= MAX_PHOTOS_PER_ROOM
              }
            >
              📷 Take Photo
            </button>

            {/* UPLOAD */}

            <button
              type="button"
              className="button secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                uploading ||
                switchingRoom ||
                photos.length >= MAX_PHOTOS_PER_ROOM
              }
            >
              🖼️ Upload Photos
            </button>
          </div>

          {/* CAMERA INPUT */}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleCameraChange}
          />

          {/* FILE INPUT */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* UPLOADING */}

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
                    disabled={uploading}
                    title="Delete photo"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* NO PHOTOS */}

          {photos.length === 0 && !uploading && (
            <div className="no-photos">No photos captured yet</div>
          )}
        </div>

        {/* =================================================
            ACTION BUTTONS
            ================================================= */}

        <div className="button-group mt-20">
          <button
            type="button"
            className="button secondary-button"
            onClick={() => {
              if (propertyIdRef.current) {
                navigate(`/property/${propertyIdRef.current}`);
              } else {
                navigate(-1);
              }
            }}
            disabled={uploading || switchingRoom}
          >
            ← Back
          </button>

          <button
            type="button"
            className="button"
            onClick={saveRoom}
            disabled={uploading || switchingRoom}
          >
            Save Room
          </button>
        </div>
      </div>
    </div>
  );
}
