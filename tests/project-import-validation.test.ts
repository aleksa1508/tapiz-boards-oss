import assert from "node:assert/strict";
import test from "node:test";
import {
  projectImportValidationMessage,
  type ProjectImportData,
} from "../src/domain/validation/project-import.schema";

const projectId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000002";

function validExport(): ProjectImportData {
  return {
    formatVersion: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    project: {
      id: projectId,
      name: "Import test",
      ownerId,
      ownerName: "Test Owner",
      ownerEmail: "owner@example.com",
      githubRepo: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    members: [{
      userId: ownerId,
      firstName: "Test",
      lastName: "Owner",
      email: "owner@example.com",
      joinedAt: "2026-01-01T00:00:00.000Z",
      isOwner: true,
    }],
    columns: [{
      id: "00000000-0000-4000-8000-000000000003",
      projectId,
      name: "To do",
      position: 0,
      wipLimit: null,
      isDone: false,
    }],
    sprints: [],
    stories: [],
    tasks: [],
    comments: [],
    retrospectives: [],
    activities: [],
  };
}

test("import accepts projects with zero or one Done column", () => {
  const withoutDone = validExport();
  assert.equal(projectImportValidationMessage(withoutDone), null);

  const withOneDone = validExport();
  withOneDone.columns[0].isDone = true;
  assert.equal(projectImportValidationMessage(withOneDone), null);
});

test("import rejects projects with multiple Done columns", () => {
  const data = validExport();
  data.columns[0].isDone = true;
  data.columns.push({
    id: "00000000-0000-4000-8000-000000000004",
    projectId,
    name: "Also done",
    position: 1,
    wipLimit: null,
    isDone: true,
  });

  assert.match(
    projectImportValidationMessage(data) ?? "",
    /najviše jednu završnu \(Done\) kolonu/,
  );
});

test("import rejects sprint goals that exceed the MySQL TEXT byte limit", () => {
  const data = validExport();
  data.sprints.push({
    id: "00000000-0000-4000-8000-000000000005",
    projectId,
    name: "Sprint",
    goal: "é".repeat(32_768),
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    status: "planned",
    createdAt: "2026-01-01T00:00:00.000Z",
    storyCount: 0,
    totalPoints: 0,
  });

  assert.match(
    projectImportValidationMessage(data) ?? "",
    /sprints\.0\.goal: Tekst prelazi maksimalnu veličinu za bazu podataka/,
  );
});
