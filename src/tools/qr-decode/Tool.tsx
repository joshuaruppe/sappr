import { useEffect, useRef, useState } from "react";
import { Field, OutputArea, ErrorNote, FileDrop } from "@/components/tool/parts";
import { decodeImageData } from "./logic";

export default function QrDecodeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Manage the object URL for the preview, revoking it when it changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) {
      setOutput("");
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOutput("");
    setError("");

    (async () => {
      try {
        const bitmap = await createImageBitmap(file);
        if (cancelled) {
          bitmap.close();
          return;
        }

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get a 2D canvas context.");
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const text = decodeImageData(
          imageData.data,
          imageData.width,
          imageData.height,
        );

        if (cancelled) return;
        if (text == null) {
          setError("No QR code found in image.");
          setOutput("");
        } else {
          setOutput(text);
          setError("");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setOutput("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <>
      <Field
        label="Image"
        hint="PNG, JPEG, WebP, GIF: anything your browser can draw."
      >
        <FileDrop
          accept="image/*"
          onFile={setFile}
          hint={
            file
              ? `Selected ${file.name}. Drop or click to replace`
              : "Drop a QR image here, or click to browse"
          }
        />
      </Field>

      {previewUrl ? (
        <Field label="Preview">
          <img
            src={previewUrl}
            alt="Uploaded QR code preview"
            className="max-h-64 w-auto self-start rounded-md border border-input bg-muted/30 object-contain p-2"
          />
        </Field>
      ) : null}

      <canvas ref={canvasRef} className="hidden" />

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label="Decoded text"
        filename="qr-decoded.txt"
        placeholder={loading ? "Decoding…" : "Decoded text will appear here…"}
      />
    </>
  );
}
