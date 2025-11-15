import { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Card,
  CardContent,
} from "@mui/material";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "16px",
  marginTop: "20px",
};

const categoriesList = [
  "Shirts",
  "Trousers",
  "Jackets",
  "Shoes",
  "Accessories",
  "Ethnic Wear",
];

export default function Wholesaler() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [allWholesalers, setAllWholesalers] = useState([]);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    try {
      await addDoc(collection(db, "wholesalers"), {
        name,
        email,
        categories: selectedCategories,
        location,
      });
      alert("Wholesaler info saved!");
      fetchWholesalers();
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const fetchWholesalers = async () => {
    const querySnapshot = await getDocs(collection(db, "wholesalers"));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data());
    });
    setAllWholesalers(list);
  };

  useEffect(() => {
    fetchWholesalers();
  }, []);

  return (
    <>
      <AppBar position="static" sx={{ background: "#263238" }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            BITSmart - Wholesaler Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ textAlign: "center", marginTop: "40px" }}>
        <Typography variant="h4" gutterBottom>
          Manage Your Store
        </Typography>

        <Card sx={{ p: 3, mb: 4 }}>
          <CardContent>
            <TextField
              label="Store Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Typography variant="h6">Product Categories</Typography>
            <FormGroup row sx={{ justifyContent: "center" }}>
              {categoriesList.map((category) => (
                <FormControlLabel
                  key={category}
                  control={
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                    />
                  }
                  label={category}
                />
              ))}
            </FormGroup>

            <Typography variant="h6" sx={{ mt: 3 }}>
              Store Location
            </Typography>

            <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={location}
                zoom={12}
                onClick={(e) =>
                  setLocation({
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                  })
                }
              >
                <Marker position={location} />
              </GoogleMap>
            </LoadScript>

            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              onClick={handleSave}
            >
              Save Wholesaler Info
            </Button>
          </CardContent>
        </Card>

        <Typography variant="h5" sx={{ mb: 2 }}>
          All Registered Wholesalers
        </Typography>

        <LoadScript googleMapsApiKey="AIzaSyCsN0VtNMbHd96oGj7Ch16FVqHQoyT0Uqc">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={location}
            zoom={11}
          >
            {allWholesalers.map((wh, index) => (
              <Marker
                key={index}
                position={wh.location}
                title={`${wh.name} - ${wh.categories.join(", ")}`}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </Container>
    </>
  );
}
