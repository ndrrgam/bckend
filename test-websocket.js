// Simple WebSocket client untuk test koneksi
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3002');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
});

ws.on('message', function message(data) {
  console.log('📡 Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 Disconnected from WebSocket server');
});

console.log('🔄 Connecting to WebSocket server...');