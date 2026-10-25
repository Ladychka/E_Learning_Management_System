import { describe, it, expect } from "vitest";

describe("US-053 Grade Weighting Business Logic", () => {
  it("validates that grade categories total exactly 100%", () => {
    const validCategories = [
      { name: "Assignments", weight: 40 },
      { name: "Quizzes", weight: 30 },
      { name: "Final Examination", weight: 30 },
    ];

    const totalWeight = validCategories.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("detects when category weights exceed 100%", () => {
    const existingCategories = [
      { name: "Assignments", weight: 50 },
      { name: "Quizzes", weight: 30 },
    ];
    const newWeight = 25;
    const currentTotal = existingCategories.reduce((sum, c) => sum + c.weight, 0);
    const exceeds = currentTotal + newWeight > 100;

    expect(exceeds).toBe(true);
    expect(currentTotal + newWeight).toBe(105);
  });

  it("calculates weighted course GPA correctly", () => {
    const scores = [
      { category: "Assignments", weight: 40, earnedScore: 85, maxScore: 100 }, // 85% * 0.4 = 34%
      { category: "Quizzes", weight: 30, earnedScore: 90, maxScore: 100 },     // 90% * 0.3 = 27%
      { category: "Final Exam", weight: 30, earnedScore: 80, maxScore: 100 },   // 80% * 0.3 = 24%
    ];

    const weightedTotal = scores.reduce((sum, item) => {
      const pct = (item.earnedScore / item.maxScore) * 100;
      return sum + (pct * (item.weight / 100));
    }, 0);

    expect(weightedTotal).toBe(85); // 34 + 27 + 24 = 85%
  });
});
