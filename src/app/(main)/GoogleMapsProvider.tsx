import React from "react";
import { LoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;
const libraries: Array<"places"> = ["places"];

const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      {children}
    </LoadScript>
  );
};

export default GoogleMapsProvider;
