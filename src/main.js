import { initEngine } from './engine.js';
import { initViewport } from './viewport.js';
import { initObjectEvents } from './objects.js';

// --- LẤY THAM CHIẾU DOM ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

// --- KHỞI TẠO CÁC MODULE ---
initEngine(world);
initViewport(viewport, world);
initObjectEvents(viewport, world);
