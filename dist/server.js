"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8081;
const wss = new ws_1.WebSocketServer({ port });
const startTime = Date.now();
let stateChanged = false; // Track if any state has changed
let fishes = Array.from({ length: 10 }, (_, id) => ({
    id,
    x: Math.random() * -200, // Start off-screen
    baseY: Math.random() * 600, // Initialize base Y
    y: 0, // Will be calculated dynamically
    targetX: null,
    targetY: null,
    lerpStartTime: null,
    lerpDuration: 2000, // Default lerp duration in ms
    speed: Math.random() * 50 + 50, // Random speed
}));
// Function to generate new fish data
function generateFish() {
    fishes = Array.from({ length: 10 }, (_, id) => ({
        id,
        x: Math.random() * -200, // Start off-screen
        baseY: Math.random() * 600, // Initialize base Y
        y: 0, // Will be calculated dynamically
        speed: Math.random() * 50 + 50, // Random speed
        targetX: null, // Initially no target
        targetY: null, // Initially no target
        lerpStartTime: null, // No lerp started yet
        lerpDuration: 1000, // Default lerp duration
    }));
    stateChanged = true;
}
// Linear interpolation function
function linearInterpolation(start, end, t) {
    return start + t * (end - start);
}
// Function to update fish positions
function updateFishPositions() {
    const time = Date.now();
    fishes = fishes.map((fish) => {
        const oldX = fish.x;
        fish.x += fish.speed * 0.016; // Move forward
        fish.y = fish.baseY + Math.sin((time + fish.x * 50) / 3000) * 10; // Update sinewave
        if (fish.x > 800) {
            fish.x = -100; // Reset position
            fish.baseY = Math.random() * 600; // Randomize baseY
        }
        if (fish.x !== oldX)
            stateChanged = true;
        return fish;
    });
}
// if (!stateChanged) return; // Skip broadcasting if nothing changed
// stateChanged = false; // Reset stateChanged for the next cycle
function broadcastFishState() {
    const data = JSON.stringify({
        type: 'update',
        timestamp: Date.now(), // Add a timestamp
        fishes: fishes.map((fish) => ({
            id: fish.id,
            x: Math.round(fish.x * 100) / 100,
            y: Math.round(fish.y * 100) / 100,
        })),
    });
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(data);
        }
    });
}
wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.send(JSON.stringify({
        type: "initial",
        fishes,
        startTime,
        serverTimestamp: Date.now(),
    }));
    ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'fishDestroyed') {
            // Remove the fish from the list
            fishes = fishes.filter((fish) => fish.id !== message.id);
            // Broadcast the updated fish state
            stateChanged = true; // Mark state as changed for the next broadcast
            broadcastFishState();
        }
        else if (message.type === 'resetFish') {
            // Reset fish and Broadcast the new state
            console.log('Received resetFish message. Regenerating fish...');
            generateFish();
            broadcastFishState();
        }
        else if (message.type === "moveFish") {
            const fishIndex = fishes.findIndex((f) => f.id === message.id);
            if (fishIndex !== -1) {
                // Update the fish's position and sinewave baseY
                fishes[fishIndex].x = message.targetX;
                fishes[fishIndex].y = message.targetY;
                fishes[fishIndex].baseY = message.targetY; // Update baseY to the new Y position
                stateChanged = true;
            }
            else {
                console.error(`Fish ID ${message.id} not found`);
            }
        }
    });
    ws.on("close", () => {
        console.log("Client disconnected");
    });
});
// Update fish positions and broadcast every 50ms
// Server-side setInterval for position updates
setInterval(() => {
    updateFishPositions();
    broadcastFishState();
}, 50);
console.log(`WebSocket server is running on ws://localhost:${port}`);
