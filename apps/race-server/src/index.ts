import http from "node:http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { TYPING_RACE_ROOM_NAME } from "@yeon/race-shared";
import { TypingRaceRoom } from "./rooms/typing-race-room";

const port = Number(process.env.PORT || 2567);

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, room: TYPING_RACE_ROOM_NAME }));
    return;
  }

  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("typing-race room server");
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

// locale별 룸 풀 분리 (ko/en 매칭 섞임 방지)
gameServer.define(TYPING_RACE_ROOM_NAME, TypingRaceRoom).filterBy(["locale"]);

server.listen(port, "0.0.0.0", () => {
  console.log(`typing-race room server listening on ${port}`);
});
