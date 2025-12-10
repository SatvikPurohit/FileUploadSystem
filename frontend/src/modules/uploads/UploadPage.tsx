import { lazy, useEffect, useState, useCallback } from "react";
import { Box, Button, Snackbar, Alert } from "@mui/material";
import { useUploadQueue } from "./useUploadQueue";
import { FileUploadDropZone } from "./FileUploadDropZone";
import { UploadFileList } from "./UploadFileList";
import { ConcurrencyDisplay } from "./ConcurrencyDisplay";

const CancelIcon = lazy(() => import("@mui/icons-material/Cancel"));
const DeleteIcon = lazy(() => import("@mui/icons-material/Delete"));

export default function UploadPage() {
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error" | "info";
  } | null>(null);

  const handleSnackbar = useCallback(
    (msg: string, severity: "success" | "error" | "info") => {
      setSnack({ open: true, msg, severity });
    },
    []
  );

  const {
    queue,
    handleFiles,
    cancelItem,
    retry,
    removeItem,
    cancelAll,
    clearCompleted,
    successCount,
    hasCancellable,
  } = useUploadQueue(handleSnackbar);

  // To prevent back navigation, we manipulate history and listen to popstate
  useEffect(() => {
    const statesToAdd = 3; // hack
    for (let i = 0; i < statesToAdd; i++) {
      window.history.pushState(null, "", window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      // Immediately push multiple states to block navigation
      window.history.pushState(null, "", window.location.href);
      window.history.pushState(null, "", window.location.href);

      // Show a message that they need to logout
      setSnack({
        open: true,
        msg: "Please use the logout button to exit",
        severity: "info",
      });
    };

    // Use both popstate and beforeunload for extra protection
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // This won't stop back button, but will warn on page close/refresh
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2}>
        <Button
          onClick={cancelAll}
          startIcon={<CancelIcon />}
          disabled={!hasCancellable}
        >
          Cancel All
        </Button>
        <Button
          onClick={clearCompleted}
          startIcon={<DeleteIcon />}
          disabled={successCount === 0}
        >
          Clear Completed
        </Button>
      </Box>

      <ConcurrencyDisplay queue={queue} />

      <FileUploadDropZone onDrop={handleFiles} />

      <UploadFileList
        queue={queue}
        onRetry={retry}
        onRemove={removeItem}
        onCancel={cancelItem}
      />

      <Snackbar
        open={!!snack?.open}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
      >
        <Alert severity={snack?.severity}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
