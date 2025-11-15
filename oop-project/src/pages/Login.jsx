import { useState } from "react";
import { signInWithGoogle } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Button, Container, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function Login() {
  const [role, setRole] = useState("Customer");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const user = await signInWithGoogle();
    if (!user) return;

    if (role === "Customer") navigate("/customer");
    else if (role === "Retailer") navigate("/retailer");
    else navigate("/wholesaler");
  };

  return (
    <Container style={{ textAlign: "center", marginTop: "100px" }}>
      <FormControl>
        <InputLabel id="role-label">Login as</InputLabel>
        <Select
          labelId="role-label"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ minWidth: 200, marginBottom: 20 }}
        >
          <MenuItem value="Customer">Customer</MenuItem>
          <MenuItem value="Retailer">Retailer</MenuItem>
          <MenuItem value="Wholesaler">Wholesaler</MenuItem>
        </Select>
      </FormControl>
      <br />
      <Button variant="contained" color="primary" onClick={handleLogin}>
        Continue with Google
      </Button>
    </Container>
  );
}
