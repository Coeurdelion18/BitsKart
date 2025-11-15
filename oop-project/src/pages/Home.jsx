import { Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  return (
    <Container style={{ textAlign: 'center', marginTop: '100px' }}>
      <Typography variant="h2">BITSmart</Typography>
      <Typography variant="subtitle1" gutterBottom>A complete e-commerce solution.</Typography>
      <Button variant="contained" color="primary" onClick={() => navigate("/login")} style={{ margin: 10 }}>
        Login
      </Button>
      <Button variant="contained" color="success" onClick={() => navigate("/login")} style={{ margin: 10 }}>
        Sign Up
      </Button>
    </Container>
  );
}
