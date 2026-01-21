import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { VirtualControls } from "@/components/VirtualControls";
import { HealthBar } from "@/components/HealthBar";
import { useSubmitScore } from "@/hooks/use-scores";
import confetti from "canvas-confetti";
import assetsTaskImg from "@assets/assets_task_01k6g9pa6yenyskqf93zdgfmvm_1759336350_img_1_1768967268200.webp";

// === GAME CONSTANTS ===
// Sesuaikan untuk mobile landscape
const CANVAS_WIDTH = window.innerWidth > 800 ? 800 : window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight > 450 ? 450 : window.innerHeight;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const WALK_SPEED = 5;
const GROUND_Y = CANVAS_HEIGHT - 70;
const PLAYER_SIZE = { w: 40, h: 70 }; // Ukuran lebih kecil untuk mobile
const ATTACK_BOX = { w: 35, h: 20 };
const HIT_COOLDOWN = 30; // frames

type EntityState = "IDLE" | "WALK" | "JUMP" | "ATTACK_PUNCH" | "ATTACK_KICK" | "HIT" | "DEAD" | "WIN";

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  direction: 1 | -1; // 1 = right, -1 = left
  state: EntityState;
  frame: number;
  hitCooldown: number;
  attackFrame: number;
  isAttacking: boolean;
  score: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  owner: "PLAYER" | "CPU";
  active: boolean;
}

