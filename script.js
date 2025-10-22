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

let items = [];
let sortedItems = [];
let currentIndex = 0;
let currentItem = '';
let low = 0;
let high = 0;
let mid = 0;

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
  high = mid;
  nextStep();
});

optionBButton.addEventListener('click', () => {
  // The existing ranked item stays ahead.
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

  if (items.length === 1) {
    sortedItems = [...items];
    showResults();
    return;
  }

  sortedItems = [items[0]];
  currentIndex = 1;
  prepareInsertion();
}

function prepareInsertion() {
  if (currentIndex >= items.length) {
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
  const humanIndex = Math.min(currentIndex + 1, items.length);
  progressText.textContent = `Ranking item ${humanIndex} of ${items.length}. ${sortedItems.length} item(s) ranked so far.`;
}

function showResults() {
  comparisonSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

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
  itemsInput.value = '';
  resultsList.innerHTML = '';
  hideError();

  resultsSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  inputSection.classList.remove('hidden');
  itemsInput.focus();
}

// Autofocus the textarea for quick input.
itemsInput.focus();
