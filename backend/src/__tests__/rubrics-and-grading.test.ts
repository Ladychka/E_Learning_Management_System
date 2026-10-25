import { describe, it, expect } from "vitest";

describe("US-054 Rubrics & US-058 Pass/Fail Logic", () => {
  it("sums criterion max points to calculate totalMaxPoints", () => {
    const criteria = [
      { title: "Code Quality", maxPoints: 25 },
      { title: "Architecture & Design", maxPoints: 25 },
      { title: "Financial Literacy Accuracy", maxPoints: 30 },
      { title: "Documentation", maxPoints: 20 },
    ];

    const totalMax = criteria.reduce((sum, c) => sum + c.maxPoints, 0);
    expect(totalMax).toBe(100);
  });

  it("calculates total rubric earned points and percentage", () => {
    const grades = [
      { criterion: "Code Quality", pointsEarned: 22, maxPoints: 25 },
      { criterion: "Architecture & Design", pointsEarned: 20, maxPoints: 25 },
      { criterion: "Financial Literacy Accuracy", pointsEarned: 28, maxPoints: 30 },
      { criterion: "Documentation", pointsEarned: 18, maxPoints: 20 },
    ];

    const earned = grades.reduce((sum, g) => sum + g.pointsEarned, 0);
    const max = grades.reduce((sum, g) => sum + g.maxPoints, 0);
    const percentage = Math.round((earned / max) * 100);

    expect(earned).toBe(88);
    expect(max).toBe(100);
    expect(percentage).toBe(88);
    expect(percentage >= 60 ? "PASS" : "FAIL").toBe("PASS");
  });

  it("maps percentages to letter grades according to ELMS standard", () => {
    function getLetterGrade(pct: number): string {
      if (pct >= 97) return "A+";
      if (pct >= 93) return "A";
      if (pct >= 90) return "A-";
      if (pct >= 87) return "B+";
      if (pct >= 83) return "B";
      if (pct >= 80) return "B-";
      if (pct >= 77) return "C+";
      if (pct >= 73) return "C";
      if (pct >= 70) return "C-";
      if (pct >= 60) return "D";
      return "F";
    }

    expect(getLetterGrade(98)).toBe("A+");
    expect(getLetterGrade(85)).toBe("B");
    expect(getLetterGrade(74)).toBe("C");
    expect(getLetterGrade(58)).toBe("F");
  });
});
