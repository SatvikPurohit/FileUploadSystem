import Button from "@mui/material/Button";
import LogoutIcon from "@mui/icons-material/Logout";
import { logout } from "../api/authClient";

export default function LogoutButton() {
  return (
    <Button
      variant="outlined"
      color="error"
      startIcon={<LogoutIcon />}
      onClick={() => logout()}
    >
      Logout
    </Button>
  );
}
