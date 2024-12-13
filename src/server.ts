import { WebSocketServer, WebSocket, RawData } from 'ws';

const wss = new WebSocketServer({ port: 8081 });

let fishes = Array.from({ length: 10 }, (_, id) => ({
    id,
    x: Math.random() * -200, // Start off-screen
    y: Math.random() * 600,
    speed: Math.random() * 50 + 50, // Random speed
}));

let stateChanged = false; // Track whether the state has changed

// Function to generate new fish data
function generateFish() {
    fishes = Array.from({ length: 10 }, (_, id) => ({
        id,
        x: Math.random() * -200, // Start off-screen
        y: Math.random() * 600,
        speed: Math.random() * 50 + 50, // Random speed
    }));
    stateChanged = true;
}

// Function to update fish positions
function updateFishPositions() {
    fishes = fishes.map((fish) => {
        const oldX = fish.x;
        fish.x += fish.speed * 0.016; // Assuming 60 FPS (16ms per frame)
        if (fish.x > 800) {
            fish.x = -100; // Reset position
            fish.y = Math.random() * 600; // Randomize vertical position
        }
        if (fish.x !== oldX) stateChanged = true; // Mark state as changed
        return fish;
    });
}

// Function to broadcast the current state of all fishes
function broadcastFishState() {
    if (!stateChanged) return; // Skip broadcasting if nothing changed
    stateChanged = false;

    const data = JSON.stringify({
        type: 'update',
        fishes: fishes.map((fish) => ({
            id: fish.id,
            x: fish.x,
            y: fish.y,
        })),
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send initial fish data to the new client
    ws.send(JSON.stringify({ type: 'initial', fishes }));

    ws.on('message', (data) => {
        const message = JSON.parse((data as RawData).toString());

        if (message.type === 'fishDestroyed') {
            // Remove the fish from the list
            fishes = fishes.filter((fish) => fish.id !== message.id);

            // Broadcast the updated fish state
            stateChanged = true; // Mark state as changed for the next broadcast
            broadcastFishState();
        }else if(message.type === 'resetFish'){
            // Reset fish and Broadcast the new state
            console.log('Received resetFish message. Regenerating fish...');
            generateFish();
            broadcastFishState();
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Update fish positions and broadcast every 200ms
setInterval(() => {
    updateFishPositions();
    broadcastFishState();
}, 200);

console.log('WebSocket server is running on ws://localhost:8081');