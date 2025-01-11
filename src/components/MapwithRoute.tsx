import { GoogleMap, LoadScript, Polyline } from "@react-google-maps/api";

const MapWithRoute = ({ polyline }: { polyline: string }) => {
  const decodePolyline = (encodedPath: string) => {
    const path = [];
    let index = 0;
    const len = encodedPath.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encodedPath.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = result = 0;
      do {
        b = encodedPath.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      path.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return path;
  };

  const path = decodePolyline(polyline);

  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  const center = path.length > 0 ? path[0] : { lat: 0, lng: 0 };

  return (
    <LoadScript googleMapsApiKey={`process.env.GOOGLE_MAPS_API_KEY`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={center}
      >
        <Polyline
          path={path}
          options={{
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 3,
          }}
        />
      </GoogleMap>
    </LoadScript>
  );
};

export default MapWithRoute;
