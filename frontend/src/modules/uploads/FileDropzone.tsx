import { lazy } from "react";
import { Paper, Typography } from "@mui/material";
import { useDropzone } from "react-dropzone";

const UploadFileIcon = lazy(() => import("@mui/icons-material/UploadFile"));

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
}

export const FileDropzone = ({ onDrop }: FileDropzoneProps) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 4,
        textAlign: "center",
        border: "2px dashed",
        borderColor: "grey.400",
        cursor: "pointer",
      }}
    >
      <input {...getInputProps()} />
      <UploadFileIcon sx={{ fontSize: 64, mb: 1 }} />
      <Typography>Drag & drop files here, or click to select</Typography>
      <Typography variant="caption">
        Allowed: PDF, DOCX, TXT — max 10MB each
      </Typography>
    </Paper>
  );
};
