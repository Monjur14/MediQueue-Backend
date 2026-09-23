export const DEFAULT_CONSULTATION_MINUTES = 10;

export interface WaitingToken {
  token_number: number;
  patient_id:   string;
}

export interface ETAResult {
  patient_id:   string;
  token_number: number;
  eta_minutes:  number;
}

export const calculateETAs = (
  waitingTokens:        WaitingToken[],
  avgConsultationTime:  number | null,
  breakTimeRemaining:   number = 0,
  currentTokenPosition: number = 0,
): ETAResult[] => {

  const avg = avgConsultationTime ?? DEFAULT_CONSULTATION_MINUTES;

  return waitingTokens.map((token, index) => {
    const position     = index + 1;
    const baseETA      = position * avg;
    const etaWithBreak = baseETA + breakTimeRemaining;
    const finalETA     = Math.max(0, etaWithBreak - currentTokenPosition);

    return {
      patient_id:   token.patient_id,
      token_number: token.token_number,
      eta_minutes:  Math.round(finalETA),
    };
  });
};