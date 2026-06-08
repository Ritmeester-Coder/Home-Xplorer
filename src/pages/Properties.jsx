import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

import AddProperty from "./AddProperty";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "properties"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProperties(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="container">
      <div className="hero">
        <h1 className="white-title">Home Xplorer</h1>
        <p className="text-white semi-bold">Property Inspections Made Simple</p>
      </div>
      <div className="dashboard-layout">
        <div className="left-panel">
          <AddProperty />
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="title">🏠 Properties</div>

            {properties.length === 0 ? (
              <p>No properties found</p>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  className="property-card"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  <div className="property-name">{property.name}</div>

                  <div className="property-address">{property.address}</div>

                  <div
                    className={
                      property.status === "Occupied"
                        ? "status occupied"
                        : "status vacant"
                    }
                  >
                    {property.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
