export class LogService {
  public addLog(category: string, message: string) {
    console.log(`[${category}] ${message}`);
  }
}

export const logService = new LogService();
