import { createTheme } from "@mui/material/styles";
const theme = createTheme({
  direction: "rtl",
  typography: { fontFamily: "Inter, Arial, Helvetica, sans-serif" },
  components: { MuiButton: { defaultProps: { disableElevation: true } } },
});
export default theme;
