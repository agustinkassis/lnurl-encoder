"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import QRCode from "qrcode"

interface QRCodeGeneratorProps {
  value: string
}

const QR_SIZE = 200

export function QRCodeGenerator({ value }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const { toast } = useToast()

  const generateQR = async (text: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Generate QR code using the qrcode library
      await QRCode.toCanvas(canvas, text, {
        width: QR_SIZE,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })

      // Store data URL for SVG download
      const dataUrl = canvas.toDataURL("image/png")
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error("Error generating QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (value) {
      generateQR(value)
    }
  }, [value])

  const downloadQR = async (format: "png" | "svg") => {
    if (!value) return

    try {
      if (format === "png") {
        const canvas = canvasRef.current
        if (!canvas) return

        const link = document.createElement("a")
        link.download = "lnurl-qr.png"
        link.href = canvas.toDataURL("image/png")
        link.click()

        toast({
          title: "Downloaded!",
          description: "QR code saved as PNG",
        })
      } else {
        // Generate SVG using qrcode library
        const svgString = await QRCode.toString(value, {
          type: "svg",
          width: QR_SIZE,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        })

        const blob = new Blob([svgString], { type: "image/svg+xml" })
        const link = document.createElement("a")
        link.download = "lnurl-qr.svg"
        link.href = URL.createObjectURL(blob)
        link.click()
        URL.revokeObjectURL(link.href)

        toast({
          title: "Downloaded!",
          description: "QR code saved as SVG",
        })
      }
    } catch (error) {
      console.error("Error downloading QR code:", error)
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      })
    }
  }

  if (!value) return null

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-lg border">
          <canvas ref={canvasRef} className="border rounded" style={{ imageRendering: "pixelated" }} />
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => downloadQR("png")} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadQR("svg")} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download SVG
        </Button>
      </div>
    </div>
  )
}
