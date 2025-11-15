import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Box,
  Divider,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import HistoryIcon from "@mui/icons-material/History";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const categories = [
  { name: "Shirts", color: "#FFEBEE" },
  { name: "Trousers", color: "#E3F2FD" },
  { name: "Jackets", color: "#E8F5E9" },
  { name: "Shoes", color: "#FFF3E0" },
  { name: "Accessories", color: "#F3E5F5" },
  { name: "Ethnic Wear", color: "#E0F7FA" },
];

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "16px",
  marginTop: "30px",
};

export default function Customer() {
  const [center] = useState({ lat: 12.9716, lng: 77.5946 }); // Bangalore

  return (
    <>
      {/* --- Navbar --- */}
      <AppBar position="static" sx={{ background: "#1a1a1a", boxShadow: "none" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: 1 }}>
            BITSmart
          </Typography>
          <Box>
            <Button color="inherit" startIcon={<ShoppingCartIcon />} sx={{ mx: 1 }}>
              View Cart
            </Button>
            <Button color="inherit" startIcon={<HistoryIcon />} sx={{ mx: 1 }}>
              Purchase History
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* --- Hero Section --- */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #6a11cb, #2575fc)",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          Welcome to BITSmart
        </Typography>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Your one-stop fashion destination for everything trendy and timeless.
        </Typography>
      </Box>

      {/* --- Categories --- */}
      <Container
        maxWidth="lg"
        sx={{
          textAlign: "center",
          mt: 8,
          mb: 10,
        }}
      >
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Explore Our Collection
        </Typography>
        <Divider
          sx={{
            width: "100px",
            height: "4px",
            background: "#2575fc",
            mx: "auto",
            mb: 5,
            borderRadius: "2px",
          }}
        />

        <Grid container spacing={4} justifyContent="center">
          {categories.map((cat) => (
            <Grid item key={cat.name} xs={10} sm={6} md={4} lg={3}>
              <Card
                sx={{
                  borderRadius: "20px",
                  backgroundColor: cat.color,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardActionArea onClick={() => alert(`${cat.name} clicked!`)}>
                  <CardContent sx={{ py: 5 }}>
                    <Typography variant="h6" fontWeight="600">
                      {cat.name}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* --- Map Section --- */}
      <Box
        sx={{
          py: 8,
          backgroundColor: "#ffffff",
          textAlign: "center",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom fontWeight={600} color="#222">
            Find Stores Near You
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }} color="#555">
            Discover nearby clothing stores and explore local fashion hubs.
          </Typography>

          <LoadScript googleMapsApiKey="AIzaSyCsN0VtNMbHd96oGj7Ch16FVqHQoyT0Uqc">
            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={13}>
              <Marker position={center} />
              <Marker position={{ lat: center.lat + 0.01, lng: center.lng + 0.01 }} />
              <Marker position={{ lat: center.lat - 0.01, lng: center.lng - 0.01 }} />
            </GoogleMap>
          </LoadScript>
        </Container>
      </Box>

      {/* --- Footer --- */}
      <Box
        sx={{
          background: "#1a1a1a",
          color: "white",
          py: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="body2">© 2025 BITSmart. All Rights Reserved.</Typography>
      </Box>
    </>
  );
}
