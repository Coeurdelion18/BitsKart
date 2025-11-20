import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  CircularProgress,
  Badge,
  Slider,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";
import { calculateDistanceKm } from "../utils/geo";
import { seedDemoData } from "../utils/demoSeeder";

const categories = [
  { name: "Shirts", gradient: "linear-gradient(135deg,#f97316,#fb7185)" },
  { name: "Trousers", gradient: "linear-gradient(135deg,#0ea5e9,#6366f1)" },
  { name: "Jackets", gradient: "linear-gradient(135deg,#14b8a6,#84cc16)" },
  { name: "Shoes", gradient: "linear-gradient(135deg,#f472b6,#facc15)" },
  { name: "Accessories", gradient: "linear-gradient(135deg,#38bdf8,#818cf8)" },
  { name: "Ethnic Wear", gradient: "linear-gradient(135deg,#c084fc,#9333ea)" },
];

const stats = [
  { title: "Favourite Boutiques", value: "18" },
  { title: "Orders Delivered", value: "142" },
  { title: "Reward Points", value: "3,420" },
];

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 };

const formatDistanceLabel = (distanceKm) => {
  if (typeof distanceKm === "number") {
    return `${distanceKm} km away`;
  }
  return "Distance unavailable";
};

const CATEGORY_PRICES = {
  Shirts: 1299,
  Trousers: 1499,
  Jackets: 2799,
  Shoes: 2199,
  Accessories: 799,
  "Ethnic Wear": 3299,
};

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "16px",
  marginTop: "30px",
};

