// DownloadDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "..//components/ui/radio-group";
import { Headphones, Video, DownloadCloud } from "lucide-react";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  videoId: string | null; // <— passed from parent
  title?: string; // optional nice filename
};

export default function DownloadDialog({
  open,
  setOpen,
  videoId,
  title,
}: Props) {
  const [format, setFormat] = useState<"video" | "audio">("video");
  const [quality, setQuality] = useState<string>("720");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!videoId) return null; // safety – nothing to download

  async function handleDownload() {
    setLoading(true);

    try {
      // 1. Ask co.wuk.sh for a direct download link
      const api = "https://co.wuk.sh/api/json";
      const body = {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        vQuality:
          format === "audio"
            ? "worst"
            : quality === "highest"
            ? "best"
            : quality,
        aFormat: format === "audio" ? "mp3" : "best",
        filename: "title", // they will sanitise it
      };

      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.status || data.status !== "ok" || !data.url?.length) {
        throw new Error("API error");
      }

      // data.url is already an array with one object
      const { url, filename } = data.url[0];

      // 2. Trigger browser download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Download failed – try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Options</DialogTitle>
          <DialogDescription>Choose format and quality</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as any)}
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="video" id="video" />
                <Label
                  htmlFor="video"
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <Video className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Video</div>
                    <div className="text-sm text-muted-foreground">
                      Video + audio
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="audio" id="audio" />
                <Label
                  htmlFor="audio"
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <Headphones className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Audio Only</div>
                    <div className="text-sm text-muted-foreground">MP3</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quality (video only) */}
          {format === "video" && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quality</Label>
              <RadioGroup value={quality} onValueChange={setQuality}>
                {["highest", "1080", "720", "480", "360"].map((q) => (
                  <div
                    key={q}
                    className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={q} id={q} />
                    <Label htmlFor={q} className="cursor-pointer flex-1">
                      {q === "highest" ? "Highest available" : `${q}p`}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <DownloadCloud className="mr-2 h-4 w-4 animate-pulse" />
                Preparing…
              </>
            ) : (
              "Download"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
