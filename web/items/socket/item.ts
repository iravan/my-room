import { defineItem } from "../types";

export const socketDesk = defineItem({ id: "socket-desk", name: "Socket (desk)", category: "fixture", home: { position: [-2, 0.3, 1.2] }, walls: { x: -1, z: 1 }, onWall: "x", variants: ["plate"] });
export const socketWindow = defineItem({ id: "socket-window", name: "Socket (window)", category: "fixture", home: { position: [0.25, 0.3, -2] }, walls: { z: -1 }, onWall: "z", variants: ["plate"] });
export const socketRight = defineItem({ id: "socket-right", name: "Socket (right wall)", category: "fixture", home: { position: [2, 0.3, 1.4] }, walls: { x: 1, z: 1 }, onWall: "x", variants: ["plate"] });

const sockets = [socketDesk, socketWindow, socketRight];

export default sockets;
