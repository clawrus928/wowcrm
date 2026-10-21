export const SALES_STAGE_PROBABILITY = {
  "初步接洽": 10,
  "需求確定": 30,
  "方案／報價": 50,
  "談判／合同": 80,
  "贏單": 100,
  "輸單": 0,
};

const statusFor = (stage) => stage === "贏單" ? "已成交" : stage === "輸單" ? "已流失" : "進行中";
const terminalStageFor = (status) => status === "已成交" ? "贏單" : status === "已流失" ? "輸單" : null;

// Keep the sales funnel and deal result in sync; product progress (`stage`)
// remains independent. Explicit probability can override the stage default.
export function normalizeDealWrite(data, existing = null) {
  const patch = { ...data };
  if (Object.hasOwn(patch, "salesStage") && patch.salesStage) {
    if (Object.hasOwn(SALES_STAGE_PROBABILITY, patch.salesStage)) {
      patch.status = statusFor(patch.salesStage);
      if (!Object.hasOwn(patch, "winProbability")) {
        patch.winProbability = SALES_STAGE_PROBABILITY[patch.salesStage];
      }
    }
  } else if (Object.hasOwn(patch, "status") || !existing) {
    const status = patch.status || existing?.status || "進行中";
    const stage = terminalStageFor(status) ||
      (existing?.salesStage && !terminalStageFor(existing.status) ? existing.salesStage : "初步接洽");
    patch.salesStage = stage;
    if (!Object.hasOwn(patch, "winProbability")) {
      patch.winProbability = SALES_STAGE_PROBABILITY[stage];
    }
  }
  return patch;
}
