const itemsInput = document.getElementById('items-input');
const startButton = document.getElementById('start-button');
const optionAButton = document.getElementById('option-a');
const optionBButton = document.getElementById('option-b');
const restartButton = document.getElementById('restart-button');
const inputSection = document.getElementById('input-section');
const comparisonSection = document.getElementById('comparison-section');
const resultsSection = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const errorMessage = document.getElementById('error-message');
const progressText = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');

let items = [];
let sortedItems = [];
let currentIndex = 0;
let currentItem = '';
let low = 0;
let high = 0;
let mid = 0;
let totalSteps = 0;
let completedSteps = 0;

startButton.addEventListener('click', () => {
  const parsed = parseItems(itemsInput.value);

  if (parsed.length === 0) {
    showError('Please provide at least one item to rank.');
    return;
  }

  hideError();
  items = parsed;
  beginRanking();
});

optionAButton.addEventListener('click', () => {
  // The current item wins the comparison.
  markComparisonComplete();
  high = mid;
  nextStep();
});

optionBButton.addEventListener('click', () => {
  // The existing ranked item stays ahead.
  markComparisonComplete();
  low = mid + 1;
  nextStep();
});

restartButton.addEventListener('click', resetApp);

function parseItems(raw) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

function beginRanking() {
  inputSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  resultsSection.classList.add('hidden');

  sortedItems = [];
  currentIndex = 0;

  initializeProgressTracking();

  if (items.length === 1) {
    sortedItems = [...items];
    currentIndex = items.length;
    showResults();
    return;
  }

  sortedItems = [items[0]];
  currentIndex = 1;
  prepareInsertion();
}

function prepareInsertion() {
  if (currentIndex >= items.length) {
    updateProgress();
    showResults();
    return;
  }

  currentItem = items[currentIndex];
  low = 0;
  high = sortedItems.length;
  comparisonSection.classList.remove('hidden');
  updateProgress();
  compareNext();
}

function nextStep() {
  if (low >= high) {
    sortedItems.splice(low, 0, currentItem);
    currentIndex += 1;
    prepareInsertion();
  } else {
    compareNext();
  }
}

function compareNext() {
  if (low >= high) {
    nextStep();
    return;
  }

  mid = Math.floor((low + high) / 2);
  optionAButton.textContent = currentItem;
  optionBButton.textContent = sortedItems[mid];
  updateProgress();
}

function updateProgress() {
  if (!items.length) {
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  const total = items.length;
  const rankedCount = sortedItems.length;
  const completion = totalSteps
    ? Math.min(completedSteps / totalSteps, 1)
    : Math.min(rankedCount / total, 1);

  updateProgressVisual(completion);

  if (currentIndex >= total) {
    const noun = total === 1 ? 'item' : 'items';
    progressText.textContent = `All ${total} ${noun} ranked.`;
    return;
  }

  const humanIndex = Math.min(currentIndex + 1, total);
  const noun = rankedCount === 1 ? 'item' : 'items';
  progressText.textContent = `Ranking item ${humanIndex} of ${total}. ${rankedCount} ${noun} ranked so far.`;
}

function updateProgressVisual(ratio) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const percentage = Math.round(clamped * 100);

  if (progressFill) {
    progressFill.style.width = `${clamped * 100}%`;
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(percentage));
    progressBar.setAttribute('aria-valuetext', `${percentage}% complete`);
  }
}

function resetProgressVisual() {
  if (progressFill) {
    progressFill.style.width = '0%';
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuetext', '0% complete');
  }
}

function showResults() {
  comparisonSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  if (totalSteps > 0) {
    completedSteps = totalSteps;
    updateProgress();
  }

  sortedItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    resultsList.appendChild(li);
  });
}

function resetApp() {
  items = [];
  sortedItems = [];
  currentIndex = 0;
  currentItem = '';
  low = 0;
  high = 0;
  mid = 0;
  totalSteps = 0;
  completedSteps = 0;
  itemsInput.value = '';
  resultsList.innerHTML = '';
  hideError();
  resetProgressVisual();
  progressText.textContent = '';

  resultsSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  inputSection.classList.remove('hidden');
  itemsInput.focus();
}

// Autofocus the textarea for quick input.
itemsInput.focus();

function initializeProgressTracking() {
  completedSteps = 0;

  if (!items.length) {
    totalSteps = 0;
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  totalSteps = estimateTotalSteps(items.length);
  updateProgress();
}

function estimateTotalSteps(count) {
  if (count <= 1) {
    return 1;
  }

  let estimate = 0;

  for (let i = 1; i < count; i += 1) {
    estimate += Math.ceil(Math.log2(i + 1));
  }

  // Add an extra step for revealing the final results so we can always
  // smoothly reach 100%.
  return estimate + 1;
}

function markComparisonComplete() {
  if (!totalSteps) {
    return;
  }

  completedSteps = Math.min(completedSteps + 1, totalSteps);
  updateProgress();
}
