import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Document uploader for temporary context addition
 * @param {Object} props
 * @param {Function} props.onDocumentsAdd - Callback with uploaded documents
 * @param {number} props.maxFiles - Maximum files to upload (default: 3)
 */
export default function DocumentUploader({ onDocumentsAdd, maxFiles = 3 }) {
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (uploadedDocs.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} documents allowed`);
      return;
    }

    setIsUploading(true);
    try {
      const processedDocs = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          return {
            id: Math.random().toString(36),
            name: file.name,
            size: file.size,
            content: text,
            type: file.type
          };
        })
      );

      const newDocs = [...uploadedDocs, ...processedDocs];
      setUploadedDocs(newDocs);
      onDocumentsAdd(newDocs);
      toast.success(`${processedDocs.length} document(s) added to context`);
    } catch (error) {
      toast.error("Failed to process document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (id) => {
    const newDocs = uploadedDocs.filter(doc => doc.id !== id);
    setUploadedDocs(newDocs);
    onDocumentsAdd(newDocs);
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
          isUploading ? "border-slate-300 bg-slate-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex items-center justify-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-600">Processing...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                Drop files or click to upload
                <br />
                <span className="text-xs text-slate-500">
                  {uploadedDocs.length}/{maxFiles} documents
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          {uploadedDocs.map((doc) => (
            <Card key={doc.id} className="p-3 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-indigo-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-indigo-700">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                  Context
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument(doc.id)}
                  className="h-6 w-6 flex-shrink-0 text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}