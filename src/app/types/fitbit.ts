export interface FitbitSleepData {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  startTime: string;
  minutesAsleep: number;
  minutesAwake: number;
  timeInBed: number;
  levels: {
    summary: {
      deep: { minutes: number };
      light: { minutes: number };
      rem: { minutes: number };
      wake: { minutes: number };
    };
  };
}

export interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}
