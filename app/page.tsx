"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Copy, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { QRCodeGenerator } from "@/components/qr-code-generator"

// Bech32 encoding implementation
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const value of values) {
    const top = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ value
    for (let i = 0; i < 5; i++) {
      chk ^= (top >> i) & 1 ? GEN[i] : 0
    }
  }
  return chk
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [
    ...hrp.split("").map((c) => c.charCodeAt(0) >> 5),
    0,
    ...hrp.split("").map((c) => c.charCodeAt(0) & 31),
    ...data,
  ]
  const polymod = bech32Polymod([...values, 0, 0, 0, 0, 0, 0]) ^ 1
  const checksum = []
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 31)
  }
  return checksum
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0
  let bits = 0
  const ret = []
  const maxv = (1 << toBits) - 1
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1

  for (const value of data) {
    if (value < 0 || value >> fromBits) return null
    acc = ((acc << fromBits) | value) & maxAcc
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      ret.push((acc >> bits) & maxv)
    }
  }

  if (pad) {
    if (bits) ret.push((acc << (toBits - bits)) & maxv)
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    return null
  }

  return ret
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = [...data, ...bech32CreateChecksum(hrp, data)]
  return hrp + "1" + combined.map((d) => CHARSET[d]).join("")
}

function encodeLNURL(url: string): string {
  const urlBytes = new TextEncoder().encode(url)
  const converted = convertBits(Array.from(urlBytes), 8, 5, true)
  if (!converted) throw new Error("Failed to convert bits")
  return bech32Encode("lnurl", converted).toUpperCase()
}

export default function LNURLConverter() {
  const [lightningAddress, setLightningAddress] = useState("")
  const [lnurl, setLnurl] = useState("")
  const [lud16Url, setLud16Url] = useState("")
  const [includeLightningPrefix, setIncludeLightningPrefix] = useState(false)
  const [finalUrl, setFinalUrl] = useState("")
  const { toast } = useToast()

  const convertToLNURL = () => {
    if (!lightningAddress) {
      toast({
        title: "Error",
        description: "Please enter a lightning address",
        variant: "destructive",
      })
      return
    }

    const parts = lightningAddress.split("@")
    if (parts.length !== 2) {
      toast({
        title: "Error",
        description: "Invalid lightning address format. Use: username@domain.com",
        variant: "destructive",
      })
      return
    }

    const [username, domain] = parts
    const lud16 = `https://${domain}/.well-known/lnurlp/${username}`
    setLud16Url(lud16)

    try {
      const encoded = encodeLNURL(lud16)
      setLnurl(encoded)

      const final = includeLightningPrefix ? `lightning:${encoded}` : encoded
      setFinalUrl(final)

      toast({
        title: "Success",
        description: "Lightning address converted to LNURL!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to encode LNURL",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "LNURL copied to clipboard",
    })
  }

  const handlePrefixToggle = (checked: boolean) => {
    setIncludeLightningPrefix(checked)
    if (lnurl) {
      setFinalUrl(checked ? `lightning:${lnurl}` : lnurl)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-balance">Lightning Address to LNURL Converter</h1>
          <p className="text-muted-foreground text-pretty">
            Convert lightning addresses to LNURL format with QR code generation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Convert Lightning Address
            </CardTitle>
            <CardDescription>
              Enter a lightning address (username@domain.com) to generate the corresponding LNURL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lightning-address">Lightning Address</Label>
              <Input
                id="lightning-address"
                placeholder="satoshi@example.com"
                value={lightningAddress}
                onChange={(e) => setLightningAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && convertToLNURL()}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="lightning-prefix" checked={includeLightningPrefix} onCheckedChange={handlePrefixToggle} />
              <Label htmlFor="lightning-prefix">Include "lightning:" prefix</Label>
            </div>

            <Button onClick={convertToLNURL} className="w-full">
              Convert to LNURL
            </Button>
          </CardContent>
        </Card>

        {lud16Url && (
          <Card>
            <CardHeader>
              <CardTitle>LUD16 URL</CardTitle>
              <CardDescription>The well-known URL for the lightning address</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input value={lud16Url} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(lud16Url)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {finalUrl && (
          <Card>
            <CardHeader>
              <CardTitle>LNURL Result</CardTitle>
              <CardDescription>
                The encoded LNURL {includeLightningPrefix ? "with lightning: prefix" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input value={finalUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(finalUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <QRCodeGenerator value={finalUrl} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
