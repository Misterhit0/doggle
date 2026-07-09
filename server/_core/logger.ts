import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");

try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.error("[Logger] Failed to initialize logs directory:", err);
}

function writeLog(filename: string, flow: string, message: string) {
  const filePath = path.join(LOGS_DIR, filename);
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${flow.toUpperCase()}] ${message}\n`;
  
  // Console log as well for standard output tailing
  console.log(`[FileLog:${filename}] ${logLine.trim()}`);
  
  try {
    fs.appendFileSync(filePath, logLine);
  } catch (error) {
    console.error(`Failed to write to log file ${filename}:`, error);
  }
}

export const logger = {
  auth: (action: string, email: string, success: boolean, details?: string) => {
    writeLog("auth.log", "auth", `User: ${email} | Action: ${action} | Success: ${success}${details ? ` | Details: ${details}` : ""}`);
  },
  swipe: (userId: number, targetUserId: number, liked: boolean, matched: boolean, details?: string) => {
    writeLog("swipe.log", "swipe", `User ${userId} swiped ${liked ? "LIKE" : "PASS"} on User ${targetUserId} | Matched: ${matched}${details ? ` | Details: ${details}` : ""}`);
  },
  match: (matchId: number | string, userId1: number, userId2: number, score: number, details?: string) => {
    writeLog("match.log", "match", `Match ${matchId} between User ${userId1} and User ${userId2} | Score: ${score}${details ? ` | Details: ${details}` : ""}`);
  },
  message: (matchId: number, senderId: number, content: string, details?: string) => {
    writeLog("message.log", "message", `Match ${matchId} | Sender ${senderId} sent: "${content.substring(0, 50)}" ${details ? ` | Details: ${details}` : ""}`);
  },
  database: (query: string, error?: string) => {
    writeLog("database.log", "database", `Query: ${query}${error ? ` | Error: ${error}` : " | Success"}`);
  }
};
