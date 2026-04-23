"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ImageUploaderProps {
  value?: string;
  kind: "hero" | "photos" | "thumbnails" | "members";
  onChange: (publicUrl: string) => void;
  onClear?: () => void;
  accept?: string;
  maxSizeMb?: number;
}

export function ImageUploader({
  value,
  kind,
  onChange,
  onClear,
  accept = "image/jpeg,image/png,image/webp,image/gif,image/avif",
  maxSizeMb = 5,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
    if (!allowed.includes(ext)) {
      setError("파일 형식이 올바르지 않습니다 (JPG, PNG, WebP, GIF, AVIF)");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`파일 크기가 ${maxSizeMb}MB를 초과합니다`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // 1. Get signed URL
      const urlRes = await fetch("/api/portfolio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ext }),
      });

      if (!urlRes.ok) {
        const j = await urlRes.json().catch(() => ({}));
        setError(j.error || "업로드 URL 발급에 실패했습니다");
        return;
      }

      const { data } = await urlRes.json();
      setProgress(30);

      // 2. Extract token from signedUrl
      const signedUrl: string = data.signedUrl;
      const urlObj = new URL(signedUrl);
      const token = urlObj.searchParams.get("token") || signedUrl;

      // 3. Upload to Supabase Storage using signed URL
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .uploadToSignedUrl(data.path, token, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        // Fallback: try direct PUT to signedUrl
        const putRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          setError("이미지 업로드에 실패했습니다");
          return;
        }
      }

      setProgress(90);
      onChange(data.publicUrl);
      setProgress(100);
    } catch {
      setError("이미지 업로드에 실패했습니다");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
          <Image src={value} alt="업로드된 이미지" width={80} height={80} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn sm" onClick={() => inputRef.current?.click()}>변경</button>
          {onClear && (
            <button type="button" className="btn sm ghost" onClick={onClear} style={{ color: "var(--danger)" }}>제거</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="이미지 업로드 영역, 클릭하거나 파일을 드래그하세요"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? "var(--info)" : "var(--border-2)"}`,
          background: dragOver ? "var(--info-bg)" : "#fff",
          borderRadius: 8,
          padding: "24px 20px",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "border-color 150ms, background 150ms",
        }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--mf)" }} />
            <div style={{ fontSize: 12, color: "var(--mf)" }}>업로드 중...</div>
            <div style={{ width: "100%", height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--info)", width: `${progress}%`, transition: "width 200ms ease-linear" }} />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud size={24} style={{ color: "var(--mf)", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 13, color: "var(--mf)", marginBottom: 4 }}>이미지를 드래그하거나 클릭하여 업로드하세요</div>
            <div style={{ fontSize: 11, color: "var(--mf-2)", fontFamily: "var(--font-mono)" }}>
              JPG, PNG, WebP, GIF, AVIF (최대 {maxSizeMb}MB)
            </div>
          </>
        )}
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--danger)" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}