export default function Game() {
  const [location, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<"START" | "PLAYING" | "GAMEOVER">("START");
  const [winner, setWinner] = useState<"PLAYER" | "CPU" | null>(null);
  const [timer, setTimer] = useState(99);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  });
  
  // Mutation for score
  const submitScore = useSubmitScore();

  // Input State Refs (mutable for loop performance)
  const inputRef = useRef({
    up: false, down: false, left: false, right: false,
    punch: false, kick: false, special: false
  });

  // Game Logic Refs
  const playerRef = useRef<Entity>({
    x: 100, y: GROUND_Y, vx: 0, vy: 0, w: PLAYER_SIZE.w, h: PLAYER_SIZE.h,
    hp: 100, maxHp: 100, direction: 1, state: "IDLE", frame: 0,
    hitCooldown: 0, attackFrame: 0, isAttacking: false, score: 0
  });

  const cpuRef = useRef<Entity>({
    x: canvasDimensions.width - 100, y: GROUND_Y, vx: 0, vy: 0, w: PLAYER_SIZE.w, h: PLAYER_SIZE.h,
    hp: 100, maxHp: 100, direction: -1, state: "IDLE", frame: 0,
    hitCooldown: 0, attackFrame: 0, isAttacking: false, score: 0
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const requestRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();

  // Handle resize untuk mobile
  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth, 800);
      const height = Math.min(window.innerHeight, 450);
      
      setCanvasDimensions({
        width,
        height
      });
      
      // Reset player positions
      playerRef.current.x = 50;
      cpuRef.current.x = width - 100;
      
      // Reset ground level
      const newGroundY = height - 70;
      playerRef.current.y = newGroundY;
      cpuRef.current.y = newGroundY;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Input Handler untuk touch events
  const handleInput = (action: string | null, active: boolean) => {
    if (!action) return;
    const key = action.toLowerCase() as keyof typeof inputRef.current;
    if (key in inputRef.current) {
      inputRef.current[key] = active;
    }
  };

  // Tambahkan event listeners untuk keyboard (untuk testing di browser)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
          inputRef.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          inputRef.current.right = true;
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          inputRef.current.up = true;
          break;
        case 'j':
          inputRef.current.punch = true;
          break;
        case 'k':
          inputRef.current.kick = true;
          break;
        case 'u':
          inputRef.current.special = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
          inputRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          inputRef.current.right = false;
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          inputRef.current.up = false;
          break;
        case 'j':
          inputRef.current.punch = false;
          break;
        case 'k':
          inputRef.current.kick = false;
          break;
        case 'u':
          inputRef.current.special = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // === GAME LOOP ===
  const gameLoop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Update canvas size jika berubah
    if (canvas.width !== canvasDimensions.width || canvas.height !== canvasDimensions.height) {
      canvas.width = canvasDimensions.width;
      canvas.height = canvasDimensions.height;
    }

    // 1. UPDATE STATE
    if (gameState === "PLAYING") {
      updateEntity(playerRef.current, inputRef.current);
      updateCPU(cpuRef.current, playerRef.current);
      updateProjectiles();
      checkCollisions();
      checkWinCondition();
    }

    // 2. RENDER
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas.width, canvas.height);
    drawEntity(ctx, playerRef.current, "PLAYER", canvas.width);
    drawEntity(ctx, cpuRef.current, "CPU", canvas.width);
    drawProjectiles(ctx);
    
    // UI Overlay drawn via React, but we can do effects here
    if (gameState === "GAMEOVER") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // === PHYSICS & LOGIC ===
  function updateEntity(ent: Entity, input: typeof inputRef.current) {
    if (ent.state === "DEAD" || ent.state === "WIN") return;

    // Cooldowns
    if (ent.hitCooldown > 0) ent.hitCooldown--;

    // Movement
    if (ent.state !== "HIT" && !ent.isAttacking) {
      if (input.left) ent.vx = -WALK_SPEED;
      else if (input.right) ent.vx = WALK_SPEED;
      else ent.vx = 0;

      if (input.up && ent.y >= GROUND_Y - 1) {
        ent.vy = JUMP_FORCE;
        ent.state = "JUMP";
      }
    }

    // Attacks (only if grounded and not hit)
    if (ent.y >= GROUND_Y - 1 && ent.state !== "HIT" && !ent.isAttacking) {
      if (input.punch) {
        ent.state = "ATTACK_PUNCH";
        ent.isAttacking = true;
        ent.attackFrame = 20;
        ent.vx = 0; // Stop moving when punching
      } else if (input.kick) {
        ent.state = "ATTACK_KICK";
        ent.isAttacking = true;
        ent.attackFrame = 25;
        ent.vx = 0;
      } else if (input.special) {
        spawnProjectile(ent);
        ent.state = "ATTACK_PUNCH"; // Reuse punch animation
        ent.isAttacking = true;
        ent.attackFrame = 30;
        ent.vx = 0;
        // prevent spamming special
        input.special = false; 
      }
    }

    // Attack State Management
    if (ent.isAttacking) {
      ent.attackFrame--;
      if (ent.attackFrame <= 0) {
        ent.isAttacking = false;
        ent.state = "IDLE";
      }
    }

    // Physics Application
    ent.vy += GRAVITY;
    ent.x += ent.vx;
    ent.y += ent.vy;

    // Ground Collision
    if (ent.y > GROUND_Y) {
      ent.y = GROUND_Y;
      ent.vy = 0;
      if (!ent.isAttacking && ent.state !== "HIT") {
        ent.state = Math.abs(ent.vx) > 0 ? "WALK" : "IDLE";
      }
    }

    // Boundary Collision
    if (ent.x < 0) ent.x = 0;
    if (ent.x > canvasDimensions.width - ent.w) ent.x = canvasDimensions.width - ent.w;

    // Facing direction
    if (ent === playerRef.current) {
       ent.direction = playerRef.current.x < cpuRef.current.x ? 1 : -1;
    } else {
       ent.direction = cpuRef.current.x < playerRef.current.x ? 1 : -1;
    }
  }

  function updateCPU(cpu: Entity, target: Entity) {
    if (cpu.state === "DEAD" || cpu.state === "WIN") return;

    const dist = Math.abs(target.x - cpu.x);
    const aiInput = { up: false, down: false, left: false, right: false, punch: false, kick: false, special: false };

    // Simple AI
    if (cpu.state !== "HIT" && !cpu.isAttacking) {
      // Walk towards player
      if (dist > 50) {
        if (cpu.x < target.x) aiInput.right = true;
        else aiInput.left = true;
      } 
      // Attack if close
      else if (dist <= 50 && Math.random() < 0.05) {
        if (Math.random() > 0.5) aiInput.punch = true;
        else aiInput.kick = true;
      }
      // Jump randomly
      if (Math.random() < 0.005) aiInput.up = true;
      
      // Special attack rarely
      if (dist > 150 && Math.random() < 0.01) aiInput.special = true;
    }

    updateEntity(cpu, aiInput);
  }

  function spawnProjectile(ent: Entity) {
    projectilesRef.current.push({
      x: ent.x + (ent.direction === 1 ? ent.w : 0),
      y: ent.y + 25,
      vx: 8 * ent.direction,
      owner: ent === playerRef.current ? "PLAYER" : "CPU",
      active: true
    });
  }

  function updateProjectiles() {
    projectilesRef.current.forEach(p => {
      p.x += p.vx;
      if (p.x < 0 || p.x > canvasDimensions.width) p.active = false;
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.active);
  }

  function checkCollisions() {
    const p = playerRef.current;
    const c = cpuRef.current;

    // Helper to check overlap
    const checkHit = (attacker: Entity, victim: Entity, range: number) => {
      if (!attacker.isAttacking || victim.hitCooldown > 0) return;
      
      // Hitbox offset based on direction
      const hitX = attacker.direction === 1 ? attacker.x + attacker.w : attacker.x - range;
      
      if (
        hitX < victim.x + victim.w &&
        hitX + range > victim.x &&
        Math.abs(attacker.y - victim.y) < 50 // Vertical alignment
      ) {
        // HIT!
        victim.hp -= 5;
        victim.hitCooldown = HIT_COOLDOWN;
        victim.state = "HIT";
        victim.vx = attacker.direction * 10; // Knockback
        attacker.score += 100;
      }
    };

    // Melee Collisions
    if (p.isAttacking) checkHit(p, c, ATTACK_BOX.w);
    if (c.isAttacking) checkHit(c, p, ATTACK_BOX.w);

    // Projectile Collisions
    projectilesRef.current.forEach(proj => {
      if (!proj.active) return;
      
      const target = proj.owner === "PLAYER" ? c : p;
      if (
        proj.x > target.x && 
        proj.x < target.x + target.w &&
        proj.y > target.y &&
        proj.y < target.y + target.h
      ) {
        // Hit by projectile
        target.hp -= 10;
        target.hitCooldown = HIT_COOLDOWN;
        target.state = "HIT";
        target.vx = (proj.vx > 0 ? 1 : -1) * 5;
        proj.active = false; // Destroy projectile

        if (proj.owner === "PLAYER") p.score += 200;
      }
    });
  }

  function checkWinCondition() {
    if (playerRef.current.hp <= 0) {
      endGame("CPU");
    } else if (cpuRef.current.hp <= 0) {
      endGame("PLAYER");
    } else if (timer === 0) {
      endGame(playerRef.current.hp > cpuRef.current.hp ? "PLAYER" : "CPU");
    }
  }

  function endGame(winnerName: "PLAYER" | "CPU") {
    setGameState("GAMEOVER");
    setWinner(winnerName);
    playerRef.current.state = winnerName === "PLAYER" ? "WIN" : "DEAD";
    cpuRef.current.state = winnerName === "CPU" ? "WIN" : "DEAD";
    
    if (winnerName === "PLAYER") {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });
      submitScore.mutate({ playerName: "PLAYER 1", score: playerRef.current.score + 1000 });
    }
  }

  // === RENDERING ===
  function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#3b82f6"); // Blue sky
    grad.addColorStop(0.6, "#93c5fd");
    grad.addColorStop(0.6, "#1e3a8a"); // Water horizon
    grad.addColorStop(1, "#172554");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dock floor (Concrete)
    ctx.fillStyle = "#57534e";
    ctx.fillRect(0, GROUND_Y + PLAYER_SIZE.h, width, height - GROUND_Y - PLAYER_SIZE.h);
    
    // Decorative elements
    ctx.fillStyle = "#d1d5db"; // Bollards
    const bollardSpacing = width / 6;
    for(let i = 30; i < width; i += bollardSpacing) {
      ctx.fillRect(i, GROUND_Y + 40, 15, 20);
    }
  }

  function drawEntity(ctx: CanvasRenderingContext2D, ent: Entity, type: "PLAYER" | "CPU", canvasWidth: number) {
    ctx.save();
    
    // Hit flash effect
    if (ent.state === "HIT" && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Determine color
    const baseColor = type === "PLAYER" ? "#22c55e" : "#ef4444"; // Green vs Red
    const skinColor = "#fdba74";

    // Position setup
    ctx.translate(ent.x + ent.w/2, ent.y + ent.h);
    ctx.scale(ent.direction, 1); // Flip horizontally if facing left
    
    // === DRAW SPRITE (Procedural Pixel Art) ===
    
    // Legs - smaller for mobile
    ctx.fillStyle = "#1f2937"; // Dark pants
    if (ent.state === "JUMP") {
      ctx.fillRect(-12, -35, 8, 35); // Left leg
      ctx.fillRect(4, -25, 8, 25);   // Right leg bent
    } else if (ent.state === "WALK") {
      const walkCycle = Math.sin(Date.now() / 100) * 8;
      ctx.fillRect(-12 - walkCycle, -35, 8, 35); 
      ctx.fillRect(4 + walkCycle, -35, 8, 35);
    } else if (ent.state === "ATTACK_KICK") {
      ctx.fillRect(-12, -35, 8, 35); // Standing leg
      ctx.fillStyle = skinColor;
      ctx.fillRect(4, -50, 30, 8); // Kicking leg horizontal
    } else {
      ctx.fillRect(-12, -35, 8, 35);
      ctx.fillRect(4, -35, 8, 35);
    }

    // Torso (Gi)
    ctx.fillStyle = ent.state === "DEAD" ? "#333" : baseColor;
    if (ent.state === "DEAD") {
      ctx.fillRect(-30, -8, 60, 15); // Lying down
    } else {
      ctx.fillRect(-16, -65, 32, 35); // Body
      
      // Arms
      ctx.fillStyle = skinColor;
      if (ent.state === "ATTACK_PUNCH") {
        ctx.fillRect(8, -60, 30, 8); // Punch out
      } else {
        ctx.fillRect(0, -55, 20, 8); // Guard up
        ctx.fillRect(-16, -55, 8, 20);
      }
    }

    // Head
    if (ent.state !== "DEAD") {
      ctx.fillStyle = skinColor;
      ctx.fillRect(-10, -85, 20, 16);
      
      // Headband
      ctx.fillStyle = type === "PLAYER" ? "white" : "black";
      ctx.fillRect(-11, -87, 22, 5);
      
      // Eyes (facing direction)
      ctx.fillStyle = "black";
      ctx.fillRect(2, -80, 3, 3);
    }

    ctx.restore();
  }

  function drawProjectiles(ctx: CanvasRenderingContext2D) {
    projectilesRef.current.forEach(p => {
      ctx.fillStyle = "#3b82f6"; // Blue energy
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Trail
      ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
      ctx.fillRect(p.x - (p.vx * 2), p.y - 8, 16, 16);
    });
  }

  // === INIT & CLEANUP ===
  useEffect(() => {
    // Start loop
    requestRef.current = requestAnimationFrame(gameLoop);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timer, canvasDimensions]);

  const restartGame = () => {
    playerRef.current = { 
      ...playerRef.current, 
      hp: 100, 
      x: 50, 
      y: GROUND_Y, 
      state: "IDLE", 
      score: 0,
      direction: 1
    };
    cpuRef.current = { 
      ...cpuRef.current, 
      hp: 100, 
      x: canvasDimensions.width - 100, 
      y: GROUND_Y, 
      state: "IDLE",
      direction: -1
    };
    projectilesRef.current = [];
    inputRef.current = {
      up: false, down: false, left: false, right: false,
      punch: false, kick: false, special: false
    };
    setTimer(99);
    setGameState("PLAYING");
    setWinner(null);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-screen bg-black flex items-center justify-center overflow-hidden relative landscape-only"
    >
      {/* Force landscape mode on mobile */}
      <div className="portrait-warning absolute inset-0 bg-black z-50 flex items-center justify-center hidden portrait:block">
        <div className="text-center p-8">
          <div className="text-4xl text-yellow-400 mb-4">↻</div>
          <h2 className="text-2xl text-white mb-4">Please rotate your device</h2>
          <p className="text-gray-400">This game is best played in landscape mode</p>
        </div>
      </div>
      
      {/* HUD OVERLAY */}
      <div className="absolute top-0 inset-x-0 p-2 md:p-4 flex justify-between items-start pointer-events-none z-10">
        <HealthBar 
          hp={playerRef.current.hp} 
          maxHp={playerRef.current.maxHp} 
          name="PLAYER" 
          isPlayer={true} 
          avatarColor="from-green-400 to-green-700" 
          compact={true}
        />
        
        {/* TIMER - lebih kecil untuk mobile */}
        <div className="flex flex-col items-center">
          <div className="text-yellow-400 font-retro text-3xl md:text-4xl text-retro-shadow tracking-tighter">
            {timer}
          </div>
          <div className="text-xs text-white/50 font-retro mt-1">TIME</div>
        </div>

        <HealthBar 
          hp={cpuRef.current.hp} 
          maxHp={cpuRef.current.maxHp} 
          name="CPU" 
          isPlayer={false} 
          avatarColor="from-red-400 to-red-700" 
          compact={true}
        />
      </div>

      {/* CANVAS LAYER */}
      <canvas 
        ref={canvasRef} 
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className="w-full h-full object-contain image-pixelated bg-slate-900"
      />

      {/* SCANLINES EFFECT */}
      <div className="scanlines"></div>

      {/* START / GAME OVER SCREENS */}
      {gameState === "START" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center animate-in fade-in zoom-in duration-300 p-4">
            <h1 className="text-4xl md:text-6xl font-retro text-yellow-400 text-retro-shadow mb-6 leading-tight">
              STREET<br/><span className="text-red-500">CANVAS</span> II
            </h1>
            <p className="text-white font-terminal text-lg mb-8 animate-pulse">TAP TO START</p>
            
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button 
                onClick={restartGame}
                className="px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-retro rounded-lg shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all text-xl"
              >
                FIGHT!
              </button>
              
              {/* Control Instructions */}
              <div className="text-left text-white/70 text-sm mt-6 bg-black/30 p-4 rounded-lg">
                <p className="font-bold mb-2">CONTROLS:</p>
                <p>• Left/Right: Move</p>
                <p>• Up/Jump: Jump</p>
                <p>• Punch: Light Attack</p>
                <p>• Kick: Heavy Attack</p>
                <p>• Special: Projectile</p>
              </div>
              
              <Link href="/leaderboard" className="text-white/60 hover:text-yellow-400 font-retro text-sm mt-4">
                VIEW HIGH SCORES
              </Link>
            </div>
          </div>
        </div>
      )}

      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center p-6">
             {winner === "PLAYER" ? (
               <>
                <h2 className="text-5xl font-retro text-yellow-400 text-retro-shadow mb-4">YOU WIN!</h2>
                <p className="text-white font-terminal text-xl mb-6">SCORE: {playerRef.current.score + 1000}</p>
               </>
             ) : (
               <>
                <h2 className="text-5xl font-retro text-gray-400 text-retro-shadow mb-4">YOU LOSE</h2>
                <p className="text-white font-terminal text-xl mb-6">TRY AGAIN?</p>
               </>
             )}
             
             <div className="flex gap-3 justify-center flex-wrap">
               <button 
                 onClick={restartGame}
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-retro text-lg rounded-lg flex-1 min-w-[140px]"
               >
                 REMATCH
               </button>
               <Link href="/">
                 <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-retro text-lg rounded-lg flex-1 min-w-[140px]">
                   MAIN MENU
                 </button>
               </Link>
             </div>
          </div>
        </div>
      )}

      {/* CONTROLS (Only visible when playing) */}
      {gameState === "PLAYING" && (
        <VirtualControls 
          onInput={handleInput}
          className="mobile-controls"
        />
      )}
    </div>
  );
}
