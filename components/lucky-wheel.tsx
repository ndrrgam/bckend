"use client"

import { useEffect, useRef, useState } from "react"

interface LuckyWheelProps {
  username?: string
  rewardText?: string
  isSpinning?: boolean
  onSpinComplete?: () => void
  isOverlay?: boolean
}

export function LuckyWheel({
  username = "@TikTokUser",
  rewardText = "",
  isSpinning = false,
  onSpinComplete,
  isOverlay = false,
}: LuckyWheelProps) {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || '' // Empty defaults to current relative path if using proxy, but WS needs full URL usually? 
  // If we are on ngrok (https), we wanted wss://ngrok-host/api/.. but WS is on 3002.
  // We can't easily proxy WS through Next.js dev server rewrites reliably.
  // But let's try assuming the user might also tunnel 3002 or we use direct localhost for default.
  // Actually, for a mobile device, 'localhost' fails.
  // Best bet without 2nd tunnel: user accepts WS might fail on mobile OR we try to determine host.
  // Let's stick to the current logic but clean it up.
  // If we use rewrites, apiBase is relative.

  // For the frontend component, we need to know where the WEBSOCKET server is.
  // If we only tunnel 3000, we technically can't reach 3002 from outside.
  // UNLESS we use a public websocket server or tunnel 3002.
  // Let's hardcode the WS URL to the window.location.hostname for now IF we assume 3002 is also tunneled?
  // No, the robust way is asking the user to tunnel both or just use one.
  // Let's assume for now we just want HTTP working for dashboard.
  // But let's allow it to attempt connection to the same host on port 3002? No, ngrok port 80 maps to 3000.
  // We'll leave it as is, but maybe add a note or fallback.
  // Actually the original code was: 
  // const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'
  // const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (apiBase.startsWith('https') ? apiBase.replace('https', 'wss') : apiBase.replace('http', 'ws'))

  // If I change dashboard page to use relative "", then apiBase is "".
  // Then wsUrl becomes "ws". That's invalid.
  // So I should keep a fallback for the WS specifically.
  // Determine WS URL: Prefer explicit env var, otherwise derive from HTTP URL, otherwise default to localhost.
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
    (apiBase ? apiBase.replace('https', 'wss').replace('http', 'ws') : 'ws://localhost:3002')
  const scrollRef = useRef<HTMLDivElement>(null)

  // State for Spin Queue and Sequence Control
  const [queue, setQueue] = useState<any[]>([])
  const [cooldown, setCooldown] = useState(false)
  const [spinning, setSpinning] = useState(isSpinning)

  // Visual states
  const [connectionStatus, setConnectionStatus] = useState("Menghubungkan...")
  const [queueStatus, setQueueStatus] = useState({ length: 0, isProcessing: false })
  const [lastSpinData, setLastSpinData] = useState<any>(null)
  const [currentPrize, setCurrentPrize] = useState<string>("")
  const [displayedResults, setDisplayedResults] = useState<any[]>([])

  const [ws, setWs] = useState<WebSocket | null>(null)

  // Fungsi untuk menyimpan data pemenang
  const saveWinnerData = async (username: string, item: string) => {
    try {
      const response = await fetch(`${apiBase}/api/winners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          item,
        }),
      })

      if (response.ok) {
        console.log(`✅ Winner data saved: ${username} won ${item}`)
      } else {
        console.error('❌ Failed to save winner data')
      }
    } catch (error) {
      console.error('❌ Error saving winner data:', error)
    }
  }

  const [prizeConfig, setPrizeConfig] = useState<any[]>([])

  // Fetch prize config on load
  useEffect(() => {
    fetch(`${apiBase}/api/status`)
      .then(res => res.json())
      .then(data => {
        if (data.prizes) setPrizeConfig(data.prizes)
      })
      .catch(err => console.error("Failed to load prizes", err))
  }, [apiBase])

  const tiles = Array(30)
    .fill(null)
    .map((_, i) => {
      // Use dynamic prizes if available, else fallback to hardcoded for safety
      let text = "mitos";
      let image = "";

      if (prizeConfig.length > 0) {
        const item = prizeConfig[i % prizeConfig.length];
        text = item.label;
        // Fix: If image is an upload, it lives on the backend. If it's an asset, it lives on frontend.
        if (item.image && item.image.startsWith('/uploads')) {
          image = `${apiBase}${item.image}`;
        } else {
          image = item.image;
        }
      } else {
        // Fallback
        const possiblePrizes = ["mitos", "scare", "mitos", "fb", "mitos", "scare", "mitos", "gladiator"]
        text = possiblePrizes[i % possiblePrizes.length]
      }

      if (spinning) {
        // If spinning, use the pattern
      } else {
        // If stopped, we might want to show the result... but currently logic is just pattern.
        // We rely on the processNextItem scrolling to the correct tile.
        // So we do NOTHING here, preserving the pattern.
      }

      return { id: i, text, image }
    })

  // WebSocket connection & Queue Ingestion
  useEffect(() => {
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log('✅ Terhubung ke TikTok Live Spin Backend')
      setConnectionStatus("Terhubung")
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('📡 Menerima:', data)

      if (data.type === 'spin_request') {
        // Queue Logic:
        // When a new spin request comes, we append items to the queue.
        // We only clear displayed results for a FRESH new batch if queue was empty,
        // giving the impression of a new "Session".

        setQueue(prev => {
          // If queue is empty, it means we are starting a fresh sequence
          if (prev.length === 0) {
            setDisplayedResults([])
          }

          // Map items
          const newItems = (data.prizeResults || []).map((item: any) => ({
            ...item,
            winnerUser: data.user,
            giftName: data.giftName,
            coin: data.coin
          }))

          return [...prev, ...newItems]
        })

        // Update Header Info
        if (data.user) {
          setLastSpinData(data)
          // Update DOM for overlay
          const cleanUsername = data.user.replace('@', '')
          const usernameElement = document.querySelector('[data-tiktok-username]')
          if (usernameElement) {
            usernameElement.textContent = `@${cleanUsername}`
          }
        }

      } else if (data.type === 'queue_status') {
        setQueueStatus({
          length: data.queueLength || 0,
          isProcessing: data.isProcessing || false
        })
      } else if (data.type === 'system') {
        if (data.message?.includes('Connected to TikTok Live')) {
          setConnectionStatus("Terhubung ke TikTok")
        }
      }
    }

    websocket.onclose = () => {
      setConnectionStatus("Terputus")
      setTimeout(() => window.location.reload(), 3000)
    }

    websocket.onerror = (error) => {
      console.error(error)
      setConnectionStatus("Kesalahan Koneksi")
    }

    setWs(websocket)
    return () => websocket.close()
  }, [])


  // CORE LOGIC: Sequential Spin Loop
  // CORE LOGIC: Sequential Spin Loop
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Only process if we have items, we aren't currently processing a cycle, and no external cooldown
    if (queue.length > 0 && !isProcessing) {

      const processNextItem = async () => {
        setIsProcessing(true) // Lock processing

        // 1. START SPIN (Visual)
        setSpinning(true)

        // Spin Duration
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 2. STOP SPIN (Visual)
        setSpinning(false)

        // 3. PROCESS RESULT
        const nextItem = queue[0]

        // --- NEW LOGIC: Scroll to the winner ---
        // Find which tile corresponds to the winner
        if (scrollRef.current) {
          const container = scrollRef.current;
          const winnerLabel = nextItem.label;

          // We are using [...tiles, ...tiles] so indices are 0 to 59
          // Current scroll position is likely in the first half (0 to width/2)
          // We want to scroll to a tile in the SECOND half that matches the winner
          // to ensure it feels like "landing" forward.

          // Find valid indices for this label in the original tiles array
          const validIndices = tiles
            .map((t, i) => t.text === winnerLabel ? i : -1)
            .filter(i => i !== -1);

          if (validIndices.length > 0) {
            // Pick a random valid index from the pattern to keep it dynamic? 
            // Or just the first one? Let's pick a random one to vary where it lands if pattern has multiples.
            const baseIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
            // Target index in the second set (offset by 30)
            const targetIndex = baseIndex + 30; // 30 is tiles.length

            // Estimate width logic
            // We can get the first child's width
            const firstChild = container.firstElementChild as HTMLElement;
            if (firstChild) {
              // Get true width including gap/margin if any?
              // The container has gap-4 (1rem = 16px).
              // But offsetLeft computation is safer.
              const children = Array.from(container.children) as HTMLElement[];
              const targetElement = children[targetIndex];

              if (targetElement) {
                // Centering logic
                const containerWidth = container.clientWidth;
                const tileWidth = targetElement.offsetWidth;
                const targetLeft = targetElement.offsetLeft;

                // Calculate center position
                const centerPos = targetLeft - (containerWidth / 2) + (tileWidth / 2);

                // Smooth scroll to it
                container.scrollTo({
                  left: centerPos,
                  behavior: 'smooth'
                });

                // Wait for smooth scroll to roughly finish (e.g. 500ms - 1s)
                await new Promise(r => setTimeout(r, 800));
              }
            }
          }
        }

        // Update Visuals
        setCurrentPrize(nextItem.label)
        setDisplayedResults(prev => [...prev, nextItem])

        if (nextItem.winnerUser) {
          saveWinnerData(nextItem.winnerUser, nextItem.label)
        }

        // 4. REMOVE FROM QUEUE
        setQueue(prev => prev.slice(1))

        // 5. POST-SPIN DELAY (Reading time)
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 6. UNLOCK for next item
        setIsProcessing(false)

        if (queue.length <= 1) {
          onSpinComplete?.()
        }
      }

      processNextItem()
    }
  }, [queue, isProcessing, onSpinComplete])


  // Animation Loop (Standard)
  useEffect(() => {
    setSpinning(isSpinning)
  }, [isSpinning])

  useEffect(() => {
    if (!spinning || !scrollRef.current) return

    const container = scrollRef.current
    let animationFrame: number
    let position = container.scrollLeft
    const speed = 30

    const animate = () => {
      position += speed
      if (position >= container.scrollWidth / 2) {
        position = 0
      }
      container.scrollLeft = position
      animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [spinning])

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-[800px] mx-auto font-sans">
      {/* Connection Status (Hidden in Overlay Mode unless error) */}
      {!isOverlay ? (
        <div className="flex items-center gap-2 text-sm bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${connectionStatus === "Terhubung ke TikTok" ? 'bg-emerald-500 text-emerald-500' :
            connectionStatus === "Terhubung" ? 'bg-yellow-500 text-yellow-500' :
              'bg-red-500 text-red-500'
            }`} />
          <span className="text-white/80 font-medium">{connectionStatus}</span>
          {queueStatus.length > 0 && (
            <span className="text-amber-400 ml-2 font-bold animate-pulse">
              • Queue: {queueStatus.length}
            </span>
          )}
        </div>
      ) : (
        queueStatus.length > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-amber-500/30 backdrop-blur-md z-50">
            <span className="text-amber-400 font-bold text-xs uppercase tracking-wider animate-pulse">
              Queue: {queueStatus.length}
            </span>
          </div>
        )
      )}

      {/* Username Display - Modern Gaming Style */}
      {username && (
        <div className="relative z-10 transform transition-all duration-300">
          <div
            className="text-4xl md:text-6xl font-black italic text-white tracking-widest relative z-10"
            data-tiktok-username
            style={{
              fontFamily: "'Inter', sans-serif",
              textShadow: "0 4px 0 #000, 0 0 20px rgba(0,0,0,0.5)",
              WebkitTextStroke: "2px black",
              letterSpacing: "-0.02em"
            }}
          >
            {username}
          </div>
          {/* Glow effect behind text */}
          <div
            className="absolute inset-0 blur-xl opacity-50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            style={{ transform: "scale(1.2)" }}
          />
        </div>
      )}

      {/* Modern Header (Non-Overlay) */}
      {!isOverlay && (
        <div className="relative group cursor-default">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative px-7 py-2 bg-black rounded-lg leading-none flex items-center">
            <span className="text-gray-100 font-bold tracking-widest uppercase text-xl">Lucky Wheel</span>
          </div>
        </div>
      )}

      {/* Main Wheel Area */}
      <div className="relative w-full group">

        {/* Diamond Indicator - Modern & Sleek */}
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 z-30">
          <div className="relative">
            <div className="w-12 h-12 rotate-45 bg-amber-400 border-4 border-white shadow-[0_0_20px_rgba(251,191,36,0.6)] rounded-sm flex items-center justify-center">
              <div className="w-4 h-4 bg-white/50 blur-sm rounded-full" />
            </div>
            {/* Glow below indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-amber-500/30 blur-xl rounded-full -z-10" />
          </div>
        </div>

        {/* Wheel Container - Glassmorphism Card */}
        <div
          className="relative w-full rounded-[2rem] p-2 md:p-3 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(30,30,40,0.95) 0%, rgba(10,10,15,0.98) 100%)",
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)"
          }}
        >
          {/* Inner texture */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(#4f4f4f 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          />

          {/* Scrolling Tiles Container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-6 px-4 items-center relative z-10"
            style={{
              scrollBehavior: spinning ? "auto" : "smooth",
              maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)"
            }}
          >
            {[...tiles, ...tiles].map((tile, index) => (
              <WheelTile key={`${tile.id}-${index}`} text={tile.text} image={tile.image} />
            ))}
          </div>

          {/* Center Active Zone Highlight */}
          <div
            className="absolute left-1/2 top-4 bottom-4 w-[2px] -translate-x-1/2 pointer-events-none z-20"
            style={{
              background: "linear-gradient(180deg, transparent 0%, #fbbf24 20%, #fbbf24 80%, transparent 100%)",
              boxShadow: "0 0 15px #fbbf24",
              opacity: 0.6
            }}
          />
        </div>
      </div>

      {/* Result / Status Card - Floating & Modern */}
      {lastSpinData && (
        <div className="mt-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
          <div className="relative rounded-2xl overflow-hidden backdrop-blur-md bg-black/80 border border-white/10 shadow-2xl min-w-[320px]">

            {/* Header Strip */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <span className="font-bold text-white text-lg tracking-tight">{lastSpinData.user}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col items-center gap-3">
              <div className="text-center">
                <div className="text-yellow-400 font-mono text-sm tracking-wider uppercase opacity-80 mb-1">Gift Received</div>
                <div className="text-white font-bold text-xl">{lastSpinData.giftName} <span className="text-white/40 text-sm font-normal">({lastSpinData.coin} coins)</span></div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-1" />

              {displayedResults.length > 0 && (
                <div className="w-full">
                  <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest text-center mb-3">Winning Items</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {displayedResults.map((result, index) => {
                      // Logic to determine image source
                      let imageSrc = "/assets/mitos-new.png"; // Default fallback

                      if (result.image && result.image.startsWith('/uploads')) {
                        // If it's an upload from backend
                        imageSrc = `${apiBase}${result.image}`;
                      } else if (result.image && !result.image.startsWith('http')) {
                        // If it's a relative path provided by backend config
                        imageSrc = result.image;
                      } else {
                        // Legacy hardcoded logic based on label
                        const labelLower = result.label.toLowerCase();
                        if (labelLower.includes("scare")) imageSrc = "/assets/scare.png"
                        else if (labelLower.includes("gladiator")) imageSrc = "/assets/gladiator.png"
                        else if (labelLower.includes("fb")) imageSrc = "/assets/fb.png"
                        else if (labelLower.includes("mitos")) {
                          imageSrc = "/assets/mitos-new.png"
                        }
                      }

                      const rarityColor = result.label === "gladiator" ? "border-emerald-400 shadow-emerald-500/20" :
                        result.label === "mitos" ? "border-purple-500 shadow-purple-500/20" :
                          result.value > 0 ? "border-cyan-400 shadow-cyan-500/20" :
                            "border-rose-500 shadow-rose-500/20";

                      return (
                        <div key={index}
                          className={`
                                flex flex-col items-center justify-center
                                w-24 h-28 bg-gray-900/80 rounded-xl border-2 ${rarityColor}
                                shadow-lg backdrop-blur-sm p-2 gap-1
                                animate-in zoom-in spin-in-3 duration-500
                             `}
                        >
                          <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                            <img
                              src={imageSrc}
                              alt={result.label}
                              className="w-full h-full object-contain filter drop-shadow-md"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center leading-tight">
                            {result.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WheelTile({ text, image }: { text: string, image?: string }) {
  // Use state to keep image stable across re-renders
  const [imageSrc, setImageSrc] = useState("/assets/mitos-new.png")

  useEffect(() => {
    let src = image || "/assets/mitos-new.png"

    // Keep custom logic for specific hardcoded names if user wants special effects, 
    // OR just prefer the image prop if it exists.
    // The user wants "tampilkan data yang sudah ada", which implies the backend data.
    // But Mitos had that special random logic.
    // If the backend config for "mitos" has image "/assets/mitos-new.png", we might still want to randomize?
    // Let's say: if `image` is provided and NOT the default mitos one, use it. 
    // If text is "mitos" and image is default, use random?
    // checking if image is provided is better.

    if (image) {
      setImageSrc(image);
      return;
    }

    // Fallback Legacy Logic
    if (text === "mitos") {
      // FORCE SAFE IMAGE to prevent broken images
      src = "/assets/mitos-new.png"
    }
    else if (text === "scare") src = "/assets/scare.png"
    else if (text === "gladiator") src = "/assets/gladiator.png"
    else if (text === "fb") src = "/assets/fb.png"

    setImageSrc(src)
  }, [text, image])

  // Determine rarity color
  const rarityColor =
    text === "gladiator" ? "border-emerald-400 shadow-emerald-900/50" :
      text === "mitos" ? "border-purple-500 shadow-purple-900/50" :
        text === "fb" ? "border-cyan-400 shadow-cyan-900/50" :
          "border-slate-600 shadow-black/50"; // scare/zonk

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-300 transform 
      w-[100px] h-[100px] md:w-[150px] md:h-[150px] bg-gradient-to-b from-gray-800 to-gray-900 border-2 ${rarityColor} shadow-lg group-hover:brightness-110`}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

      {/* Image */}
      <img
        src={imageSrc}
        alt={text}
        className="w-full h-full object-contain p-3 relative z-10 transition-transform duration-500 hover:scale-110"
        style={{
          filter: "drop-shadow(0 0 15px rgba(0,0,0,0.5))"
        }}
      />

      {/* Label Badge */}
      <div className="absolute bottom-2 inset-x-2 bg-black/70 backdrop-blur-md rounded-lg py-1 border border-white/5">
        <div className="text-white text-[10px] text-center font-bold tracking-widest uppercase truncate px-1">
          {text}
        </div>
      </div>
    </div>
  )
}
