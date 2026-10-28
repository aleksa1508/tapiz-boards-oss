import type { BoardRepo } from "@/application/ports";
import {
  getColumns,
  getColumnById,
  createColumn,
  renameColumn,
  setColumnWipLimit,
  setColumnDone,
  removeColumn,
} from "./board/column.queries";
import {
  getBacklogStories,
  getBoardWithStories,
  getStoryById,
  getStoriesAssignedToUser,
  getStoriesBySprints,
  getStoriesForExport,
  getTasksForStories,
  getCommentsForStoriesExport,
  createStory,
  updateStory,
  removeStory,
} from "./board/story.queries";
import {
  nextStoryPosition,
  moveStory,
} from "./board/move.queries";
import {
  getTasks,
  getTaskById,
  addTask,
  setTaskDone,
  removeTask,
} from "./board/task.queries";
import {
  getComments,
  getCommentById,
  addComment,
  removeComment,
} from "./board/comment.queries";

export const boardRepo: BoardRepo = {
  columns: getColumns,
  columnById: getColumnById,
  createColumn,
  renameColumn,
  setColumnWipLimit,
  setColumnDone,
  removeColumn,
  boardWithStories: getBoardWithStories,
  backlog: getBacklogStories,
  assignedToUser: getStoriesAssignedToUser,
  storyById: getStoryById,
  storiesBySprints: getStoriesBySprints,
  storiesForExport: getStoriesForExport,
  tasksForStories: getTasksForStories,
  commentsForStoriesExport: getCommentsForStoriesExport,
  createStory,
  updateStory,
  removeStory,
  nextStoryPosition,
  moveStory,
  tasks: getTasks,
  taskById: getTaskById,
  addTask,
  setTaskDone,
  removeTask,
  comments: getComments,
  commentById: getCommentById,
  addComment,
  removeComment,
};