export default function Customer() {
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [customerLocation, setCustomerLocation] = useState(DEFAULT_LOCATION);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState("pending");
  const [retailers, setRetailers] = useState([]);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [dialogCategory, setDialogCategory] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [desiredQty, setDesiredQty] = useState(1);
  const [isSeeding, setIsSeeding] = useState(false);
  const [distanceFilterKm, setDistanceFilterKm] = useState(30);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCustomerLocation(coords);
        setMapCenter(coords);
        setLocationStatus("ready");
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocationStatus("denied");
        setMapCenter(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRetailers = async () => {
      setLoadingRetailers(true);
      try {
        const retailerSnapshot = await getDocs(collection(db, "retailers"));
        const retailerList = await Promise.all(
          retailerSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const stockSnap = await getDoc(doc(db, "stocks", docSnap.id));
            return {
              id: docSnap.id,
              name: data.name || data.storeName || "Retailer",
              email: data.email,
              stock: stockSnap.exists() ? stockSnap.data() : {},
              location: data.location || DEFAULT_LOCATION,
            };
          })
        );
        if (isMounted) setRetailers(retailerList);
      } catch (error) {
        console.error("Failed to load retailers", error);
      } finally {
        if (isMounted) setLoadingRetailers(false);
      }
    };
    fetchRetailers();
    return () => {
      isMounted = false;
    };
  }, []);

  const retailersByDistance = useMemo(() =>
    retailers
      .map((retailer) => ({
        ...retailer,
        distanceKm: calculateDistanceKm(customerLocation, retailer.location),
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)),
  [retailers, customerLocation]);

  const filteredRetailersByDistance = useMemo(
    () =>
      retailersByDistance.filter((retailer) => {
        if (retailer.distanceKm == null) return true;
        return retailer.distanceKm <= distanceFilterKm;
      }),
    [retailersByDistance, distanceFilterKm]
  );

  const categoryRetailerMap = useMemo(() => {
    const map = {};
    filteredRetailersByDistance.forEach((retailer) => {
      categories.forEach((category) => {
        const availableQty = retailer.stock?.[category.name] || 0;
        if (availableQty > 0) {
          if (!map[category.name]) map[category.name] = [];
          map[category.name].push({
            retailerId: retailer.id,
            retailerName: retailer.name || retailer.email || "Retailer",
            retailerEmail: retailer.email,
            availableQty,
            price: CATEGORY_PRICES[category.name] || 0,
            distanceKm: retailer.distanceKm,
            location: retailer.location,
          });
        }
      });
    });
    return map;
  }, [filteredRetailersByDistance]);

  const recommendedCategories = useMemo(() =>
    categories
      .map((cat) => {
        const retailersForCat = categoryRetailerMap[cat.name] || [];
        if (!retailersForCat.length) return null;
        const closest = retailersForCat[0];
        return {
          name: cat.name,
          gradient: cat.gradient,
          distanceKm: closest.distanceKm,
          retailerName: closest.retailerName,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 3),
  [categoryRetailerMap]);

  const selectedRetailers = dialogCategory ? categoryRetailerMap[dialogCategory] || [] : [];
  const activeRetailer = selectedRetailers.find((retailer) => retailer.retailerId === selectedRetailerId);

  const handleOpenCategoryDialog = (categoryName) => {
    const retailersForCategory = categoryRetailerMap[categoryName] || [];
    if (!retailersForCategory.length) {
      alert("This item is currently out of stock across all boutiques.");
      return;
    }
    setDialogCategory(categoryName);
    setSelectedRetailerId(retailersForCategory[0].retailerId);
    setDesiredQty(1);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogCategory(null);
    setSelectedRetailerId("");
    setDesiredQty(1);
  };

  const handleQuantityChange = (value) => {
    if (!activeRetailer) return;
    const parsed = parseInt(value, 10);
    const clamped = Math.max(1, Math.min(isNaN(parsed) ? 1 : parsed, activeRetailer.availableQty));
    setDesiredQty(clamped);
  };

  const handleAddToCart = () => {
    if (!activeRetailer || !dialogCategory) return;
    addItem(
      {
        retailerId: activeRetailer.retailerId,
        retailerName: activeRetailer.retailerName,
        retailerEmail: activeRetailer.retailerEmail,
        category: dialogCategory,
        price: activeRetailer.price,
        availableQty: activeRetailer.availableQty,
      },
      desiredQty
    );
    alert(`${dialogCategory} added to cart from ${activeRetailer.retailerName}.`);
    handleCloseDialog();
  };

  const scrollToCollections = () => {
    document.getElementById("customer-collections")?.scrollIntoView({ behavior: "smooth" });
  };

  const focusNearestBoutique = useCallback(() => {
    const nearestRetailer = retailersByDistance[0];
    if (!nearestRetailer) return;
    setMapCenter(nearestRetailer.location);
    const availableCategory = categories.find((cat) => (nearestRetailer.stock?.[cat.name] || 0) > 0);
    if (availableCategory) {
      handleOpenCategoryDialog(availableCategory.name);
    }
  }, [retailersByDistance]);

  const handleSeedDemoClick = async () => {
    try {
      setIsSeeding(true);
      await seedDemoData();
      alert("Demo retailers and wholesalers seeded around Hyderabad. Refresh to see them on the map.");
    } catch (error) {
      console.error("Failed to seed demo data", error);
      alert(`Unable to load demo stores: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout", error);
      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <Box className="page-shell" sx={{ overflow: "hidden" }}>
      <div className="glow-circle pink floating" />
      <div className="glow-circle blue" />
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(15,23,42,0.8)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" className="gradient-text" sx={{ fontWeight: 700 }}>
            BITSmart Customer
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              startIcon={
                <Badge badgeContent={totalItems} color="secondary" overlap="circular" showZero>
                  <ShoppingCartIcon />
                </Badge>
              }
              onClick={() => navigate("/cart")}
            >
              Cart
            </Button>
            <Button
              color="inherit"
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/history")}
            >
              History
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 6, md: 10 } }}>
        {loadingRetailers ? (
          <Stack direction="column" alignItems="center" spacing={2} sx={{ py: 12 }}>
            <CircularProgress color="inherit" />
            <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)" }}>
              Loading boutiques and live stock...
            </Typography>
          </Stack>
        ) : (
          <>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h2" className="gradient-text" sx={{ fontWeight: 700 }}>
                  Curate your boutique wardrobe effortlessly.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    label={
                      locationStatus === "ready"
                        ? "Showing nearby boutiques"
                        : locationStatus === "denied"
                        ? "Location access blocked—showing default city"
                        : locationStatus === "unsupported"
                        ? "Location unavailable on this browser"
                        : "Detecting your location…"
                    }
                    size="small"
                    sx={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#f8fafc" }}
                  />
                </Stack>
                <Typography variant="h6" sx={{ mt: 2, color: "rgba(248,250,252,0.75)" }}>
                  Tap a category, choose a boutique with live stock, and add pieces to your cart for a single, secure checkout.
                </Typography>
                {retailersByDistance.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Chip
                      icon={<ShoppingCartIcon fontSize="small" />}
                      label={`${retailersByDistance[0].name} is ${formatDistanceLabel(retailersByDistance[0].distanceKm)}`}
                      sx={{ backgroundColor: "rgba(34,197,94,0.2)", color: "#bbf7d0" }}
                      onClick={focusNearestBoutique}
                    />
                  </Stack>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      background: "linear-gradient(120deg,#ec4899,#a855f7)",
                    }}
                    onClick={scrollToCollections}
                  >
                    Browse collections
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ borderColor: "rgba(248,250,252,0.4)", color: "#f8fafc" }}
                    onClick={() => navigate("/cart")}
                  >
                    View cart ({totalItems})
                  </Button>
                  <Button
                    variant="text"
                    sx={{ color: "rgba(248,250,252,0.8)" }}
                    onClick={handleSeedDemoClick}
                    disabled={isSeeding}
                  >
                    {isSeeding ? "Loading demo stores…" : "Load demo stores"}
                  </Button>
                </Stack>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)", mb: 1 }}>
                    Showing boutiques within {distanceFilterKm} km
                  </Typography>
                  <Slider
                    value={distanceFilterKm}
                    onChange={(_, value) => setDistanceFilterKm(value)}
                    valueLabelDisplay="auto"
                    min={5}
                    max={100}
                    step={5}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className="glass-panel" sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: "rgba(248,250,252,0.7)", mb: 2 }}>
                    This week
                  </Typography>
                  <Grid container spacing={2}>
                    {stats.map((stat) => (
                      <Grid item xs={12} sm={4} key={stat.title}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                          <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)" }}>{stat.title}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Card>
              </Grid>
            </Grid>

            <Typography id="customer-collections" variant="h4" sx={{ mt: 8, fontWeight: 600 }}>
              Explore curated drops
            </Typography>
            <div className="neon-divider" />
            {recommendedCategories.length > 0 && (
              <Card className="glass-panel" sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Tailored to your location
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.72)", mb: 2 }}>
                  These categories are currently in stock at boutiques closest to you.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {recommendedCategories.map((rec) => (
                    <Box key={rec.name} className="glass-panel" sx={{ flex: 1, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: "rgba(248,250,252,0.7)", mb: 0.5 }}>
                        {rec.retailerName}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{rec.name}</Typography>
                      <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.65)" }}>
                        {formatDistanceLabel(rec.distanceKm)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {categories.map((cat) => {
                const available = (categoryRetailerMap[cat.name] || []).length > 0;
                const closestRetailer = available ? categoryRetailerMap[cat.name][0] : null;
                return (
                  <Grid item key={cat.name} xs={12} sm={6} md={4}>
                    <Card
                      className="glass-panel"
                      sx={{
                        background: `${cat.gradient}`,
                        border: "none",
                        opacity: available ? 1 : 0.5,
                        transform: "translateY(0)",
                        transition: "transform 0.3s ease",
                        "&:hover": { transform: available ? "translateY(-8px)" : "none" },
                      }}
                    >
                      <CardActionArea disabled={!available} onClick={() => handleOpenCategoryDialog(cat.name)}>
                        <CardContent sx={{ py: 5, textAlign: "center" }}>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>{cat.name}</Typography>
                          <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.85)", mt: 1 }}>
                            {available
                              ? `${closestRetailer?.retailerName || "Nearby boutique"} · ${formatDistanceLabel(
                                  closestRetailer?.distanceKm
                                )}`
                              : "Coming back soon"}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Grid container spacing={4} sx={{ mt: 6 }} alignItems="stretch">
              <Grid item xs={12} md={6}>
                <Card className="glass-panel" sx={{ height: "100%", p: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Why customers stay</Typography>
                  <Stack spacing={2}>
                    {["1:1 boutique messaging", "Adaptive recommendations", "Unified checkout"]
                      .map((item) => (
                        <Chip key={item} label={item} sx={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#f8fafc" }} />
                      ))}
                  </Stack>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className="glass-panel" sx={{ p: 0, overflow: "hidden" }}>
                  <Box sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>Stores near you</Typography>
                    <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)", mb: 2 }}>
                      Tap a pin to preview real-time stock.
                    </Typography>
                  </Box>
                  <LoadScript googleMapsApiKey="AIzaSyCsN0VtNMbHd96oGj7Ch16FVqHQoyT0Uqc">
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={12}>
                      <Marker position={customerLocation} label="You" />
                      {retailersByDistance.map((retailer) => (
                        <Marker
                          key={retailer.id}
                          position={retailer.location}
                          label={retailer.name?.slice(0, 1) || "R"}
                        />
                      ))}
                    </GoogleMap>
                  </LoadScript>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>

      <Box sx={{ textAlign: "center", py: 4, color: "rgba(248,250,252,0.6)" }}>
        <Typography variant="body2">© 2025 BITSmart — Crafted for immersive commerce.</Typography>
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Choose a boutique for {dialogCategory}
          <IconButton
            size="large"
            onClick={handleCloseDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRetailers.length === 0 ? (
            <Typography variant="body2">No boutiques currently have this item in stock.</Typography>
          ) : (
            <Stack spacing={2}>
              {selectedRetailers.map((retailer) => (
                <Card
                  key={retailer.retailerId}
                  variant="outlined"
                  sx={{
                    borderColor: retailer.retailerId === selectedRetailerId ? "#818cf8" : "rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(15,23,42,0.5)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedRetailerId(retailer.retailerId)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {retailer.retailerName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)" }}>
                      Available: {retailer.availableQty} units · ₹{retailer.price}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(248,250,252,0.6)" }}>
                      {formatDistanceLabel(retailer.distanceKm)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {activeRetailer && (
                <TextField
                  label="Quantity"
                  type="number"
                  value={desiredQty}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  InputProps={{ inputProps: { min: 1, max: activeRetailer.availableQty } }}
                  helperText={`Max ${activeRetailer.availableQty} units available`}
                />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddToCart}
            disabled={!activeRetailer}
          >
            Add to cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
