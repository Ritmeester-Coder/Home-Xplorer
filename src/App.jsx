import { BrowserRouter, Routes, Route } from "react-router-dom";

import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import NewInspection from "./pages/NewInspection";
import Inspection from "./pages/Inspection";
import RoomInspection from "./pages/RoomInspection";
import InspectionSummary from "./pages/InspectionSummary";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route
          path="/property/:id/inspection/new"
          element={<NewInspection />}
        />
        <Route path="/inspection/:id" element={<Inspection />} />
        <Route path="/inspection/:id/summary" element={<InspectionSummary />} />
        <Route path="/room/:id" element={<RoomInspection />} />
      </Routes>
    </BrowserRouter>
  );
}
