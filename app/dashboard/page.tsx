"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save, Play, Trash2, Power, RefreshCw, Trophy } from "lucide-react"
import { toast } from "sonner"

interface PrizeItem {
    label: string
    prob: number
    value: number
    image?: string
}

interface ServerStatus {
    tiktokUsername: string
    tiktokStatus: string // Connected, Disconnected, Error
    queueLength: number
    isProcessing: boolean
    prizes: PrizeItem[]
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || ""

// Debugging helper
const debugUrl = API_BASE ? API_BASE : "Localhost (Relative Config)"

export default function DashboardPage() {
    const [status, setStatus] = useState<ServerStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [prizes, setPrizes] = useState<PrizeItem[]>([])
    const [tiktokUser, setTiktokUser] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    // Test Spin Form
    const [testUser, setTestUser] = useState("DebugUser")
    const [testCoins, setTestCoins] = useState(10)

    const fetchStatus = async (firstLoad = false) => {
        try {
            const res = await fetch(`${API_BASE}/api/status`)
            if (!res.ok) throw new Error("Server offline")

            const data = await res.json()
            setStatus(data)

            if (firstLoad) {
                setPrizes(data.prizes)
                setTiktokUser(data.tiktokUsername)
                setLoading(false)
            }
        } catch (e) {
            console.error("Failed to fetch status", e)
            if (firstLoad) setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatus(true)
        const interval = setInterval(() => fetchStatus(false), 2000)
        return () => clearInterval(interval)
    }, [])

    const handleConnectTiktok = async () => {
        try {
            setIsSaving(true)
            const res = await fetch(`${API_BASE}/api/config/tiktok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: tiktokUser })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message)
                fetchStatus()
            } else {
                toast.error("Failed: " + data.error)
            }
        } catch (e) {
            toast.error("Connection error")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDisconnectTiktok = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/config/tiktok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: 'disconnect' })
            })
            const data = await res.json()
            if (data.success) toast.success("Disconnected")
        } catch (e) {
            toast.error("Error disconnecting")
        }
    }

    const handleSavePrizes = async () => {
        try {
            setIsSaving(true)
            // Validate total probability
            const totalProb = prizes.reduce((sum, item) => sum + Number(item.prob), 0)
            if (Math.abs(totalProb - 100) > 0.1) {
                toast.warning(`Total probability is ${totalProb.toFixed(1)}%, ideally should be 100%`)
            }

            const res = await fetch(`${API_BASE}/api/config/prizes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: prizes })
            })
            const data = await res.json()
            if (data.success) toast.success("Prizes updated successfully!")
            else toast.error("Failed to update prizes")
        } catch (e) {
            toast.error("Error saving prizes")
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdatePrize = (index: number, field: keyof PrizeItem, value: string | number) => {
        const newPrizes = [...prizes]
        newPrizes[index] = { ...newPrizes[index], [field]: value }
        setPrizes(newPrizes)
    }

    const handleTestSpin = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/test-spin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: testUser, coins: testCoins })
            })
            const data = await res.json()
            if (data.success) toast.success(data.message)
            else toast.error(data.error)
        } catch (e) {
            toast.error("Request failed")
        }
    }

    const handleClearQueue = async () => {
        if (!confirm("Are you sure you want to clear the spin queue?")) return

        try {
            const res = await fetch(`${API_BASE}/api/control/clear-queue`, { method: "POST" })
            toast.success("Queue cleared")
        } catch (e) {
            toast.error("Failed to clear queue")
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-white">Loading Dashboard...</div>
    }

    if (!status) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold text-red-500">Backend Offline</h1>
                <p>Please make sure the backend server (port 3002) is running.</p>
                <p className="text-xs text-neutral-500">Target Backend: {debugUrl || "Not Configured (Using Relative Path)"}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 p-4 md:p-10 text-neutral-100 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Lucky Wheel Control</h1>
                        <p className="text-neutral-400">Manage your TikTok Live game settings</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800">
                            <div className={`w-3 h-3 rounded-full ${status.tiktokStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="font-medium text-sm">
                                {status.tiktokStatus === 'Connected' ? `@${status.tiktokUsername}` : 'Disconnected'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800">
                            <span className="text-neutral-400 text-sm">Queue:</span>
                            <Badge variant={status.queueLength > 0 ? "default" : "secondary"}>
                                {status.queueLength}
                            </Badge>
                            {status.isProcessing && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
                        <TabsTrigger value="general">General & TikTok</TabsTrigger>
                        <TabsTrigger value="prizes">Prize Probabilities</TabsTrigger>
                        <TabsTrigger value="testing">Testing Zone</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: General */}
                    <TabsContent value="general" className="mt-6 space-y-6">
                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-purple-400" /> TikTok Connection</CardTitle>
                                <CardDescription>Connect the system to a TikTok Live account to listen for gifts.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="username">TikTok Username (without @)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="username"
                                            value={tiktokUser}
                                            onChange={(e) => setTiktokUser(e.target.value)}
                                            className="bg-neutral-950 border-neutral-800 text-white"
                                            placeholder="e.g. seecccjeje"
                                        />
                                        <Button
                                            onClick={handleConnectTiktok}
                                            disabled={isSaving || status.tiktokStatus === 'Connected' && status.tiktokUsername === tiktokUser}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                            {status.tiktokStatus === 'Connected' && status.tiktokUsername === tiktokUser ? 'Reconnect' : 'Connect'}
                                        </Button>
                                        {status.tiktokStatus === 'Connected' && (
                                            <Button variant="destructive" size="icon" onClick={handleDisconnectTiktok}>
                                                <Power className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardHeader>
                                <CardTitle className="text-red-400">Danger Zone</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 border border-red-900/30 rounded-lg bg-red-950/10">
                                    <div>
                                        <h3 className="font-semibold text-red-200">Clear Spin Queue</h3>
                                        <p className="text-sm text-red-300/60">Remove all pending spins. This action cannot be undone.</p>
                                    </div>
                                    <Button variant="destructive" onClick={handleClearQueue}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Clear All
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: Prizes */}
                    <TabsContent value="prizes" className="mt-6">
                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Prize Configuration</CardTitle>
                                    <CardDescription>Adjust the probability of each item. Total probability should be 100%.</CardDescription>
                                </div>
                                <Button onClick={handleSavePrizes} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-neutral-800 hover:bg-transparent">
                                            <TableHead>Image</TableHead>
                                            <TableHead className="text-neutral-400">Label (Display Name)</TableHead>
                                            <TableHead className="text-neutral-400">Win Probability (%)</TableHead>
                                            <TableHead className="text-neutral-400">Value (Optional)</TableHead>
                                            <TableHead className="text-right text-neutral-400">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {prizes.map((prize, idx) => (
                                            <TableRow key={idx} className="border-neutral-800 hover:bg-neutral-800/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {prize.image ? (
                                                            <img src={prize.image} alt={prize.label} className="w-10 h-10 object-contain rounded bg-neutral-900" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">No Img</div>
                                                        )}
                                                        <div className="relative">
                                                            <Input
                                                                type="file"
                                                                className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const formData = new FormData();
                                                                        formData.append('file', file);
                                                                        try {
                                                                            const res = await fetch(`${API_BASE}/api/upload`, {
                                                                                method: 'POST',
                                                                                body: formData,
                                                                            });
                                                                            const data = await res.json();
                                                                            if (data.success) {
                                                                                handleUpdatePrize(idx, 'image', data.url);
                                                                            } else {
                                                                                toast.error('Upload failed');
                                                                            }
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            toast.error('Upload error');
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <div className="bg-neutral-800 hover:bg-neutral-700 p-1 rounded cursor-pointer border border-neutral-700">
                                                                <span className="text-xs">⬆️</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={prize.label}
                                                        onChange={(e) => handleUpdatePrize(idx, 'label', e.target.value)}
                                                        className="bg-neutral-950 border-neutral-700 h-8 text-white"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            value={prize.prob}
                                                            onChange={(e) => handleUpdatePrize(idx, 'prob', parseFloat(e.target.value) || 0)}
                                                            className="bg-neutral-950 border-neutral-700 h-8 pr-8 text-white"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={prize.value}
                                                        onChange={(e) => handleUpdatePrize(idx, 'value', parseInt(e.target.value) || 0)}
                                                        className="bg-neutral-950 border-neutral-700 h-8 text-white"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                                                        onClick={() => {
                                                            const newPrizes = prizes.filter((_, i) => i !== idx)
                                                            setPrizes(newPrizes)
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button
                                    variant="outline"
                                    className="w-full mt-4 border-dashed border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                                    onClick={() => setPrizes([...prizes, { label: "New Prize", prob: 0, value: 0 }])}
                                >
                                    + Add New Prize Item
                                </Button>

                                <div className="mt-4 p-4 bg-neutral-950 rounded-lg flex justify-between items-center">
                                    <span className="text-sm text-neutral-400">Total Probability:</span>
                                    <span className={`font-bold ${Math.abs(prizes.reduce((s, i) => s + Number(i.prob), 0) - 100) < 0.1 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {prizes.reduce((s, i) => s + Number(i.prob), 0).toFixed(1)}%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: Testing */}
                    <TabsContent value="testing" className="mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader>
                                    <CardTitle>Manual Spin Trigger</CardTitle>
                                    <CardDescription>Simulate a gift event to trigger the wheel.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Simulation User</Label>
                                        <Input
                                            value={testUser}
                                            onChange={(e) => setTestUser(e.target.value)}
                                            className="bg-neutral-950 border-neutral-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Coins Amount (Min 10)</Label>
                                        <Input
                                            type="number"
                                            value={testCoins}
                                            onChange={(e) => setTestCoins(parseInt(e.target.value) || 0)}
                                            className="bg-neutral-950 border-neutral-700"
                                        />
                                        <p className="text-xs text-neutral-500">10 Coins = 1 Spin</p>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleTestSpin}>
                                        <Play className="w-4 h-4 mr-2" /> Trigger Spin
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader>
                                    <CardTitle>How it works</CardTitle>
                                </CardHeader>
                                <CardContent className="text-neutral-400 text-sm space-y-2">
                                    <p>1. Connect your TikTok account in the General tab.</p>
                                    <p>2. Configure your prizes and probabilities.</p>
                                    <p>3. Start your LIVE. The system will automatically detect gifts.</p>
                                    <p>4. Every 10 coins worth of gifts = 1 Spin.</p>
                                    <p>5. The queue system handles multiple gifts automatically.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
