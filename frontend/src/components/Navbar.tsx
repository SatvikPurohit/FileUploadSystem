import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LogoutButton from "./LogoutButton";

export default function Navbar() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Document Upload Manager
        </Typography>

        <LogoutButton />
      </Toolbar>
    </AppBar>
  );
}
