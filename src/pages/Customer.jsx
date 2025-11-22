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


const calculateEstimatedDeliveryDate = (distanceKm) => {
  const baseDays = 1; // Base delivery time in days
  const daysPer50Km = 0.5; // Additional days per 50km
  
  const additionalDays = Math.ceil((distanceKm / 50) * daysPer50Km);
  const totalDays = baseDays + additionalDays;
  
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + totalDays);
  
  return {
    estimatedDelivery: deliveryDate,
    deliveryDays: totalDays
  };
};

const formatDeliveryEstimate = (estimatedDelivery) => {
  const today = new Date();
  const deliveryDate = new Date(estimatedDelivery);
  const diffTime = Math.abs(deliveryDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days (${deliveryDate.toDateString()})`;
  return deliveryDate.toDateString();
};

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
  width: '100%',
  height: 'calc(100% - 80px)',
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  top: '80px',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

  const filteredRetailers = useMemo(
    () =>
      retailersByDistance.filter((retailer) => {
        // Filter by distance
        if (retailer.distanceKm != null && retailer.distanceKm > distanceFilterKm) {
          return false;
        }
        
        // Filter by search term (case-insensitive)
        if (searchTerm && !retailer.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Filter by category if one is selected
        if (selectedCategory && (!retailer.stock || !retailer.stock[selectedCategory])) {
          return false;
        }
        
        return true;
      }),
    [retailersByDistance, distanceFilterKm, searchTerm, selectedCategory]
  );

  const categoryRetailerMap = useMemo(() => {
    const map = {};
    filteredRetailers.forEach((retailer) => {
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
  }, [filteredRetailers]);

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
      alert("This item is currently out of stock across all shops.");
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
  
  // Calculate delivery estimate
  const distance = activeRetailer.distanceKm || 0;
  const { estimatedDelivery, deliveryDays } = calculateEstimatedDeliveryDate(distance);
  
  addItem(
    {
      retailerId: activeRetailer.retailerId,
      retailerName: activeRetailer.retailerName,
      retailerEmail: activeRetailer.retailerEmail,
      category: dialogCategory,
      price: activeRetailer.price,
      availableQty: activeRetailer.availableQty,
      distanceKm: distance,
      estimatedDelivery: estimatedDelivery.toISOString(),
      deliveryDays,
      addedAt: new Date().toISOString()
    },
    desiredQty
  );
  
  alert(`${dialogCategory} added to cart from ${activeRetailer.retailerName}.\nEstimated delivery: ${formatDeliveryEstimate(estimatedDelivery)}`);
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
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search boutiques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ mb: 2, backgroundColor: "rgba(255, 255, 255, 1)" }}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ mr: 1, color: 'text.secondary' }}>🔍</Box>
                ),
              },
            }}
          />
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
                  <Typography variant="subtitle2" color="textSecondary">
                    Showing {filteredRetailers.length} boutiques{selectedCategory ? ` with ${selectedCategory}` : ''}{searchTerm ? ` matching "${searchTerm}"` : ''}
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
              <Grid item xs={12} md={6}>
                <Card className="glass-panel" sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ color: "rgba(5, 57, 109, 0.83)", mb: 2 }}>
                    This week
                  </Typography>
                  
                  
                  <Grid container spacing={2}>
                    {stats.map((stat) => (
                      <Grid item xs={12} sm={4} key={stat.title}>
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>{stat.value}</Typography>
                          <Typography variant="body2" sx={{ color: "rgba(0, 5, 9, 0.7)" }}>{stat.title}</Typography>
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
            
            {/* Products Grid */}
            <Box sx={{ mt: 6 }}>
              <Grid container spacing={3}>
                {categories.map((category) => {
                  const categoryRetailers = categoryRetailerMap[category.name] || [];
                  const productCount = categoryRetailers.reduce(
                    (total, curr) => total + (curr.availableQty || 0), 0
                  );
                  
                  return (
                    <Grid item xs={12} key={category.name}>
                      <Card sx={{ mb: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
                        <Box sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600,color:'rgba(252, 251, 248, 0.8)' }}>
                              {category.name}
                              <Typography component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                                ({productCount} items)
                              </Typography>
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => setSelectedCategory(category.name)}
                              sx={{ textTransform: 'none' }}
                            >
                              View all
                            </Button>
                          </Box>
                          
                          <Grid container spacing={2}>
                            {categoryRetailers.slice(0, 4).map((retailer, idx) => (
                              <Grid item xs={6} sm={4} md={3} key={`${retailer.retailerId}-${idx}`}>
                                <Card 
                                  sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                      transform: 'translateY(-4px)',
                                      boxShadow: 3
                                    }
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      height: 160, 
                                      background: category.gradient,
                                      //backgroundImage: 'url(oop-project/src/assets/react.svg)',
                                      //backgroundSize: 'cover',
                                      //backgroundPosition: 'center',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '2rem',
                                      fontWeight: 600,
                                      textShadow: '1px 1px 3px rgba(0,0,0,0.3)'
                                    }}
                                  >
                                    {category.name.charAt(0)}
                                  </Box>
                                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {category.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      {retailer.retailerName}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="h6" color="primary">
                                        ₹{CATEGORY_PRICES[category.name]?.toLocaleString()}
                                      </Typography>
                                      <Chip 
                                        label={`${retailer.availableQty} in stock`} 
                                        size="small" 
                                        color={retailer.availableQty > 5 ? 'success' : 'warning'}
                                      />
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Grid container spacing={4} sx={{ mt: 6 }}>
              <Grid item xs={12} md={2} sx ={{width:'100%'}}>
                <Card className="glass-panel" sx={{ p: 3, height: 'fit-content' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>Why customers stay</Typography>
                  <Stack spacing={1.5}>
                    {["1:1 messaging", "Smart picks", "Easy checkout"]
                      .map((item) => (
                        <Chip 
                          key={item} 
                          label={item} 
                          size="small"
                          sx={{ 
                            backgroundColor: "rgba(14, 0, 0, 0.08)", 
                            color: "#090909ff",
                            fontSize: '0.75rem',
                            height: '24px'
                          }} 
                        />
                      ))}
                  </Stack>
                </Card>
              </Grid>
              <Grid item xs={12} md={10} sx={{ width: '100%' }}>
                <Card className="glass-panel" sx={{ p: 0, overflow: 'hidden', width: '100%', height: '600px' }}>
                  <Box sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>Stores near you</Typography>
                    <Typography variant="body2" sx={{ color: "rgba(9, 9, 10, 0.7)", mb: 2 }}>
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
