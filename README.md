## WebSocket Integration Documentation

### Overview
The WebSocket integration in this project allows real-time communication between the client (Phaser.js game) and the server. It ensures synchronized fish behavior, user interactions, and game state management.

### Key WebSocket Events

#### 1. Connection
- **Client Code**:
  ```javascript
  this.socket = new WebSocket('ws://localhost:8081');
  this.socket.onopen = () => {
      console.log('Connected to server');
  };
  ```
- **Server Behavior**:
  The server listens for new WebSocket connections and initializes the game state for the connected client.

#### 2. Initial Fish Sync (`initial` message)
- **Purpose**: Synchronizes the client with the current state of all fishes when the client connects.
- **Message Format**:
  ```json
  {
      "type": "initial",
      "fishes": [
          { "id": 1, "x": 100, "y": 200, "baseY": 200 },
          { "id": 2, "x": 300, "y": 400, "baseY": 400 }
      ]
  }
  ```
- **Client Behavior**: 
  The `syncFish` method updates or creates fish entities based on the received data.

#### 3. Fish Update (`update` message)
- **Purpose**: Sends updates to the client about fish positions.
- **Message Format**:
  ```json
  {
      "type": "update",
      "fishes": [
          { "id": 1, "x": 150, "y": 220, "baseY": 220 },
          { "id": 2, "x": 350, "y": 420, "baseY": 420 }
      ]
  }
- **Client Behavior**: 
  Updates fish positions and adjusts sine wave animations accordingly.

#### 4. Fish Movement (`moveFish` message)
- **Purpose**: Allows the client to notify the server about a specific fish's movement to a target position.
- **Message Format**:
  ```json
  {
      "type": "moveFish",
      "id": 1,
      "targetX": 300,
      "targetY": 350
  }
  ```
- **Server Behavior**:
  Updates the fish's `x`, `y`, and `baseY` properties and marks the state as changed for broadcast.

#### 5. Fish Destroyed (`fishDestroyed` message)
- **Purpose**: Notifies the server that a fish has been clicked and destroyed by the user.
- **Message Format**:
  ```json
  {
      "type": "fishDestroyed",
      "id": 1
  }
  ```
- **Server Behavior**: 
  The server removes the fish from the global state and notifies all clients of the update.

#### 6. Reset Fishes (`resetFish` message)
- **Purpose**: Resets all fish positions.
- **Message Format**:
  ```json
  {
      "type": "resetFish"
  }
  ```
- **Server Behavior**:
  Generates a new set of fish and sends an `initial` message to all clients.

### Fish Array Structure
Each fish in the `fishes` array on the server has the following structure:
```typescript
{
    id: number;          // Unique ID for each fish
    x: number;           // Current x position
    baseY: number;       // Base y position for sine wave calculation
    y: number;           // Current y position
    targetX: number | null; // Target x position for movement
    targetY: number | null; // Target y position for movement
    lerpStartTime: number | null; // Time when lerp starts
    lerpDuration: number; // Duration of the lerp in milliseconds
    speed: number;       // Horizontal movement speed
}
```

### WebSocket Workflow
1. **Client connects**:
   - Receives an `initial` message with the current fish state.
2. **Fish update**:
   - The server sends `update` messages to broadcast fish positions.
3. **Fish interaction**:
   - When a user clicks on a fish, a `fishDestroyed` message is sent to the server.
   - The server processes the message and notifies other clients.
4. **Fish movement**:
   - When a fish avoids an obstacle, the client sends a `moveFish` message to the server.
   - The server updates the fish's state and notifies other clients.
5. **Reset**:
   - When the reset button is clicked, a `resetFish` message is sent to the server.
   - The server generates a new state and broadcasts it to all clients.

### Error Handling
- **Invalid Messages**:
  If the server or client receives an invalid or unexpected message type, it logs the error and ignores the message.
- **Connection Issues**:
  If the connection is lost, the client attempts to reconnect automatically.

### Server-side Fish Updates
- **Position Update**:
  The server updates fish positions based on their speed and sine wave:
  ```javascript
  function updateFishPositions() {
      const time = Date.now();

      fishes = fishes.map((fish) => {
          const oldX = fish.x;

          fish.x += fish.speed * 0.016; // Move forward
          fish.y = fish.baseY + Math.sin((time + fish.x * 50) / 3000) * 10; // Update sine wave

          if (fish.x > 800) {
              fish.x = -100; // Reset position
              fish.baseY = Math.random() * 600; // Randomize baseY
          }

          if (fish.x !== oldX) stateChanged = true;

          return fish;
      });
  }
  ```

- **Generate Fish**:
  This function creates a new set of fishes:
  ```javascript
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
  ```

- **Broadcast**:
  Fish updates are broadcast every 50ms:
  ```javascript
  setInterval(() => {
      updateFishPositions();
      broadcastFishState();
  }, 50);
  ```

### Testing
To test the WebSocket integration:
1. Start the WebSocket server.
2. Launch the Phaser game.
3. Interact with fishes and observe real-time synchronization between the server and client.

### Additional Notes
- The sine wave logic is updated both on the server and client to ensure smooth animations and consistent state.
- The `stateChanged` flag optimizes broadcasts, ensuring updates are sent only when needed.

