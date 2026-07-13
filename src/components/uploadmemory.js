import { useDropzone } from "react-dropzone";
import { API_BASE } from "../api";

export default function UploadMemory() {
  const onDrop = async (acceptedFiles) => {
    const formData = new FormData();
    formData.append("file", acceptedFiles[0]);

    await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} style={{ border: "2px dashed orange", padding: "20px" }}>
      <input {...getInputProps()} />
      <p>Drag & drop files here, or click to select</p>
    </div>
  );
}
