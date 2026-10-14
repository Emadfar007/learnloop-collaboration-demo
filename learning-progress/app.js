import { calculateCourseProgress } from '../src/progress.js';

const COURSE_ID = 'git-collaboration-v1';
const STORAGE_KEY = 'learnloop:course-progress:v1';
const LESSONS = [
  { id: 'fork', title: 'Fork & clone your starting point', detail: 'Make the project yours, locally and on GitHub', durationMinutes: 12 },
  { id: 'branch', title: 'Create a focused feature branch', detail: 'Keep one contribution clear and easy to review', durationMinutes: 18 },
  { id: 'build', title: 'Build, test & commit your change', detail: 'Turn your idea into a tested contribution', durationMinutes: 15 },
  { id: 'request', title: 'Push & open your pull request', detail: 'Explain the change and show your evidence', durationMinutes: 20 },
  { id: 'review', title: 'Review feedback & improve', detail: 'Respond with a follow-up commit', durationMinutes: 10 },
  { id: 'merge', title: 'Merge & reflect on the workflow', detail: 'Finish the contribution and sync your branch', durationMinutes: 15 },
];
const validIds = new Set(LESSONS.map((lesson) => lesson.id));
let completedIds = new Set();

const lessonList = document.querySelector('#lesson-list');
const percentComplete = document.querySelector('#percent-complete');
const completedCount = document.querySelector('#completed-count');
const totalCount = document.querySelector('#total-count');
const remainingMinutes = document.querySelector('#remaining-minutes');
const progressBar = document.querySelector('#course-progress');
const statusPill = document.querySelector('#course-status');
const progressCaption = document.querySelector('#progress-caption');
const saveStatus = document.querySelector('#save-status');
const lessonControls = new Map();

function setSaveStatus(message, warning = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle('is-warning', warning);
}

function loadProgress() {
  let stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    setSaveStatus('Progress works for this visit. Your browser blocked access to saved progress.', true);
    return;
  }
  if (stored === null) {
    setSaveStatus('Your progress can be saved in this browser as you learn.');
    return;
  }
  try {
    const record = JSON.parse(stored);
    const ids = record?.completedLessonIds;
    if (
      record === null || typeof record !== 'object' || Array.isArray(record) ||
      record.version !== 1 || record.courseId !== COURSE_ID ||
      !Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && validIds.has(id)) ||
      new Set(ids).size !== ids.length
    ) {
      throw new TypeError('Unrecognized saved progress');
    }
    completedIds = new Set(ids);
    setSaveStatus('Restored your saved lesson progress from this browser.');
  } catch {
    completedIds = new Set();
    setSaveStatus('Saved progress could not be read. Your next change will save a fresh checklist.', true);
  }
}

function saveProgress(actionMessage) {
  const record = {
    version: 1,
    courseId: COURSE_ID,
    completedLessonIds: LESSONS.filter((lesson) => completedIds.has(lesson.id)).map((lesson) => lesson.id),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setSaveStatus(`${actionMessage} Saved in this browser.`);
  } catch {
    setSaveStatus(`${actionMessage} Progress is kept for this visit; your browser could not save it.`, true);
  }
}

function updateProgress() {
  const result = calculateCourseProgress(LESSONS.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    durationMinutes: lesson.durationMinutes,
    completed: completedIds.has(lesson.id),
  })));
  percentComplete.textContent = String(result.percentComplete);
  completedCount.textContent = String(result.completedLessons);
  totalCount.textContent = String(result.totalLessons);
  remainingMinutes.textContent = String(result.remainingMinutes);
  progressBar.value = result.percentComplete;
  progressBar.textContent = `${result.percentComplete}%`;
  const statuses = {
    'not-started': { label: 'Not started', caption: 'A fresh start. Your first step is ready.', className: '' },
    'in-progress': { label: 'In progress', caption: 'You’re building momentum. Keep going.', className: 'is-progress' },
    complete: { label: 'Complete', caption: 'Every lesson complete. Ready for your next contribution.', className: 'is-complete' },
  };
  const state = statuses[result.status];
  statusPill.textContent = state.label;
  statusPill.classList.remove('is-progress', 'is-complete');
  if (state.className) statusPill.classList.add(state.className);
  progressCaption.textContent = state.caption;
  for (const lesson of LESSONS) {
    const control = lessonControls.get(lesson.id);
    const completed = completedIds.has(lesson.id);
    control.input.checked = completed;
    control.row.classList.toggle('is-complete', completed);
    control.subtitle.textContent = completed ? 'Completed · nice work!' : lesson.detail;
  }
}

function createLessonControls() {
  for (const [index, lesson] of LESSONS.entries()) {
    const row = document.createElement('label');
    row.className = 'lesson-row';
    row.htmlFor = `lesson-${lesson.id}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `lesson-${lesson.id}`;
    const number = document.createElement('span');
    number.className = 'lesson-number';
    number.textContent = String(index + 1).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'lesson-copy';
    const title = document.createElement('span');
    title.className = 'lesson-title';
    title.id = `lesson-title-${lesson.id}`;
    title.textContent = lesson.title;
    input.setAttribute('aria-labelledby', title.id);
    const subtitle = document.createElement('span');
    subtitle.className = 'lesson-subtitle';
    subtitle.textContent = lesson.detail;
    const duration = document.createElement('span');
    duration.className = 'lesson-duration';
    duration.textContent = `${lesson.durationMinutes} min`;
    copy.append(title, subtitle);
    row.append(input, number, copy, duration);
    lessonList.append(row);
    lessonControls.set(lesson.id, { row, input, subtitle });
    input.addEventListener('change', () => {
      if (input.checked) completedIds.add(lesson.id);
      else completedIds.delete(lesson.id);
      updateProgress();
      saveProgress(`${lesson.title}: ${input.checked ? 'complete' : 'not complete'}.`);
    });
  }
}

document.querySelector('#complete-all').addEventListener('click', () => {
  completedIds = new Set(validIds);
  updateProgress();
  saveProgress('All six lessons complete.');
});

document.querySelector('#reset-progress').addEventListener('click', () => {
  completedIds = new Set();
  updateProgress();
  saveProgress('Progress reset.');
});

loadProgress();
createLessonControls();
updateProgress();
