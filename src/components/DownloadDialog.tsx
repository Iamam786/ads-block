import { Dialog } from "@radix-ui/react-dialog";
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group";
import { useState } from "react";
import { Button } from "./ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Headphones, Video } from "lucide-react";
export default function DownloadDialog() {
    return (

        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Download Options</DialogTitle>
                    <DialogDescription>Choose format and quality for your download</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Format Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Format</Label>
                        <RadioGroup value={downloadFormat} onValueChange={(value: any) => setDownloadFormat(value)}>
                            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                                <RadioGroupItem value="video" id="video" />
                                <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <Video className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-medium">Video</div>
                                        <div className="text-sm text-muted-foreground">Download with video and audio</div>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                                <RadioGroupItem value="audio" id="audio" />
                                <Label htmlFor="audio" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <Headphones className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-medium">Audio Only</div>
                                        <div className="text-sm text-muted-foreground">Download audio only (MP3)</div>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Quality Selection (only for video) */}
                    {downloadFormat === "video" && (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Video Quality</Label>
                            <RadioGroup value={videoQuality} onValueChange={setVideoQuality}>
                                <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="highest" id="highest" />
                                    <Label htmlFor="highest" className="cursor-pointer flex-1">
                                        <div className="font-medium">Highest Available</div>
                                        <div className="text-sm text-muted-foreground">Best quality (larger file)</div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="1080" id="1080" />
                                    <Label htmlFor="1080" className="cursor-pointer flex-1">
                                        1080p (Full HD)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="720" id="720" />
                                    <Label htmlFor="720" className="cursor-pointer flex-1">
                                        720p (HD)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="480" id="480" />
                                    <Label htmlFor="480" className="cursor-pointer flex-1">
                                        480p (SD)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="360" id="360" />
                                    <Label htmlFor="360" className="cursor-pointer flex-1">
                                        360p (Low)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowDownloadDialog(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleDownload} disabled={downloading} className="flex-1">
                        {downloading ? "Downloading..." : "Download"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}